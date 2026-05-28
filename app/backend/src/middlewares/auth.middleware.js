import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/errors.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new AppError("Bạn cần đăng nhập để sử dụng chức năng này", 401);
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError("Tài khoản không tồn tại hoặc đã bị khóa", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(...roleCodes) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Bạn cần đăng nhập để sử dụng chức năng này", 401));
    }

    if (!roleCodes.includes(req.user.role.code)) {
      return next(new AppError("Bạn không có quyền thực hiện thao tác này", 403));
    }

    next();
  };
}
