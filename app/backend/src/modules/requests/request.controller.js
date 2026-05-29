import { prisma } from "../../config/prisma.js";
import { created, ok } from "../../utils/api-response.js";
import { AppError } from "../../utils/errors.js";
import { createUserNotification } from "../notifications/notification.service.js";
import { createHistory, findStatusByCode, generateRequestCode, requestInclude } from "./request.helpers.js";

const REQUEST_VISIBILITIES = ["PUBLIC", "PRIVATE"];
const WORKSPACE_ADMIN = "ADMIN";
const MAX_ATTACHMENTS_PER_REQUEST = 6;
const MAX_ATTACHMENT_DATA_LENGTH = 3_000_000;

function buildWorkspaceDueDate(workspace, requestedDueDate) {
  if (!workspace?.defaultSlaHours) {
    return requestedDueDate ? new Date(requestedDueDate) : null;
  }

  if (workspace.allowRequesterDueDateOverride !== false && requestedDueDate) {
    return new Date(requestedDueDate);
  }

  return new Date(Date.now() + workspace.defaultSlaHours * 60 * 60 * 1000);
}

async function getActiveWorkspaceMembership(workspaceId, userId) {
  if (!workspaceId) {
    return null;
  }

  return prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      status: "ACTIVE",
      workspace: {
        isActive: true,
      },
    },
  });
}

async function assertWorkspaceMembership(workspaceId, userId) {
  const membership = await getActiveWorkspaceMembership(workspaceId, userId);

  if (!membership) {
    throw new AppError("Bạn không phải thành viên đang hoạt động của workspace này", 403);
  }

  return membership;
}

async function canAdminRequest(user, request) {
  if (user.role.code === "ADMIN") return true;
  const membership = await getActiveWorkspaceMembership(request.workspaceId, user.id);
  return membership?.role === WORKSPACE_ADMIN;
}

async function canViewRequest(user, request) {
  if (user.role.code === "ADMIN") return true;
  if (request.createdById === user.id) return true;
  if (request.assignedToId === user.id) return true;
  if (request.privateMembers?.some((member) => member.userId === user.id)) return true;

  if (!request.privateMembers && request.visibility === "PRIVATE") {
    const privateMember = await prisma.requestPrivateMember.findFirst({
      where: {
        requestId: request.id,
        userId: user.id,
      },
      select: { id: true },
    });

    if (privateMember) return true;
  }

  const membership = await getActiveWorkspaceMembership(request.workspaceId, user.id);
  if (!membership) return false;
  if (membership.role === WORKSPACE_ADMIN) return true;
  if (request.visibility === "PUBLIC") return true;

  return false;
}

function buildRequestAccessWhere(user) {
  if (user.role.code === "ADMIN") {
    return {};
  }

  return {
    OR: [
      { createdById: user.id },
      { assignedToId: user.id },
      { privateMembers: { some: { userId: user.id } } },
      {
        workspace: {
          isActive: true,
          members: {
            some: {
              userId: user.id,
              status: "ACTIVE",
              role: WORKSPACE_ADMIN,
            },
          },
        },
      },
      {
        visibility: "PUBLIC",
        workspace: {
          isActive: true,
          members: {
            some: {
              userId: user.id,
              status: "ACTIVE",
            },
          },
        },
      },
    ],
  };
}

function buildRequestWhere(user, query) {
  const filters = [];

  if (query.keyword) {
    filters.push({
      OR: [
        { title: { contains: query.keyword, mode: "insensitive" } },
        { requestCode: { contains: query.keyword, mode: "insensitive" } },
      ],
    });
  }

  if (query.status) {
    filters.push({ status: { code: query.status } });
  }

  if (query.type) {
    filters.push({ requestType: { code: query.type } });
  }

  if (query.priority) {
    filters.push({ priority: { code: query.priority } });
  }

  if (query.workspaceId) {
    const workspaceId = Number(query.workspaceId);

    if (!Number.isInteger(workspaceId)) {
      throw new AppError("Workspace không hợp lệ", 422);
    }

    filters.push({ workspaceId });
  }

  filters.push(buildRequestAccessWhere(user));

  return { AND: filters };
}

