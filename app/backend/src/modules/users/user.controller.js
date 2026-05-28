import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";
import { created, ok } from "../../utils/api-response.js";
import { AppError } from "../../utils/errors.js";
import { createUniqueUsername } from "../../utils/username.js";

function sanitizeUser(user) {
  const { passwordHash, emailVerificationToken, passwordResetCodeHash, passwordResetExpiresAt, ...safeUser } = user;
  return safeUser;
}

const include = {
  role: true,
  department: true,
};

export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      include,
      orderBy: { createdAt: "desc" },
    });

    return ok(res, users.map(sanitizeUser));
  } catch (error) {
    next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      include,
    });

    if (!user) {
      throw new AppError("Không tìm thấy người dùng", 404);
    }

    return ok(res, sanitizeUser(user));
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { fullName, email, password, phone, roleId, departmentId } = req.body;

    if (!fullName || !email || !password || !roleId) {
      throw new AppError("Họ tên, email, mật khẩu và vai trò là bắt buộc", 422);
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    const username = await createUniqueUsername({ fullName, email: normalizedEmail });
    const user = await prisma.user.create({
      data: {
        fullName,
        username,
        email: normalizedEmail,
        passwordHash,
        phone,
        roleId: Number(roleId),
        departmentId: departmentId ? Number(departmentId) : null,
      },
      include,
    });

    return created(res, sanitizeUser(user));
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { fullName, phone, roleId, departmentId } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: {
        fullName,
        phone,
        roleId: roleId ? Number(roleId) : undefined,
        departmentId: departmentId ? Number(departmentId) : null,
      },
      include,
    });

    return ok(res, sanitizeUser(user), "Cập nhật người dùng thành công");
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { isActive: Boolean(isActive) },
      include,
    });

    return ok(res, sanitizeUser(user), "Cập nhật trạng thái người dùng thành công");
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (id === req.user.id) {
      throw new AppError("Bạn không thể xóa tài khoản đang đăng nhập", 422);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include,
    });

    if (!user) {
      throw new AppError("Không tìm thấy người dùng", 404);
    }

    const relatedCount = await prisma.$transaction([
      prisma.request.count({
        where: {
          OR: [
            { createdById: id },
            { assignedToId: id },
          ],
        },
      }),
      prisma.requestComment.count({ where: { userId: id } }),
      prisma.requestHistory.count({ where: { actorId: id } }),
      prisma.department.count({ where: { managerId: id } }),
    ]);

    const hasRelatedData = relatedCount.some((count) => count > 0);

    if (hasRelatedData) {
      const locked = await prisma.user.update({
        where: { id },
        data: { isActive: false },
        include,
      });

      return ok(res, sanitizeUser(locked), "Tài khoản có dữ liệu liên quan nên đã được khóa thay vì xóa.");
    }

    await prisma.user.delete({
      where: { id },
    });

    return ok(res, null, "Đã xóa tài khoản");
  } catch (error) {
    next(error);
  }
}
