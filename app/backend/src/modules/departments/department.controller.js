import { prisma } from "../../config/prisma.js";
import { created, ok } from "../../utils/api-response.js";
import { AppError } from "../../utils/errors.js";

const departmentStatuses = new Set(["DRAFT", "ACTIVE", "SUSPENDED"]);

function normalizeDepartmentStatus(status) {
  if (!status) return undefined;
  const normalized = String(status).toUpperCase();
  if (!departmentStatuses.has(normalized)) {
    throw new AppError("Trạng thái bộ phận không hợp lệ", 422);
  }
  return normalized;
}

function isActiveByStatus(status) {
  return status === "ACTIVE";
}

export async function listDepartments(req, res, next) {
  try {
    const departments = await prisma.department.findMany({
      orderBy: [
        { status: "asc" },
        { name: "asc" },
      ],
    });

    return ok(res, departments);
  } catch (error) {
    next(error);
  }
}

export async function getDepartment(req, res, next) {
  try {
    const department = await prisma.department.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!department) {
      throw new AppError("Không tìm thấy bộ phận", 404);
    }

    return ok(res, department);
  } catch (error) {
    next(error);
  }
}

export async function createDepartment(req, res, next) {
  try {
    const { name, code, description, managerId } = req.body;

    if (!name || !code) {
      throw new AppError("Tên và mã bộ phận là bắt buộc", 422);
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        description,
        managerId: managerId ? Number(managerId) : null,
        status: "DRAFT",
        isActive: false,
      },
    });

    return created(res, department);
  } catch (error) {
    next(error);
  }
}

export async function updateDepartment(req, res, next) {
  try {
    const { name, code, description, managerId, status } = req.body;
    const nextStatus = normalizeDepartmentStatus(status);
    const department = await prisma.department.update({
      where: { id: Number(req.params.id) },
      data: {
        name,
        code,
        description,
        managerId: managerId ? Number(managerId) : null,
        status: nextStatus,
        isActive: nextStatus ? isActiveByStatus(nextStatus) : undefined,
      },
    });

    return ok(res, department, "Cập nhật bộ phận thành công");
  } catch (error) {
    next(error);
  }
}

export async function updateDepartmentStatus(req, res, next) {
  try {
    const nextStatus = req.body.status
      ? normalizeDepartmentStatus(req.body.status)
      : (req.body.isActive ? "ACTIVE" : "SUSPENDED");

    const department = await prisma.department.update({
      where: { id: Number(req.params.id) },
      data: {
        status: nextStatus,
        isActive: isActiveByStatus(nextStatus),
      },
    });

    return ok(res, department, "Cập nhật trạng thái bộ phận thành công");
  } catch (error) {
    next(error);
  }
}

export async function deleteDepartment(req, res, next) {
  try {
    const id = Number(req.params.id);
    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new AppError("Không tìm thấy bộ phận", 404);
    }

    if (department.status !== "SUSPENDED") {
      const suspended = await prisma.department.update({
        where: { id },
        data: {
          status: "SUSPENDED",
          isActive: false,
        },
      });

      return ok(res, suspended, "Bộ phận đã được chuyển sang trạng thái Tạm ngưng.");
    }

    await prisma.$transaction([
      prisma.user.updateMany({
        where: { departmentId: id },
        data: { departmentId: null },
      }),
      prisma.request.updateMany({
        where: { assignedDepartmentId: id },
        data: { assignedDepartmentId: null },
      }),
      prisma.department.delete({
        where: { id },
      }),
    ]);

    return ok(res, null, "Đã xóa vĩnh viễn bộ phận khỏi danh sách.");
  } catch (error) {
    next(error);
  }
}
