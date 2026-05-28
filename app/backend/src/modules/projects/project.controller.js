import { prisma } from "../../config/prisma.js";
import { created, ok } from "../../utils/api-response.js";
import { AppError } from "../../utils/errors.js";

const WORKSPACE_ADMIN = "ADMIN";
const PROJECT_STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED", "CLOSED"];
const PROJECT_ITEM_TYPES = ["STORY", "TASK", "SUB_TASK"];
const PROJECT_ITEM_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"];
const PROJECT_ITEM_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function normalizeProjectCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `page-${Date.now()}`;
}

function parseOptionalDate(value, fieldLabel) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldLabel} không hợp lệ`, 422);
  }

  return date;
}

function assertProjectManager(project, membership, userId) {
  if (project.createdById !== userId && membership?.role !== WORKSPACE_ADMIN) {
    throw new AppError("Chỉ admin workspace hoặc người tạo dự án mới có quyền thực hiện thao tác này", 403);
  }
}

async function getWorkspaceAccess(workspaceId, user) {
  if (!Number.isInteger(workspaceId)) {
    throw new AppError("Workspace không hợp lệ", 422);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: true },
  });

  if (!workspace || !workspace.isActive) {
    throw new AppError("Không tìm thấy workspace", 404);
  }

  const membership = workspace.members.find((member) => member.userId === user.id && member.status === "ACTIVE");

  if (!membership) {
    throw new AppError("Bạn không có quyền xem workspace này", 403);
  }

  return {
    workspace,
    membership,
    canManage: workspace.createdById === user.id || membership.role === WORKSPACE_ADMIN,
  };
}

function projectInclude() {
  return {
    createdBy: {
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
      },
    },
    _count: {
      select: {
        requests: true,
        workItems: true,
      },
    },
  };
}

function workItemInclude() {
  return {
    assignedTo: {
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        fullName: true,
        username: true,
      },
    },
    workLogs: {
      orderBy: { workedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    },
  };
}

function pageInclude() {
  return {
    createdBy: {
      select: {
        id: true,
        fullName: true,
        username: true,
      },
    },
    updatedBy: {
      select: {
        id: true,
        fullName: true,
        username: true,
      },
    },
    revisions: {
      orderBy: { version: "desc" },
      take: 5,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    },
  };
}

async function getProjectAccess(projectId, user) {
  if (!Number.isInteger(projectId)) {
    throw new AppError("Dự án không hợp lệ", 422);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        include: { members: true },
      },
    },
  });

  if (!project || !project.workspace?.isActive) {
    throw new AppError("Không tìm thấy dự án", 404);
  }

  const membership = project.workspace.members.find((member) => member.userId === user.id && member.status === "ACTIVE");

  if (!membership) {
    throw new AppError("Bạn không có quyền xem dự án này", 403);
  }

  return {
    project,
    membership,
    canManage: project.workspace.createdById === user.id || membership.role === WORKSPACE_ADMIN,
  };
}

async function createUniquePageSlug(projectId, title, excludePageId = null) {
  const baseSlug = normalizeSlug(title);

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const slug = suffix ? `${baseSlug}-${suffix + 1}` : baseSlug;
    const existed = await prisma.projectPage.findFirst({
      where: {
        projectId,
        slug,
        ...(excludePageId ? { id: { not: excludePageId } } : {}),
      },
      select: { id: true },
    });

    if (!existed) {
      return slug;
    }
  }

  throw new AppError("Không thể tạo slug tài liệu, vui lòng đổi tiêu đề", 409);
}

async function validateProjectWorkItemParent({ projectId, type, parentId, itemId = null }) {
  if (type === "STORY" && parentId) {
    throw new AppError("Story không được chọn công việc cha", 422);
  }

  if (type === "SUB_TASK" && !parentId) {
    throw new AppError("Sub-task bắt buộc phải chọn task cha", 422);
  }

  if (!parentId) {
    return null;
  }

  if (itemId && parentId === itemId) {
    throw new AppError("Công việc cha không được trỏ về chính nó", 422);
  }

  const parent = await prisma.projectWorkItem.findFirst({
    where: {
      id: parentId,
      projectId,
      ...(itemId ? { id: { not: itemId } } : {}),
    },
    select: { id: true, type: true },
  });

  if (!parent) {
    throw new AppError("Công việc cha không hợp lệ", 422);
  }

  if (type === "TASK" && parent.type !== "STORY") {
    throw new AppError("Task chỉ có thể là con của story hoặc đứng độc lập", 422);
  }

  if (type === "SUB_TASK" && parent.type !== "TASK") {
    throw new AppError("Sub-task chỉ có thể là con của task", 422);
  }

  return parent;
}

async function withProjectPageCounts(projects) {
  const items = Array.isArray(projects) ? projects : [projects].filter(Boolean);

  if (!items.length) {
    return projects;
  }

  const pageCounts = await prisma.projectPage.groupBy({
    by: ["projectId"],
    where: {
      projectId: { in: items.map((project) => project.id) },
      isArchived: false,
    },
    _count: {
      _all: true,
    },
  });
  const countByProjectId = new Map(pageCounts.map((item) => [item.projectId, item._count._all]));
  const mapped = items.map((project) => ({
    ...project,
    _count: {
      ...(project._count || {}),
      pages: countByProjectId.get(project.id) || 0,
    },
  }));

  return Array.isArray(projects) ? mapped : mapped[0];
}

async function withProjectWorkItemSummary(projects) {
  const items = Array.isArray(projects) ? projects : [projects].filter(Boolean);

  if (!items.length) {
    return projects;
  }

  const projectIds = items.map((project) => project.id);
  const grouped = await prisma.projectWorkItem.groupBy({
    by: ["projectId", "status", "type"],
    where: { projectId: { in: projectIds } },
    _count: { _all: true },
  });
  const now = new Date();
  const overdueGrouped = await prisma.projectWorkItem.groupBy({
    by: ["projectId"],
    where: {
      projectId: { in: projectIds },
      dueDate: { lt: now },
      status: { not: "DONE" },
    },
    _count: { _all: true },
  });
  const summaryByProjectId = new Map(projectIds.map((id) => [id, {
    byStatus: {},
    byType: {},
    overdue: 0,
    completed: 0,
    total: 0,
  }]));

  grouped.forEach((item) => {
    const summary = summaryByProjectId.get(item.projectId);
    const count = item._count._all;
    summary.byStatus[item.status] = (summary.byStatus[item.status] || 0) + count;
    summary.byType[item.type] = (summary.byType[item.type] || 0) + count;
    summary.total += count;

    if (item.status === "DONE") {
      summary.completed += count;
    }
  });
  overdueGrouped.forEach((item) => {
    const summary = summaryByProjectId.get(item.projectId);
    summary.overdue = item._count._all;
  });

  const mapped = items.map((project) => ({
    ...project,
    workItemSummary: summaryByProjectId.get(project.id),
  }));

  return Array.isArray(projects) ? mapped : mapped[0];
}

async function enrichProjects(projects) {
  return withProjectWorkItemSummary(await withProjectPageCounts(projects));
}

export async function listProjects(req, res, next) {
  try {
    const workspaceId = Number(req.query.workspaceId);
    await getWorkspaceAccess(workspaceId, req.user);

    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: projectInclude(),
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    return ok(res, await enrichProjects(projects));
  } catch (error) {
    next(error);
  }
}

export async function createProject(req, res, next) {
  try {
    const workspaceId = Number(req.body.workspaceId);
    const { canManage } = await getWorkspaceAccess(workspaceId, req.user);

    if (!canManage) {
      throw new AppError("Chỉ admin workspace mới có quyền tạo dự án", 403);
    }

    const name = String(req.body.name || "").trim();
    const code = normalizeProjectCode(req.body.code || name);
    const description = req.body.description ? String(req.body.description).trim() : null;
    const startDate = parseOptionalDate(req.body.startDate, "Ngày bắt đầu");
    const dueDate = parseOptionalDate(req.body.dueDate, "Hạn dự án");

    if (!name || !code) {
      throw new AppError("Tên và mã dự án là bắt buộc", 422);
    }

    if (startDate && dueDate && dueDate < startDate) {
      throw new AppError("Hạn dự án không được nhỏ hơn ngày bắt đầu", 422);
    }

    const existed = await prisma.project.findFirst({
      where: { workspaceId, code },
      select: { id: true },
    });

    if (existed) {
      throw new AppError("Mã dự án đã tồn tại trong workspace", 409);
    }

    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        code,
        description,
        startDate,
        dueDate,
        createdById: req.user.id,
      },
      include: projectInclude(),
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId,
        actorId: req.user.id,
        action: "PROJECT_CREATED",
        title: "Tạo dự án mới",
        description: `${req.user.fullName} đã tạo dự án ${project.name}.`,
        metadata: { projectId: project.id, projectCode: project.code },
      },
    });

    return created(res, await enrichProjects(project));
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req, res, next) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!project) {
      throw new AppError("Không tìm thấy dự án", 404);
    }

    const { membership } = await getWorkspaceAccess(project.workspaceId, req.user);
    assertProjectManager(project, membership, req.user.id);

    const name = String(req.body.name || "").trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    const startDate = parseOptionalDate(req.body.startDate, "Ngày bắt đầu");
    const dueDate = parseOptionalDate(req.body.dueDate, "Hạn dự án");

    if (!name) {
      throw new AppError("Tên dự án là bắt buộc", 422);
    }

    if (startDate && dueDate && dueDate < startDate) {
      throw new AppError("Hạn dự án không được nhỏ hơn ngày bắt đầu", 422);
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { name, description, startDate, dueDate },
      include: projectInclude(),
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: req.user.id,
        action: "PROJECT_UPDATED",
        title: "Cập nhật dự án",
        description: `${req.user.fullName} đã cập nhật dự án ${updated.name}.`,
        metadata: { projectId: updated.id, projectCode: updated.code },
      },
    });

    return ok(res, await enrichProjects(updated), "Cập nhật dự án thành công");
  } catch (error) {
    next(error);
  }
}

export async function updateProjectStatus(req, res, next) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!project) {
      throw new AppError("Không tìm thấy dự án", 404);
    }

    const { membership } = await getWorkspaceAccess(project.workspaceId, req.user);
    assertProjectManager(project, membership, req.user.id);

    const status = String(req.body.status || "").trim().toUpperCase();

    if (!PROJECT_STATUSES.includes(status)) {
      throw new AppError("Trạng thái dự án không hợp lệ", 422);
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { status },
      include: projectInclude(),
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: req.user.id,
        action: "PROJECT_STATUS_CHANGED",
        title: "Đổi trạng thái dự án",
        description: `${req.user.fullName} đã đổi trạng thái dự án ${updated.name}.`,
        metadata: { projectId: updated.id, projectCode: updated.code, status },
      },
    });

    return ok(res, await enrichProjects(updated), "Cập nhật trạng thái dự án thành công");
  } catch (error) {
    next(error);
  }
}

export async function extendProject(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const { project, membership } = await getProjectAccess(projectId, req.user);
    assertProjectManager(project, membership, req.user.id);

    const dueDate = parseOptionalDate(req.body.dueDate, "Hạn dự án mới");
    const extensionReason = String(req.body.reason || "").trim() || null;

    if (!dueDate) {
      throw new AppError("Hạn dự án mới là bắt buộc", 422);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      throw new AppError("Hạn dự án mới không được nhỏ hơn ngày hiện tại", 422);
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        dueDate,
        extendedAt: new Date(),
        extensionReason,
        status: project.status === "CLOSED" ? project.status : "ACTIVE",
      },
      include: projectInclude(),
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: req.user.id,
        action: "PROJECT_EXTENDED",
        title: "Gia hạn dự án",
        description: `${req.user.fullName} đã gia hạn dự án ${project.name}.`,
        metadata: { projectId: project.id, dueDate, extensionReason },
      },
    });

    return ok(res, await enrichProjects(updated), "Đã gia hạn dự án.");
  } catch (error) {
    next(error);
  }
}

export async function closeProject(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const { project, membership } = await getProjectAccess(projectId, req.user);
    assertProjectManager(project, membership, req.user.id);

    const closedReason = String(req.body.reason || "").trim() || null;
    const now = new Date();
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "CLOSED",
        closedAt: now,
        completedAt: req.body.completed === false ? project.completedAt : now,
        closedReason,
      },
      include: projectInclude(),
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: req.user.id,
        action: "PROJECT_CLOSED",
        title: "Đóng dự án",
        description: `${req.user.fullName} đã đóng dự án ${project.name}.`,
        metadata: { projectId: project.id, closedReason },
      },
    });

    return ok(res, await enrichProjects(updated), "Đã đóng dự án.");
  } catch (error) {
    next(error);
  }
}

export async function listProjectWorkItems(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    await getProjectAccess(projectId, req.user);

    const items = await prisma.projectWorkItem.findMany({
      where: { projectId },
      include: workItemInclude(),
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    return ok(res, items);
  } catch (error) {
    next(error);
  }
}

export async function createProjectWorkItem(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const { project } = await getProjectAccess(projectId, req.user);

    if (project.status === "CLOSED" || project.status === "ARCHIVED") {
      throw new AppError("Dự án đã đóng hoặc lưu trữ, không thể tạo công việc mới", 403);
    }

    const type = String(req.body.type || "TASK").trim().toUpperCase();
    const title = String(req.body.title || "").trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    const priority = String(req.body.priority || "MEDIUM").trim().toUpperCase();
    const parentId = req.body.parentId ? Number(req.body.parentId) : null;
    const assignedToId = req.body.assignedToId ? Number(req.body.assignedToId) : null;
    const startDate = parseOptionalDate(req.body.startDate, "Ngày bắt đầu công việc");
    const dueDate = parseOptionalDate(req.body.dueDate, "Hạn công việc");

    if (!PROJECT_ITEM_TYPES.includes(type)) {
      throw new AppError("Loại công việc không hợp lệ", 422);
    }

    if (!PROJECT_ITEM_PRIORITIES.includes(priority)) {
      throw new AppError("Mức ưu tiên công việc không hợp lệ", 422);
    }

    if (!title) {
      throw new AppError("Tiêu đề công việc là bắt buộc", 422);
    }

    if (startDate && dueDate && dueDate < startDate) {
      throw new AppError("Deadline công việc không được nhỏ hơn ngày bắt đầu", 422);
    }

    await validateProjectWorkItemParent({ projectId, type, parentId });

    if (assignedToId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: assignedToId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!membership) {
        throw new AppError("Người xử lý phải là thành viên đang hoạt động của workspace", 422);
      }
    }

    const item = await prisma.projectWorkItem.create({
      data: {
        projectId,
        parentId,
        type,
        title,
        description,
        priority,
        assignedToId,
        startDate,
        dueDate,
        createdById: req.user.id,
      },
      include: workItemInclude(),
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: req.user.id,
        action: "PROJECT_WORK_ITEM_CREATED",
        title: "Tạo công việc dự án",
        description: `${req.user.fullName} đã tạo ${type} ${item.title} trong dự án ${project.name}.`,
        metadata: { projectId, itemId: item.id, type },
      },
    });

    return created(res, item, "Đã tạo công việc dự án.");
  } catch (error) {
    next(error);
  }
}

export async function updateProjectWorkItem(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const { project } = await getProjectAccess(projectId, req.user);
    const item = await prisma.projectWorkItem.findFirst({
      where: { id: itemId, projectId },
    });

    if (!item) {
      throw new AppError("Không tìm thấy công việc dự án", 404);
    }

    const type = String(req.body.type || item.type).trim().toUpperCase();
    const title = String(req.body.title || "").trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    const priority = String(req.body.priority || item.priority).trim().toUpperCase();
    const parentId = req.body.parentId ? Number(req.body.parentId) : null;
    const assignedToId = req.body.assignedToId ? Number(req.body.assignedToId) : null;
    const startDate = parseOptionalDate(req.body.startDate, "Ngày bắt đầu công việc");
    const dueDate = parseOptionalDate(req.body.dueDate, "Hạn công việc");

    if (!PROJECT_ITEM_TYPES.includes(type) || !PROJECT_ITEM_PRIORITIES.includes(priority)) {
      throw new AppError("Thông tin công việc không hợp lệ", 422);
    }

    if (!title) {
      throw new AppError("Tiêu đề công việc là bắt buộc", 422);
    }

    if (startDate && dueDate && dueDate < startDate) {
      throw new AppError("Deadline công việc không được nhỏ hơn ngày bắt đầu", 422);
    }

    await validateProjectWorkItemParent({ projectId, type, parentId, itemId: item.id });

    const updated = await prisma.projectWorkItem.update({
      where: { id: item.id },
      data: {
        type,
        title,
        description,
        priority,
        parentId,
        assignedToId,
        startDate,
        dueDate,
      },
      include: workItemInclude(),
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: req.user.id,
        action: "PROJECT_WORK_ITEM_UPDATED",
        title: "Cập nhật công việc dự án",
        description: `${req.user.fullName} đã cập nhật ${updated.title}.`,
        metadata: { projectId, itemId: updated.id },
      },
    });

    return ok(res, updated, "Đã cập nhật công việc dự án.");
  } catch (error) {
    next(error);
  }
}

export async function updateProjectWorkItemStatus(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const { project } = await getProjectAccess(projectId, req.user);
    const status = String(req.body.status || "").trim().toUpperCase();

    if (!PROJECT_ITEM_STATUSES.includes(status)) {
      throw new AppError("Trạng thái công việc không hợp lệ", 422);
    }

    const item = await prisma.projectWorkItem.findFirst({
      where: { id: itemId, projectId },
    });

    if (!item) {
      throw new AppError("Không tìm thấy công việc dự án", 404);
    }

    const updated = await prisma.projectWorkItem.update({
      where: { id: item.id },
      data: {
        status,
        completedAt: status === "DONE" ? (item.completedAt || new Date()) : null,
      },
      include: workItemInclude(),
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: req.user.id,
        action: status === "DONE" ? "PROJECT_WORK_ITEM_COMPLETED" : "PROJECT_WORK_ITEM_STATUS_CHANGED",
        title: status === "DONE" ? "Hoàn thành công việc dự án" : "Đổi trạng thái công việc dự án",
        description: `${req.user.fullName} đã chuyển ${updated.title} sang ${status}.`,
        metadata: { projectId, itemId: updated.id, status },
      },
    });

    return ok(res, updated, "Đã cập nhật trạng thái công việc.");
  } catch (error) {
    next(error);
  }
}

export async function createProjectWorkLog(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const { project } = await getProjectAccess(projectId, req.user);

    if (project.status === "CLOSED" || project.status === "ARCHIVED") {
      throw new AppError("Dá»± Ã¡n Ä‘Ã£ Ä‘Ã³ng hoáº·c lÆ°u trá»¯, khÃ´ng thá»ƒ ghi logwork", 403);
    }

    const item = await prisma.projectWorkItem.findFirst({
      where: { id: itemId, projectId },
      select: { id: true, title: true },
    });

    if (!item) {
      throw new AppError("KhÃ´ng tÃ¬m tháº¥y cÃ´ng viá»‡c dá»± Ã¡n", 404);
    }

    const minutes = Number(req.body.minutes);
    const note = req.body.note ? String(req.body.note).trim() : null;
    const workedAt = parseOptionalDate(req.body.workedAt, "NgÃ y logwork") || new Date();

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      throw new AppError("Thá»i gian logwork pháº£i tá»« 1 Ä‘áº¿n 1440 phÃºt", 422);
    }

    await prisma.projectWorkLog.create({
      data: {
        workItemId: item.id,
        userId: req.user.id,
        minutes,
        note,
        workedAt,
      },
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: req.user.id,
        action: "PROJECT_WORK_ITEM_LOGGED",
        title: "Ghi logwork cÃ´ng viá»‡c",
        description: `${req.user.fullName} Ä‘Ã£ log ${minutes} phÃºt cho ${item.title}.`,
        metadata: { projectId, itemId: item.id, minutes },
      },
    });

    const updated = await prisma.projectWorkItem.findUnique({
      where: { id: item.id },
      include: workItemInclude(),
    });

    return created(res, updated, "ÄÃ£ ghi logwork cho cÃ´ng viá»‡c.");
  } catch (error) {
    next(error);
  }
}

export async function listProjectPages(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    await getProjectAccess(projectId, req.user);

    const pages = await prisma.projectPage.findMany({
      where: {
        projectId,
        isArchived: false,
      },
      include: pageInclude(),
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return ok(res, pages);
  } catch (error) {
    next(error);
  }
}

export async function createProjectPage(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const { project, canManage } = await getProjectAccess(projectId, req.user);

    if (!canManage) {
      throw new AppError("Chỉ admin workspace mới có quyền tạo tài liệu dự án", 403);
    }

    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    const parentId = req.body.parentId ? Number(req.body.parentId) : null;

    if (!title) {
      throw new AppError("Tiêu đề tài liệu là bắt buộc", 422);
    }

    if (parentId) {
      const parent = await prisma.projectPage.findFirst({
        where: { id: parentId, projectId, isArchived: false },
        select: { id: true },
      });

      if (!parent) {
        throw new AppError("Trang cha không hợp lệ", 422);
      }
    }

    const slug = await createUniquePageSlug(projectId, title);
    const page = await prisma.$transaction(async (tx) => {
      const createdPage = await tx.projectPage.create({
        data: {
          projectId,
          parentId,
          title,
          slug,
          content,
          createdById: req.user.id,
          updatedById: req.user.id,
        },
      });

      await tx.projectPageRevision.create({
        data: {
          pageId: createdPage.id,
          title,
          content,
          version: 1,
          createdById: req.user.id,
        },
      });

      await tx.workspaceActivity.create({
        data: {
          workspaceId: project.workspaceId,
          actorId: req.user.id,
          action: "PROJECT_PAGE_CREATED",
          title: "Tạo tài liệu dự án",
          description: `${req.user.fullName} đã tạo tài liệu ${createdPage.title} trong dự án ${project.name}.`,
          metadata: { projectId: project.id, pageId: createdPage.id },
        },
      });

      return tx.projectPage.findUnique({
        where: { id: createdPage.id },
        include: pageInclude(),
      });
    });

    return created(res, page, "Đã tạo tài liệu dự án.");
  } catch (error) {
    next(error);
  }
}

export async function updateProjectPage(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const pageId = Number(req.params.pageId);
    const { project, canManage } = await getProjectAccess(projectId, req.user);

    if (!canManage) {
      throw new AppError("Chỉ admin workspace mới có quyền sửa tài liệu dự án", 403);
    }

    const page = await prisma.projectPage.findFirst({
      where: { id: pageId, projectId, isArchived: false },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!page) {
      throw new AppError("Không tìm thấy tài liệu", 404);
    }

    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    const parentId = req.body.parentId ? Number(req.body.parentId) : null;

    if (!title) {
      throw new AppError("Tiêu đề tài liệu là bắt buộc", 422);
    }

    if (parentId === page.id) {
      throw new AppError("Trang cha không được trỏ về chính nó", 422);
    }

    if (parentId) {
      const parent = await prisma.projectPage.findFirst({
        where: { id: parentId, projectId, isArchived: false },
        select: { id: true },
      });

      if (!parent) {
        throw new AppError("Trang cha không hợp lệ", 422);
      }
    }

    const slug = title === page.title ? page.slug : await createUniquePageSlug(projectId, title, page.id);
    const nextVersion = (page.revisions[0]?.version || 0) + 1;
    const updatedPage = await prisma.$transaction(async (tx) => {
      await tx.projectPage.update({
        where: { id: page.id },
        data: {
          title,
          slug,
          content,
          parentId,
          updatedById: req.user.id,
        },
      });

      await tx.projectPageRevision.create({
        data: {
          pageId: page.id,
          title,
          content,
          version: nextVersion,
          createdById: req.user.id,
        },
      });

      await tx.workspaceActivity.create({
        data: {
          workspaceId: project.workspaceId,
          actorId: req.user.id,
          action: "PROJECT_PAGE_UPDATED",
          title: "Cập nhật tài liệu dự án",
          description: `${req.user.fullName} đã cập nhật tài liệu ${title} trong dự án ${project.name}.`,
          metadata: { projectId: project.id, pageId: page.id, version: nextVersion },
        },
      });

      return tx.projectPage.findUnique({
        where: { id: page.id },
        include: pageInclude(),
      });
    });

    return ok(res, updatedPage, "Đã cập nhật tài liệu dự án.");
  } catch (error) {
    next(error);
  }
}

export async function archiveProjectPage(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const pageId = Number(req.params.pageId);
    const { project, canManage } = await getProjectAccess(projectId, req.user);

    if (!canManage) {
      throw new AppError("Chỉ admin workspace mới có quyền lưu trữ tài liệu dự án", 403);
    }

    const page = await prisma.projectPage.findFirst({
      where: { id: pageId, projectId, isArchived: false },
    });

    if (!page) {
      throw new AppError("Không tìm thấy tài liệu", 404);
    }

    await prisma.$transaction([
      prisma.projectPage.update({
        where: { id: page.id },
        data: {
          isArchived: true,
          updatedById: req.user.id,
        },
      }),
      prisma.workspaceActivity.create({
        data: {
          workspaceId: project.workspaceId,
          actorId: req.user.id,
          action: "PROJECT_PAGE_ARCHIVED",
          title: "Lưu trữ tài liệu dự án",
          description: `${req.user.fullName} đã lưu trữ tài liệu ${page.title}.`,
          metadata: { projectId: project.id, pageId: page.id },
        },
      }),
    ]);

    return ok(res, null, "Đã lưu trữ tài liệu dự án.");
  } catch (error) {
    next(error);
  }
}