function normalizeIdList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0),
  ));
}

function normalizeAttachments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length > MAX_ATTACHMENTS_PER_REQUEST) {
    throw new AppError(`Mỗi yêu cầu chỉ được đính kèm tối đa ${MAX_ATTACHMENTS_PER_REQUEST} file`, 422);
  }

  return value.map((item) => {
    const name = String(item?.name || "").trim();
    const mime = String(item?.mime || "application/octet-stream").trim();
    const data = String(item?.data || "");
    const type = String(item?.type || (mime.startsWith("image/") ? "IMAGE" : "FILE")).trim().toUpperCase();

    if (!name || !data) {
      throw new AppError("File đính kèm không hợp lệ", 422);
    }

    if (data.length > MAX_ATTACHMENT_DATA_LENGTH) {
      throw new AppError("Mỗi file đính kèm tối đa khoảng 2MB", 422);
    }

    return {
      name,
      mime,
      data,
      type: type === "IMAGE" ? "IMAGE" : "FILE",
    };
  });
}

async function assertWorkspacePrivateMembers(workspaceId, userIds) {
  if (!userIds.length) {
    return [];
  }

  if (!workspaceId) {
    throw new AppError("Yêu cầu riêng tư cần gắn workspace trước khi chọn thành viên được xem", 422);
  }

  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      userId: { in: userIds },
      status: "ACTIVE",
      workspace: {
        isActive: true,
      },
    },
    select: {
      userId: true,
    },
  });
  const validUserIds = new Set(members.map((member) => member.userId));
  const invalidUserIds = userIds.filter((userId) => !validUserIds.has(userId));

  if (invalidUserIds.length) {
    throw new AppError("Một số thành viên được chọn không thuộc workspace hoặc đã rời workspace", 422);
  }

  return userIds;
}

async function createWorkspaceRequestActivity({ request, actorId, action, title, description = null, metadata = undefined }) {
  if (!request.workspaceId) {
    return null;
  }

  return prisma.workspaceActivity.create({
    data: {
      workspaceId: request.workspaceId,
      actorId,
      action,
      title,
      description,
      metadata,
    },
  });
}

async function notifyRequestParticipants({ request, actorId, title, content, type = "REQUEST", emailImportant = false }) {
  const userIds = Array.from(new Set([request.createdById, request.assignedToId].filter(Boolean)))
    .filter((userId) => userId !== actorId);

  await Promise.all(userIds.map((userId) => createUserNotification({
    userId,
    title,
    content,
    type,
    link: "/workspaces",
    emailImportant,
  })));
}

