import { prisma } from "../../config/prisma.js";
import { ok } from "../../utils/api-response.js";

function scopedWhere(user) {
  if (user.role.code === "ADMIN") return {};

  return {
    OR: [
      { createdById: user.id },
      { assignedToId: user.id },
    ],
  };
}

export async function summary(req, res, next) {
  try {
    const where = scopedWhere(req.user);
    const [total, waiting, processing, completed, overdue] = await Promise.all([
      prisma.request.count({ where }),
      prisma.request.count({ where: { ...where, status: { code: "CHO_TIEP_NHAN" } } }),
      prisma.request.count({ where: { ...where, status: { code: "DANG_XU_LY" } } }),
      prisma.request.count({ where: { ...where, status: { code: "HOAN_THANH" } } }),
      prisma.request.count({
        where: {
          ...where,
          status: { code: { not: "HOAN_THANH" } },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return ok(res, {
      total,
      waiting,
      processing,
      completed,
      overdue,
    });
  } catch (error) {
    next(error);
  }
}

export async function byStatus(req, res, next) {
  try {
    const where = scopedWhere(req.user);
    const [statuses, grouped] = await Promise.all([
      prisma.status.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      prisma.request.groupBy({
        by: ["statusId"],
        where,
        _count: { id: true },
      }),
    ]);

    const countByStatusId = Object.fromEntries(grouped.map((item) => [item.statusId, item._count.id]));

    return ok(res, statuses.map((status) => ({
      status: status.name,
      code: status.code,
      count: countByStatusId[status.id] || 0,
    })));
  } catch (error) {
    next(error);
  }
}

export async function byDepartment(req, res, next) {
  try {
    const where = scopedWhere(req.user);
    const [departments, grouped] = await Promise.all([
      prisma.department.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.request.groupBy({
        by: ["assignedDepartmentId"],
        where: {
          ...where,
          assignedDepartmentId: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    const countByDepartmentId = Object.fromEntries(
      grouped.map((item) => [item.assignedDepartmentId, item._count.id])
    );

    return ok(res, departments.map((department) => ({
      department: department.name,
      code: department.code,
      count: countByDepartmentId[department.id] || 0,
    })));
  } catch (error) {
    next(error);
  }
}
