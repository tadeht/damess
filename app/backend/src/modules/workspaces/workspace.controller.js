import crypto from "crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { created, ok } from "../../utils/api-response.js";
import { AppError } from "../../utils/errors.js";
import { createUserNotification } from "../notifications/notification.service.js";

const WORKSPACE_ADMIN = "ADMIN";
const WORKSPACE_MEMBER = "MEMBER";
const MAX_LOGO_DATA_LENGTH = 2_800_000;

const includeWorkspace = {
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  members: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  },
};

function sanitizeWorkspace(workspace, currentUserId) {
  const currentMember = workspace.members?.find((member) => member.userId === currentUserId);
  const inviteLink = `${env.frontendUrl}/workspaces?invite=${workspace.inviteCode}`;
  const activeMembers = workspace.members?.filter((member) => member.status === "ACTIVE") || [];

  return {
    ...workspace,
    inviteLink,
    currentMemberRole: currentMember?.role || null,
    memberCount: activeMembers.length,
  };
}

function findActiveMembership(workspace, userId) {
  return workspace.members.find((member) => member.userId === userId && member.status === "ACTIVE");
}

function assertWorkspaceAdmin(workspace, userId) {
  const currentMember = findActiveMembership(workspace, userId);

  if (workspace.createdById !== userId && currentMember?.role !== WORKSPACE_ADMIN) {
    throw new AppError("Chỉ admin workspace mới có quyền quản lý thành viên", 403);
  }

  return currentMember;
}

function normalizeWorkspaceSettings(body) {
  const defaultSlaHours = body.defaultSlaHours === null || body.defaultSlaHours === "" || body.defaultSlaHours === undefined
    ? null
    : Number(body.defaultSlaHours);
  const logo = body.logo && typeof body.logo === "object" ? body.logo : null;

  if (defaultSlaHours !== null && (!Number.isInteger(defaultSlaHours) || defaultSlaHours < 1 || defaultSlaHours > 8760)) {
    throw new AppError("SLA mặc định phải nằm trong khoảng 1 đến 8760 giờ", 422);
  }

  if (logo?.data && String(logo.data).length > MAX_LOGO_DATA_LENGTH) {
    throw new AppError("Logo workspace tối đa 2MB", 422);
  }

  return {
    logoName: logo?.data ? String(logo.name || "workspace-logo").slice(0, 160) : null,
    logoMime: logo?.data ? String(logo.mime || "image/png").slice(0, 120) : null,
    logoData: logo?.data ? String(logo.data) : null,
    defaultSlaHours,
    allowRequesterDueDateOverride: body.allowRequesterDueDateOverride !== false,
  };
}

async function createWorkspaceActivity({ workspaceId, actorId = null, targetUserId = null, action, title, description = null, metadata = undefined }) {
  return prisma.workspaceActivity.create({
    data: {
      workspaceId,
      actorId,
      targetUserId,
      action,
      title,
      description,
      metadata,
    },
  });
}

function getActiveWorkspaceAdmins(workspace) {
  return (workspace.members || []).filter((member) => member.status === "ACTIVE" && (member.role === WORKSPACE_ADMIN || workspace.createdById === member.userId));
}

async function notifyWorkspaceAdmins(workspace, { title, content, actorId = null }) {
  const admins = getActiveWorkspaceAdmins(workspace).filter((member) => member.userId !== actorId);

  await Promise.all(admins.map((member) => createUserNotification({
    userId: member.userId,
    title,
    content,
    type: "WORKSPACE",
    link: `${env.frontendUrl}/workspaces`,
  })));
}

function sanitizeInvitePreview(workspace, currentUserId) {
  const currentMember = workspace.members?.find((member) => member.userId === currentUserId);

  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    inviteCode: workspace.inviteCode,
    createdBy: workspace.createdBy,
    memberCount: workspace.members?.filter((member) => member.status === "ACTIVE").length || 0,
    alreadyMember: currentMember?.status === "ACTIVE",
    currentMemberRole: currentMember?.status === "ACTIVE" ? currentMember.role : null,
  };
}

function normalizeInviteCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function extractInviteCode({ code, inviteLink }) {
  const directCode = normalizeInviteCode(code);

  if (directCode) {
    return directCode;
  }

  const rawLink = String(inviteLink || "").trim();

  if (!rawLink) {
    return "";
  }

  try {
    const url = new URL(rawLink);
    const inviteParam = url.searchParams.get("invite") || url.searchParams.get("code");
    return normalizeInviteCode(inviteParam || url.pathname.split("/").filter(Boolean).pop());
  } catch {
    return normalizeInviteCode(rawLink);
  }
}

