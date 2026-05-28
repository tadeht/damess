import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getNotificationSettings, listNotifications, markAllNotificationsRead, markMessageNotificationsRead, markNotificationRead, updateNotificationSettings } from "./notification.controller.js";

export const notificationRouter = Router();

notificationRouter.use(requireAuth);
notificationRouter.get("/", listNotifications);
notificationRouter.patch("/read-all", markAllNotificationsRead);
notificationRouter.patch("/messages/read", markMessageNotificationsRead);
notificationRouter.get("/settings", getNotificationSettings);
notificationRouter.patch("/settings", updateNotificationSettings);
notificationRouter.patch("/:id/read", markNotificationRead);
