import { prisma } from "../../config/prisma.js";
import { created, ok } from "../../utils/api-response.js";
import { AppError } from "../../utils/errors.js";

export async function listRules(req, res, next) {
  try {
    const rules = await prisma.processingRule.findMany({
      orderBy: { createdAt: "desc" },
    });

    return ok(res, rules);
  } catch (error) {
    next(error);
  }
}

export async function createRule(req, res, next) {
  try {
    const { name, code, description, scope } = req.body;

    if (!name || !code || !description) {
      throw new AppError("Tên, mã và nội dung quy tắc là bắt buộc", 422);
    }

    const rule = await prisma.processingRule.create({
      data: {
        name,
        code,
        description,
        scope: scope || "GENERAL",
      },
    });

    return created(res, rule, "Tạo quy tắc xử lý thành công");
  } catch (error) {
    next(error);
  }
}

export async function updateRule(req, res, next) {
  try {
    const { name, description, scope } = req.body;
    const rule = await prisma.processingRule.update({
      where: { id: Number(req.params.id) },
      data: {
        name,
        description,
        scope,
      },
    });

    return ok(res, rule, "Cập nhật quy tắc xử lý thành công");
  } catch (error) {
    next(error);
  }
}

export async function updateRuleStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const rule = await prisma.processingRule.update({
      where: { id: Number(req.params.id) },
      data: { isActive: Boolean(isActive) },
    });

    return ok(res, rule, "Cập nhật trạng thái quy tắc thành công");
  } catch (error) {
    next(error);
  }
}
