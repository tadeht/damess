import { prisma } from "../../config/prisma.js";
import { created, ok } from "../../utils/api-response.js";
import { AppError } from "../../utils/errors.js";

const WORKSPACE_ADMIN = "ADMIN";

async function assertWorkspaceTypeAccess(workspaceId, user) {
  if (!workspaceId) {
    if (user.role.code !== "ADMIN") {
      throw new AppError("Chỉ admin hệ thống mới có quyền quản lý loại yêu cầu chung", 403);
    }

    return null;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: true },
  });

  if (!workspace || !workspace.isActive) {
    throw new AppError("Không tìm thấy workspace", 404);
  }

  const membership = workspace.members.find((member) => member.userId === user.id && member.status === "ACTIVE");

  if (workspace.createdById !== user.id && membership?.role !== WORKSPACE_ADMIN) {
    throw new AppError("Chỉ admin workspace mới có quyền quản lý loại yêu cầu của workspace", 403);
  }

  return workspace;
}

async function assertCanManageType(type, user) {
  if (!type.workspaceId) {
    if (user.role.code !== "ADMIN") {
      throw new AppError("Chỉ admin hệ thống mới có quyền sửa loại yêu cầu chung", 403);
    }

    return;
  }

  await assertWorkspaceTypeAccess(type.workspaceId, user);
}

export async function listRequestTypes(req, res, next) {
  try {
    const includeInactive = ["1", "true", "yes"].includes(String(req.query.includeInactive || "").toLowerCase());
    const workspaceId = req.query.workspaceId ? Number(req.query.workspaceId) : null;
    const where = includeInactive ? {} : { isActive: true };

    if (req.query.workspaceId) {
      if (!Number.isInteger(workspaceId)) {
        throw new AppError("Workspace không hợp lệ", 422);
      }

      where.OR = [{ workspaceId: null }, { workspaceId }];
    }

    const types = await prisma.requestType.findMany({
      where,
      include: { defaultPriority: true, workspace: { select: { id: true, name: true } } },
      orderBy: [{ workspaceId: "asc" }, { name: "asc" }],
    });

    return ok(res, types);
  } catch (error) {
    next(error);
  }
}

export async function createRequestType(req, res, next) {
  try {
    const { name, code, description, defaultPriorityId, workspaceId } = req.body;
    const normalizedWorkspaceId = workspaceId ? Number(workspaceId) : null;

    if (workspaceId && !Number.isInteger(normalizedWorkspaceId)) {
      throw new AppError("Workspace không hợp lệ", 422);
    }

    await assertWorkspaceTypeAccess(normalizedWorkspaceId, req.user);

    const normalizedName = String(name || "").trim();
    const normalizedCode = String(code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    if (!normalizedName || !normalizedCode) {
      throw new AppError("Tên và mã loại yêu cầu là bắt buộc", 422);
    }

    const existed = await prisma.requestType.findUnique({
      where: { code: normalizedCode },
    });

    if (existed) {
      throw new AppError("Mã loại yêu cầu đã tồn tại", 409);
    }

    const type = await prisma.requestType.create({
      data: {
        name: normalizedName,
        code: normalizedCode,
        description: description ? String(description).trim() : null,
        workspaceId: normalizedWorkspaceId,
        defaultPriorityId: defaultPriorityId ? Number(defaultPriorityId) : null,
      },
      include: { defaultPriority: true, workspace: { select: { id: true, name: true } } },
    });

    return created(res, type);
  } catch (error) {
    next(error);
  }
}

export async function updateRequestType(req, res, next) {
  try {
    const { name, description, defaultPriorityId } = req.body;
    const normalizedName = String(name || "").trim();

    if (!normalizedName) {
      throw new AppError("Tên loại yêu cầu là bắt buộc", 422);
    }

    const currentType = await prisma.requestType.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!currentType) {
      throw new AppError("Không tìm thấy loại yêu cầu", 404);
    }

    await assertCanManageType(currentType, req.user);

    const type = await prisma.requestType.update({
      where: { id: currentType.id },
      data: {
        name: normalizedName,
        description: description ? String(description).trim() : null,
        defaultPriorityId: defaultPriorityId ? Number(defaultPriorityId) : null,
      },
      include: { defaultPriority: true, workspace: { select: { id: true, name: true } } },
    });

    return ok(res, type, "Cập nhật loại yêu cầu thành công");
  } catch (error) {
    next(error);
  }
}

export async function updateRequestTypeStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const currentType = await prisma.requestType.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!currentType) {
      throw new AppError("Không tìm thấy loại yêu cầu", 404);
    }

    await assertCanManageType(currentType, req.user);

    const type = await prisma.requestType.update({
      where: { id: currentType.id },
      data: { isActive: Boolean(isActive) },
      include: { defaultPriority: true, workspace: { select: { id: true, name: true } } },
    });

    return ok(res, type, "Cập nhật trạng thái loại yêu cầu thành công");
  } catch (error) {
    next(error);
  }
}
