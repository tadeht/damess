import { prisma } from "../../config/prisma.js";
import { ok } from "../../utils/api-response.js";
import { AppError } from "../../utils/errors.js";
import { getOrCreateNotificationSettings } from "./notification.service.js";

export async function listNotifications(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        readAt: null,
      },
    });

    return ok(res, { notifications, unreadCount });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      throw new AppError("Thông báo không hợp lệ", 422);
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!notification) {
      throw new AppError("Không tìm thấy thông báo", 404);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        readAt: new Date(),
      },
    });

    return ok(res, updated, "Đã đánh dấu thông báo là đã đọc.");
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return ok(res, null, "Đã đánh dấu tất cả thông báo là đã đọc.");
  } catch (error) {
    next(error);
  }
}

export async function markMessageNotificationsRead(req, res, next) {
  try {
    const friendId = Number(req.body.friendId);
    const link = Number.isInteger(friendId) ? `/workspaces?chat=${friendId}` : undefined;

    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        type: "MESSAGE",
        readAt: null,
        link,
      },
      data: {
        readAt: new Date(),
      },
    });

    return ok(res, null, "Đã đánh dấu thông báo tin nhắn là đã đọc.");
  } catch (error) {
    next(error);
  }
}

export async function getNotificationSettings(req, res, next) {
  try {
    const settings = await getOrCreateNotificationSettings(req.user.id);
    return ok(res, settings);
  } catch (error) {
    next(error);
  }
}

export async function updateNotificationSettings(req, res, next) {
  try {
    const { inAppEnabled, emailEnabled } = req.body;
    const current = await getOrCreateNotificationSettings(req.user.id);

    const settings = await prisma.notificationSettings.update({
      where: { id: current.id },
      data: {
        inAppEnabled: typeof inAppEnabled === "boolean" ? inAppEnabled : undefined,
        emailEnabled: typeof emailEnabled === "boolean" ? emailEnabled : undefined,
      },
    });

    return ok(res, settings, "Cập nhật cấu hình thông báo thành công.");
  } catch (error) {
    next(error);
  }
}
