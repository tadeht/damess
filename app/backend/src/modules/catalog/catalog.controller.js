import { prisma } from "../../config/prisma.js";
import { ok } from "../../utils/api-response.js";

export async function listPriorities(req, res, next) {
  try {
    const priorities = await prisma.priority.findMany({
      orderBy: { level: "asc" },
    });

    return ok(res, priorities);
  } catch (error) {
    next(error);
  }
}

export async function listRoles(req, res, next) {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { id: "asc" },
    });

    return ok(res, roles);
  } catch (error) {
    next(error);
  }
}

export async function listStatuses(req, res, next) {
  try {
    const statuses = await prisma.status.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return ok(res, statuses);
  } catch (error) {
    next(error);
  }
}