async function createUniqueInviteCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const existed = await prisma.workspace.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });

    if (!existed) {
      return code;
    }
  }

  throw new AppError("Không thể tạo mã mời workspace, vui lòng thử lại", 500);
}

export async function listWorkspaces(req, res, next) {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId: req.user.id,
        status: "ACTIVE",
        workspace: {
          isActive: true,
        },
      },
      include: {
        workspace: {
          include: includeWorkspace,
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    return ok(res, memberships.map((membership) => sanitizeWorkspace(membership.workspace, req.user.id)));
  } catch (error) {
    next(error);
  }
}

export async function createWorkspace(req, res, next) {
  try {
    const { name, description } = req.body;
    const trimmedName = String(name || "").trim();

    if (!trimmedName) {
      throw new AppError("Tên workspace là bắt buộc", 422);
    }

    const inviteCode = await createUniqueInviteCode();
    const workspace = await prisma.workspace.create({
      data: {
        name: trimmedName,
        description: description ? String(description).trim() : null,
        inviteCode,
        createdById: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: WORKSPACE_ADMIN,
          },
        },
        // Tự tạo channel #general mặc định cho workspace mới.
        channels: {
          create: {
            name: "general",
            topic: "Kênh chung của workspace",
            type: "TEXT",
            sortOrder: 0,
            createdById: req.user.id,
          },
        },
      },
      include: includeWorkspace,
    });

    await createUserNotification({
      userId: req.user.id,
      title: "Đã tạo workspace mới",
      content: `Bạn đã tạo workspace "${workspace.name}" và là admin đầu tiên của workspace này.`,
      type: "WORKSPACE",
      link: `${env.frontendUrl}/workspaces`,
    });

    return created(res, sanitizeWorkspace(workspace, req.user.id), "Tạo workspace thành công. Bạn là admin của workspace này.");
  } catch (error) {
    next(error);
  }
}

export async function previewWorkspaceInvite(req, res, next) {
  try {
    const inviteCode = normalizeInviteCode(req.params.code || req.query.code);

    if (!inviteCode) {
      throw new AppError("Mã mời là bắt buộc", 422);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode },
      include: includeWorkspace,
    });

    if (!workspace || !workspace.isActive) {
      throw new AppError("Mã mời hoặc link mời không hợp lệ", 404);
    }

    return ok(res, sanitizeInvitePreview(workspace, req.user.id), "Thông tin lời mời workspace.");
  } catch (error) {
    next(error);
  }
}

export async function listWorkspaceActivities(req, res, next) {
  try {
    const workspaceId = Number(req.params.id);

    if (!Number.isInteger(workspaceId)) {
      throw new AppError("Workspace không hợp lệ", 422);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: true,
      },
    });

    if (!workspace || !workspace.isActive) {
      throw new AppError("Không tìm thấy workspace", 404);
    }

    const currentMember = workspace.members.find((member) => member.userId === req.user.id && member.status === "ACTIVE");

    if (!currentMember) {
      throw new AppError("Bạn không có quyền xem hoạt động workspace này", 403);
    }

    const activities = await prisma.workspaceActivity.findMany({
      where: { workspaceId },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return ok(res, activities);
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspaceSettings(req, res, next) {
  try {
    const workspaceId = Number(req.params.id);

    if (!Number.isInteger(workspaceId)) {
      throw new AppError("Workspace không hợp lệ", 422);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: includeWorkspace,
    });

    if (!workspace || !workspace.isActive) {
      throw new AppError("Không tìm thấy workspace", 404);
    }

    assertWorkspaceAdmin(workspace, req.user.id);

    const settings = normalizeWorkspaceSettings(req.body);
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspace.id },
      data: settings,
      include: includeWorkspace,
    });

    await createWorkspaceActivity({
      workspaceId: workspace.id,
      actorId: req.user.id,
      action: "WORKSPACE_SETTINGS_UPDATED",
      title: "Cập nhật cấu hình workspace",
      description: "Admin workspace đã cập nhật logo hoặc SLA mặc định.",
      metadata: {
        defaultSlaHours: settings.defaultSlaHours,
        allowRequesterDueDateOverride: settings.allowRequesterDueDateOverride,
        hasLogo: Boolean(settings.logoData),
      },
    });

    return ok(res, sanitizeWorkspace(updatedWorkspace, req.user.id), "Đã cập nhật cấu hình workspace.");
  } catch (error) {
    next(error);
  }
}