export async function listRequests(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;
    const where = buildRequestWhere(req.user, req.query);

    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: requestInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.request.count({ where }),
    ]);

    return ok(res, {
      items,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getRequest(req, res, next) {
  try {
    const request = await prisma.request.findUnique({
      where: { id: Number(req.params.id) },
      include: requestInclude,
    });

    if (!request) {
      throw new AppError("Không tìm thấy yêu cầu", 404);
    }

    if (!(await canViewRequest(req.user, request))) {
      throw new AppError("Bạn không có quyền xem yêu cầu này", 403);
    }

    return ok(res, request);
  } catch (error) {
    next(error);
  }
}

export async function createRequest(req, res, next) {
  try {
    const { title, description, requestTypeId, priorityId, dueDate, workspaceId, projectId, visibility = "PUBLIC", privateMemberIds = [], attachments = [] } = req.body;

    if (!title || !description || !requestTypeId || !priorityId) {
      throw new AppError("Tiêu đề, nội dung, loại yêu cầu và mức độ ưu tiên là bắt buộc", 422);
    }

    const normalizedVisibility = String(visibility || "PUBLIC").trim().toUpperCase();

    if (!REQUEST_VISIBILITIES.includes(normalizedVisibility)) {
      throw new AppError("Phạm vi yêu cầu không hợp lệ", 422);
    }

    const normalizedWorkspaceId = workspaceId ? Number(workspaceId) : null;

    if (workspaceId && !Number.isInteger(normalizedWorkspaceId)) {
      throw new AppError("Workspace không hợp lệ", 422);
    }

    let workspaceSettings = null;
    let normalizedProjectId = null;

    if (normalizedWorkspaceId) {
      await assertWorkspaceMembership(normalizedWorkspaceId, req.user.id);
      workspaceSettings = await prisma.workspace.findUnique({
        where: { id: normalizedWorkspaceId },
        select: {
          defaultSlaHours: true,
          allowRequesterDueDateOverride: true,
        },
      });

      normalizedProjectId = projectId ? Number(projectId) : null;

      if (!Number.isInteger(normalizedProjectId)) {
        throw new AppError("Cần chọn dự án cho yêu cầu trong workspace", 422);
      }

      const project = await prisma.project.findFirst({
        where: {
          id: normalizedProjectId,
          workspaceId: normalizedWorkspaceId,
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

      if (!project) {
        throw new AppError("Dự án không hợp lệ hoặc không còn hoạt động trong workspace này", 422);
      }
    } else if (projectId) {
      throw new AppError("Chỉ có thể gắn dự án cho yêu cầu trong workspace", 422);
    }

    const normalizedPrivateMemberIds = normalizedVisibility === "PRIVATE"
      ? await assertWorkspacePrivateMembers(normalizedWorkspaceId, normalizeIdList(privateMemberIds))
      : [];
    const requestType = await prisma.requestType.findUnique({
      where: { id: Number(requestTypeId) },
      select: { id: true, workspaceId: true, isActive: true },
    });

    if (!requestType || !requestType.isActive || (requestType.workspaceId && requestType.workspaceId !== normalizedWorkspaceId)) {
      throw new AppError("Loại yêu cầu không hợp lệ với workspace này", 422);
    }

    const status = await findStatusByCode("CHO_TIEP_NHAN");

    if (!status) {
      throw new AppError("Chưa cấu hình trạng thái Chờ tiếp nhận", 500);
    }

    const privateMembersToCreate = normalizedPrivateMemberIds
      .filter((userId) => userId !== req.user.id)
      .map((userId) => ({ userId }));
    const normalizedAttachments = normalizeAttachments(attachments);

    const request = await prisma.request.create({
      data: {
        requestCode: await generateRequestCode(),
        title,
        description,
        workspaceId: normalizedWorkspaceId,
        projectId: normalizedProjectId,
        visibility: normalizedVisibility,
        requestTypeId: Number(requestTypeId),
        priorityId: Number(priorityId),
        statusId: status.id,
        createdById: req.user.id,
        dueDate: normalizedWorkspaceId ? buildWorkspaceDueDate(workspaceSettings, dueDate) : dueDate ? new Date(dueDate) : null,
        privateMembers: privateMembersToCreate.length
          ? {
              createMany: {
                data: privateMembersToCreate,
                skipDuplicates: true,
              },
            }
          : undefined,
        attachments: normalizedAttachments.length
          ? {
              createMany: {
                data: normalizedAttachments.map((attachment) => ({
                  ...attachment,
                  uploadedById: req.user.id,
                })),
              },
            }
          : undefined,
      },
      include: requestInclude,
    });

    await createHistory({
      requestId: request.id,
      actorId: req.user.id,
      action: "CREATE_REQUEST",
      newValue: request.requestCode,
      note: "Tạo yêu cầu mới",
    });

    await createWorkspaceRequestActivity({
      request,
      actorId: req.user.id,
      action: "REQUEST_CREATED",
      title: "Tạo yêu cầu mới",
      description: `${req.user.fullName} đã tạo yêu cầu ${request.requestCode}.`,
      metadata: {
        requestId: request.id,
        requestCode: request.requestCode,
        projectId: request.projectId,
        visibility: request.visibility,
        privateMemberIds: normalizedPrivateMemberIds,
        attachmentCount: normalizedAttachments.length,
      },
    });

    return created(res, request);
  } catch (error) {
    next(error);
  }
}

export async function updateRequest(req, res, next) {
  try {
    const request = await prisma.request.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!request) {
      throw new AppError("Không tìm thấy yêu cầu", 404);
    }

    if (request.createdById !== req.user.id && !(await canAdminRequest(req.user, request))) {
      throw new AppError("Bạn không có quyền cập nhật yêu cầu này", 403);
    }

    const { title, description, requestTypeId, priorityId, dueDate, visibility, privateMemberIds } = req.body;
    const normalizedVisibility = visibility ? String(visibility).trim().toUpperCase() : undefined;

    if (normalizedVisibility && !REQUEST_VISIBILITIES.includes(normalizedVisibility)) {
      throw new AppError("Phạm vi yêu cầu không hợp lệ", 422);
    }

    const nextVisibility = normalizedVisibility || request.visibility;
    const normalizedPrivateMemberIds = Array.isArray(privateMemberIds) && nextVisibility === "PRIVATE"
      ? await assertWorkspacePrivateMembers(request.workspaceId, normalizeIdList(privateMemberIds))
      : null;

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.request.update({
        where: { id: request.id },
        data: {
          title,
          description,
          visibility: normalizedVisibility,
          requestTypeId: requestTypeId ? Number(requestTypeId) : undefined,
          priorityId: priorityId ? Number(priorityId) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
        },
        include: requestInclude,
      });

      if (normalizedPrivateMemberIds) {
        await tx.requestPrivateMember.deleteMany({
          where: { requestId: request.id },
        });

        if (normalizedPrivateMemberIds.length) {
          await tx.requestPrivateMember.createMany({
            data: normalizedPrivateMemberIds
              .filter((userId) => userId !== request.createdById)
              .map((userId) => ({ requestId: request.id, userId })),
            skipDuplicates: true,
          });
        }

        return tx.request.findUnique({
          where: { id: request.id },
          include: requestInclude,
        });
      }

      if (nextVisibility === "PUBLIC") {
        await tx.requestPrivateMember.deleteMany({
          where: { requestId: request.id },
        });

        return tx.request.findUnique({
          where: { id: request.id },
          include: requestInclude,
        });
      }

      return item;
    });

    await createHistory({
      requestId: request.id,
      actorId: req.user.id,
      action: "UPDATE_REQUEST",
      note: "Cập nhật thông tin yêu cầu",
    });

    await createWorkspaceRequestActivity({
      request: updated,
      actorId: req.user.id,
      action: "REQUEST_UPDATED",
      title: "Cập nhật yêu cầu",
      description: `${req.user.fullName} đã cập nhật yêu cầu ${updated.requestCode}.`,
      metadata: {
        requestId: updated.id,
        requestCode: updated.requestCode,
      },
    });

    return ok(res, updated, "Cập nhật yêu cầu thành công");
  } catch (error) {
    next(error);
  }
}

export async function assignRequest(req, res, next) {
  try {
    const request = await prisma.request.findUnique({
      where: { id: Number(req.params.id) },
      include: { status: true },
    });

    if (!request) {
      throw new AppError("Không tìm thấy yêu cầu", 404);
    }

    if (!(await canAdminRequest(req.user, request))) {
      throw new AppError("Bạn không có quyền phân công yêu cầu này", 403);
    }

    const { assignedToId, assignedDepartmentId, note } = req.body;

    if (!assignedToId && !assignedDepartmentId) {
      throw new AppError("Cần chọn người xử lý hoặc bộ phận xử lý", 422);
    }

    if (request.workspaceId && assignedToId) {
      const assigneeMembership = await getActiveWorkspaceMembership(request.workspaceId, Number(assignedToId));

      if (!assigneeMembership) {
        throw new AppError("Người được phân công phải là thành viên đang hoạt động của workspace này", 422);
      }
    }

    const assignedStatus = await findStatusByCode("DA_PHAN_CONG");

    if (!assignedStatus) {
      throw new AppError("Chưa cấu hình trạng thái Đã phân công", 500);
    }

    const updated = await prisma.request.update({
      where: { id: request.id },
      data: {
        assignedToId: assignedToId ? Number(assignedToId) : null,
        assignedDepartmentId: assignedDepartmentId ? Number(assignedDepartmentId) : null,
        statusId: assignedStatus.id,
      },
      include: requestInclude,
    });

    await createHistory({
      requestId: request.id,
      actorId: req.user.id,
      action: "ASSIGN_REQUEST",
      oldValue: request.status.code,
      newValue: assignedStatus.code,
      note: note || "Phân công yêu cầu",
    });

    await createWorkspaceRequestActivity({
      request: updated,
      actorId: req.user.id,
      action: "REQUEST_ASSIGNED",
      title: "Phân công yêu cầu",
      description: `${req.user.fullName} đã phân công yêu cầu ${updated.requestCode}.`,
      metadata: {
        requestId: updated.id,
        requestCode: updated.requestCode,
        assignedToId: updated.assignedToId,
        assignedDepartmentId: updated.assignedDepartmentId,
      },
    });

    await notifyRequestParticipants({
      request: updated,
      actorId: req.user.id,
      title: "Yêu cầu đã được phân công",
      content: `${req.user.fullName} đã phân công yêu cầu ${updated.requestCode}${updated.assignedTo?.fullName ? ` cho ${updated.assignedTo.fullName}` : ""}.`,
    });

    return ok(res, updated, "Phân công yêu cầu thành công");
  } catch (error) {
    next(error);
  }
}

export async function selfAssignRequest(req, res, next) {
  try {
    const request = await prisma.request.findUnique({
      where: { id: Number(req.params.id) },
      include: { status: true },
    });

    if (!request) {
      throw new AppError("Không tìm thấy yêu cầu", 404);
    }

    if (!request.workspaceId || request.visibility !== "PUBLIC") {
      throw new AppError("Chỉ có thể tự nhận yêu cầu public trong workspace", 403);
    }

    const membership = await getActiveWorkspaceMembership(request.workspaceId, req.user.id);

    if (!membership) {
      throw new AppError("Bạn không phải thành viên đang hoạt động của workspace này", 403);
    }

    if (request.assignedToId) {
      throw new AppError("Yêu cầu này đã có người xử lý", 409);
    }

    if (["HOAN_THANH", "TU_CHOI"].includes(request.status?.code)) {
      throw new AppError("Không thể nhận yêu cầu đã đóng", 409);
    }

    const assignedStatus = await findStatusByCode("DA_PHAN_CONG");

    if (!assignedStatus) {
      throw new AppError("Chưa cấu hình trạng thái Đã phân công", 500);
    }

    const updated = await prisma.request.update({
      where: { id: request.id },
      data: {
        assignedToId: req.user.id,
        assignedDepartmentId: req.user.departmentId || request.assignedDepartmentId || null,
        statusId: assignedStatus.id,
      },
      include: requestInclude,
    });

    await createHistory({
      requestId: request.id,
      actorId: req.user.id,
      action: "SELF_ASSIGN_REQUEST",
      oldValue: request.status.code,
      newValue: assignedStatus.code,
      note: "Tự nhận xử lý yêu cầu public",
    });

    await createWorkspaceRequestActivity({
      request: updated,
      actorId: req.user.id,
      action: "REQUEST_SELF_ASSIGNED",
      title: "Tự nhận xử lý yêu cầu",
      description: `${req.user.fullName} đã tự nhận xử lý yêu cầu ${updated.requestCode}.`,
      metadata: {
        requestId: updated.id,
        requestCode: updated.requestCode,
        assignedToId: updated.assignedToId,
        assignedDepartmentId: updated.assignedDepartmentId,
      },
    });

    await notifyRequestParticipants({
      request: updated,
      actorId: req.user.id,
      title: "Yêu cầu đã có người nhận xử lý",
      content: `${req.user.fullName} đã tự nhận xử lý yêu cầu ${updated.requestCode}.`,
    });

    return ok(res, updated, "Đã nhận xử lý yêu cầu.");
  } catch (error) {
    next(error);
  }
}

export async function updateRequestStatus(req, res, next) {
  try {
    const request = await prisma.request.findUnique({
      where: { id: Number(req.params.id) },
      include: { status: true },
    });

    if (!request) {
      throw new AppError("Không tìm thấy yêu cầu", 404);
    }

    if (request.assignedToId !== req.user.id && !(await canAdminRequest(req.user, request))) {
      throw new AppError("Bạn không có quyền cập nhật trạng thái yêu cầu này", 403);
    }

    const { statusCode, note } = req.body;

    if (!statusCode) {
      throw new AppError("Trạng thái mới là bắt buộc", 422);
    }

    if (statusCode === "HOAN_THANH" && !note) {
      throw new AppError("Cần nhập kết quả xử lý khi hoàn thành yêu cầu", 422);
    }

    const status = await findStatusByCode(statusCode);

    if (!status) {
      throw new AppError("Trạng thái không hợp lệ", 422);
    }

    const updated = await prisma.request.update({
      where: { id: request.id },
      data: {
        statusId: status.id,
        completedAt: status.code === "HOAN_THANH" ? new Date() : null,
      },
      include: requestInclude,
    });

    await createHistory({
      requestId: request.id,
      actorId: req.user.id,
      action: "CHANGE_STATUS",
      oldValue: request.status.code,
      newValue: status.code,
      note,
    });

    await createWorkspaceRequestActivity({
      request: updated,
      actorId: req.user.id,
      action: status.code === "HOAN_THANH" ? "REQUEST_COMPLETED" : "REQUEST_STATUS_CHANGED",
      title: "Đổi trạng thái yêu cầu",
      description: `${req.user.fullName} đã đổi trạng thái yêu cầu ${updated.requestCode} sang ${status.name}.`,
      metadata: {
        requestId: updated.id,
        requestCode: updated.requestCode,
        oldStatus: request.status.code,
        newStatus: status.code,
      },
    });

    await notifyRequestParticipants({
      request: updated,
      actorId: req.user.id,
      title: "Yêu cầu đã đổi trạng thái",
      content: `${req.user.fullName} đã đổi trạng thái yêu cầu ${updated.requestCode} sang ${status.name}.`,
    });

    return ok(res, updated, "Cập nhật trạng thái thành công");
  } catch (error) {
    next(error);
  }
}

export async function addComment(req, res, next) {
  try {
    const request = await prisma.request.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!request) {
      throw new AppError("Không tìm thấy yêu cầu", 404);
    }

    if (!(await canViewRequest(req.user, request))) {
      throw new AppError("Bạn không có quyền ghi chú yêu cầu này", 403);
    }

    const { content } = req.body;

    if (!content) {
      throw new AppError("Nội dung ghi chú không được để trống", 422);
    }

    const comment = await prisma.requestComment.create({
      data: {
        requestId: request.id,
        userId: req.user.id,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          avatarData: true,
          },
        },
      },
    });

    await createHistory({
      requestId: request.id,
      actorId: req.user.id,
      action: "ADD_COMMENT",
      note: content,
    });

    await createWorkspaceRequestActivity({
      request,
      actorId: req.user.id,
      action: "REQUEST_COMMENTED",
      title: "Thêm ghi chú yêu cầu",
      description: `${req.user.fullName} đã thêm ghi chú vào yêu cầu ${request.requestCode}.`,
      metadata: {
        requestId: request.id,
        requestCode: request.requestCode,
      },
    });

    await notifyRequestParticipants({
      request,
      actorId: req.user.id,
      title: "Yêu cầu có ghi chú mới",
      content: `${req.user.fullName} đã thêm ghi chú vào yêu cầu ${request.requestCode}.`,
    });

    return created(res, comment, "Thêm ghi chú thành công");
  } catch (error) {
    next(error);
  }
}

export async function listRequestComments(req, res, next) {
  try {
    const request = await prisma.request.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!request) {
      throw new AppError("Không tìm thấy yêu cầu", 404);
    }

    if (!(await canViewRequest(req.user, request))) {
      throw new AppError("Bạn không có quyền xem ghi chú yêu cầu này", 403);
    }

    const comments = await prisma.requestComment.findMany({
      where: { requestId: Number(req.params.id) },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          avatarData: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok(res, comments);
  } catch (error) {
    next(error);
  }
}

export async function listRequestHistories(req, res, next) {
  try {
    const request = await prisma.request.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!request) {
      throw new AppError("Không tìm thấy yêu cầu", 404);
    }

    if (!(await canViewRequest(req.user, request))) {
      throw new AppError("Bạn không có quyền xem lịch sử yêu cầu này", 403);
    }

    const histories = await prisma.requestHistory.findMany({
      where: { requestId: Number(req.params.id) },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          avatarData: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok(res, histories);
  } catch (error) {
    next(error);
  }
}
