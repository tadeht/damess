import { prisma } from "../../config/prisma.js";
import { sendNotificationEmail } from "../../utils/email.js";

export async function getOrCreateNotificationSettings(userId) {
  const existed = await prisma.notificationSettings.findUnique({
    where: { userId },
  });

  if (existed) {
    return existed;
  }

  return prisma.notificationSettings.create({
    data: {
      userId,
    },
  });
}

export async function createUserNotification({ userId, title, content, type = "SYSTEM", link = null, emailImportant = false }) {
  const settings = await getOrCreateNotificationSettings(userId);
  let notification = null;

  if (settings.inAppEnabled) {
    notification = await prisma.notification.create({
      data: {
        userId,
        title,
        content,
        type,
        channel: "IN_APP",
        link,
      },
    });
  }

  if (settings.emailEnabled && emailImportant) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        email: true,
      },
    });

    if (user?.email) {
      try {
        await sendNotificationEmail({
          to: user.email,
          fullName: user.fullName,
          title,
          content,
          link,
        });
      } catch {
        // Email notification must not block the main business action.
      }
    }
  }

  return notification;
}