export async function joinWorkspace(req, res, next) {
  try {
    const inviteCode = extractInviteCode(req.body);

    if (!inviteCode) {
      throw new AppError("Mã mời hoặc link mời là bắt buộc", 422);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode },
      include: includeWorkspace,
    });

    if (!workspace || !workspace.isActive) {
      throw new AppError("Mã mời hoặc link mời không hợp lệ", 404);
    }

    const existedMember = workspace.members.find((member) => member.userId === req.user.id);

    if (existedMember) {
      if (existedMember.status !== "ACTIVE") {
        const restoredMember = await prisma.workspaceMember.update({
          where: { id: existedMember.id },
          data: {
            status: "ACTIVE",
          },
        });

        workspace.members = workspace.members.map((member) => (member.id === restoredMember.id ? { ...member, status: "ACTIVE" } : member));
      }

      return ok(res, sanitizeWorkspace(workspace, req.user.id), "Bạn đã là thành viên của workspace này.");
    }

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        role: WORKSPACE_MEMBER,
      },
    });

    await createWorkspaceActivity({
      workspaceId: workspace.id,
      actorId: req.user.id,
      targetUserId: req.user.id,
      action: "MEMBER_JOINED",
      title: "Thành viên mới tham gia",
      description: `${req.user.fullName} đã tham gia workspace.`,
    });

    await notifyWorkspaceAdmins(workspace, {
      title: "Thành viên mới tham gia workspace",
      content: `${req.user.fullName} (@${req.user.username}) đã tham gia workspace "${workspace.name}".`,
      actorId: req.user.id,
    });

    await createUserNotification({
      userId: req.user.id,
      title: "Đã tham gia workspace",
      content: `Bạn đã tham gia workspace "${workspace.name}".`,
      type: "WORKSPACE",
      link: `${env.frontendUrl}/workspaces`,
    });

    const joinedWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: includeWorkspace,
    });

    return created(res, sanitizeWorkspace(joinedWorkspace, req.user.id), "Tham gia workspace thành công.");
  } catch (error) {
    next(error);
  }
}

export async function leaveWorkspace(req, res, next) {
  try {
    const workspaceId = Number(req.params.id);

    if (!Number.isInteger(workspaceId)) {
      throw new AppError("Workspace không hợp lệ", 422);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: includeWorkspace,
    });

    if (!workspace || !workspace.isActive) {
      throw new AppError("Không tìm thấy workspace", 404);
    }

    if (workspace.createdById === req.user.id) {
      throw new AppError("Người tạo workspace không thể thoát khỏi workspace này", 403);
    }

    const membership = workspace.members.find((member) => member.userId === req.user.id && member.status === "ACTIVE");

    if (!membership) {
      throw new AppError("Bạn không phải thành viên đang hoạt động của workspace này", 404);
    }

    await prisma.workspaceMember.update({
      where: { id: membership.id },
      data: {
        status: "LEFT",
      },
    });

    await createWorkspaceActivity({
      workspaceId: workspace.id,
      actorId: req.user.id,
      targetUserId: req.user.id,
      action: "MEMBER_LEFT",
      title: "Thành viên rời workspace",
      description: `${req.user.fullName} đã rời workspace.`,
    });

    await notifyWorkspaceAdmins(workspace, {
      title: "Thành viên rời workspace",
      content: `${req.user.fullName} (@${req.user.username}) đã rời workspace "${workspace.name}".`,
      actorId: req.user.id,
    });

    await createUserNotification({
      userId: req.user.id,
      title: "Đã thoát khỏi workspace",
      content: `Bạn đã thoát khỏi workspace "${workspace.name}".`,
      type: "WORKSPACE",
      link: `${env.frontendUrl}/workspaces`,
    });

    return ok(res, null, "Đã thoát khỏi workspace.");
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkspace(req, res, next) {
  try {
    const workspaceId = Number(req.params.id);

    if (!Number.isInteger(workspaceId)) {
      throw new AppError("Workspace không hợp lệ", 422);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: includeWorkspace,
    });

    if (!workspace || !workspace.isActive) {
      throw new AppError("Không tìm thấy workspace", 404);
    }

    const currentMember = workspace.members.find((member) => member.userId === req.user.id && member.status === "ACTIVE");
    const canDelete = workspace.createdById === req.user.id || currentMember?.role === WORKSPACE_ADMIN;

    if (!canDelete) {
      throw new AppError("Chỉ admin workspace mới có quyền xoá workspace", 403);
    }

    await prisma.$transaction([
      prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          isActive: false,
        },
      }),
      prisma.workspaceMember.updateMany({
        where: {
          workspaceId: workspace.id,
          status: "ACTIVE",
        },
        data: {
          status: "LEFT",
        },
      }),
    ]);

    await createUserNotification({
      userId: req.user.id,
      title: "Đã xoá workspace",
      content: `Workspace "${workspace.name}" đã được xoá khỏi danh sách hoạt động.`,
      type: "WORKSPACE",
      link: `${env.frontendUrl}/workspaces`,
    });

    return ok(res, null, "Đã xoá workspace.");
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspaceMemberRole(req, res, next) {
  try {
    const workspaceId = Number(req.params.id);
    const memberId = Number(req.params.memberId);
    const role = String(req.body.role || "").trim().toUpperCase();

    if (!Number.isInteger(workspaceId) || !Number.isInteger(memberId)) {
      throw new AppError("Thành viên workspace không hợp lệ", 422);
    }

    if (![WORKSPACE_ADMIN, WORKSPACE_MEMBER].includes(role)) {
      throw new AppError("Vai trò workspace không hợp lệ", 422);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: includeWorkspace,
    });

    if (!workspace || !workspace.isActive) {
      throw new AppError("Không tìm thấy workspace", 404);
    }

    assertWorkspaceAdmin(workspace, req.user.id);

    const targetMember = workspace.members.find((member) => member.id === memberId && member.status === "ACTIVE");

    if (!targetMember) {
      throw new AppError("Không tìm thấy thành viên đang hoạt động", 404);
    }

    if (workspace.createdById === targetMember.userId && role !== WORKSPACE_ADMIN) {
      throw new AppError("Không thể hạ quyền người tạo workspace", 403);
    }

    await prisma.workspaceMember.update({
      where: { id: targetMember.id },
      data: { role },
    });

    await createWorkspaceActivity({
      workspaceId: workspace.id,
      actorId: req.user.id,
      targetUserId: targetMember.userId,
      action: "MEMBER_ROLE_CHANGED",
      title: "Đổi quyền thành viên",
      description: `${targetMember.user.fullName} được đổi quyền từ ${targetMember.role} sang ${role}.`,
      metadata: {
        oldRole: targetMember.role,
        newRole: role,
      },
    });

    await createUserNotification({
      userId: targetMember.userId,
      title: "Vai trò workspace đã thay đổi",
      content: `Vai trò của bạn trong workspace "${workspace.name}" đã đổi từ ${targetMember.role} sang ${role}.`,
      type: "WORKSPACE",
      link: `${env.frontendUrl}/workspaces`,
    });

    await notifyWorkspaceAdmins(workspace, {
      title: "Đã đổi quyền thành viên",
      content: `${req.user.fullName} đã đổi quyền của ${targetMember.user.fullName} từ ${targetMember.role} sang ${role}.`,
      actorId: req.user.id,
    });

    const updatedWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: includeWorkspace,
    });

    return ok(res, sanitizeWorkspace(updatedWorkspace, req.user.id), "Đã cập nhật vai trò thành viên.");
  } catch (error) {
    next(error);
  }
}

export async function removeWorkspaceMember(req, res, next) {
  try {
    const workspaceId = Number(req.params.id);
    const memberId = Number(req.params.memberId);

    if (!Number.isInteger(workspaceId) || !Number.isInteger(memberId)) {
      throw new AppError("Thành viên workspace không hợp lệ", 422);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: includeWorkspace,
    });

    if (!workspace || !workspace.isActive) {
      throw new AppError("Không tìm thấy workspace", 404);
    }

    assertWorkspaceAdmin(workspace, req.user.id);

    const targetMember = workspace.members.find((member) => member.id === memberId && member.status === "ACTIVE");

    if (!targetMember) {
      throw new AppError("Không tìm thấy thành viên đang hoạt động", 404);
    }

    if (workspace.createdById === targetMember.userId) {
      throw new AppError("Không thể xóa người tạo workspace khỏi workspace", 403);
    }

    await prisma.workspaceMember.update({
      where: { id: targetMember.id },
      data: { status: "LEFT" },
    });

    await createWorkspaceActivity({
      workspaceId: workspace.id,
      actorId: req.user.id,
      targetUserId: targetMember.userId,
      action: "MEMBER_REMOVED",
      title: "Xóa thành viên khỏi workspace",
      description: `${targetMember.user.fullName} đã bị xóa khỏi workspace.`,
    });

    await createUserNotification({
      userId: targetMember.userId,
      title: "Bạn đã bị xóa khỏi workspace",
      content: `Bạn đã bị xóa khỏi workspace "${workspace.name}".`,
      type: "WORKSPACE",
      link: `${env.frontendUrl}/workspaces`,
    });

    await notifyWorkspaceAdmins(workspace, {
      title: "Đã xóa thành viên khỏi workspace",
      content: `${req.user.fullName} đã xóa ${targetMember.user.fullName} khỏi workspace "${workspace.name}".`,
      actorId: req.user.id,
    });

    const updatedWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: includeWorkspace,
    });

    return ok(res, sanitizeWorkspace(updatedWorkspace, req.user.id), "Đã xóa thành viên khỏi workspace.");
  } catch (error) {
    next(error);
  }
}
