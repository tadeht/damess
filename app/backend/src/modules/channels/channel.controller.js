import { prisma } from "../../config/prisma.js";
import { created, ok } from "../../utils/api-response.js";
import { AppError } from "../../utils/errors.js";

const WORKSPACE_ADMIN = "ADMIN";
const MAX_ATTACHMENT_DATA_LENGTH = 3_000_000;

// ─── Helpers ──────────────────────────────────────────────────────────────

async function getActiveMembership(workspaceId, userId) {
  if (!Number.isInteger(workspaceId) || !Number.isInteger(userId)) return null;

  return prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      status: "ACTIVE",
      workspace: { isActive: true },
    },
  });
}

async function assertWorkspaceMember(workspaceId, userId) {
  const membership = await getActiveMembership(workspaceId, userId);

  if (!membership) {
    throw new AppError("Bạn không phải thành viên đang hoạt động của workspace này", 403);
  }

  return membership;
}

async function assertWorkspaceAdmin(workspaceId, userId) {
  const membership = await assertWorkspaceMember(workspaceId, userId);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { createdById: true } });
  const isCreator = workspace?.createdById === userId;

  if (membership.role !== WORKSPACE_ADMIN && !isCreator) {
    throw new AppError("Chỉ admin workspace mới có quyền quản lý kênh chat", 403);
  }

  return membership;
}

function normalizeChannelName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

const messageInclude = {
  sender: {
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
    },
  },
};

// ─── Channel CRUD ─────────────────────────────────────────────────────────

export async function listChannels(req, res, next) {
  try {
    const workspaceId = Number(req.params.workspaceId);
    if (!Number.isInteger(workspaceId)) {
      throw new AppError("Workspace không hợp lệ", 422);
    }

    await assertWorkspaceMember(workspaceId, req.user.id);

    const channels = await prisma.workspaceChannel.findMany({
      where: { workspaceId, isArchived: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: { messages: { where: { deletedAt: null } } },
        },
      },
    });

    // Lấy lastReadMessageId của user trong từng channel để tính unread.
    const reads = await prisma.workspaceMessageRead.findMany({
      where: {
        userId: req.user.id,
        channelId: { in: channels.map((c) => c.id) },
      },
      select: { channelId: true, lastReadMessageId: true },
    });
    const readByChannel = Object.fromEntries(reads.map((r) => [r.channelId, r.lastReadMessageId]));

    // Đếm unread theo channel.
    const unreadCounts = await Promise.all(
      channels.map(async (channel) => {
        const lastRead = readByChannel[channel.id] || 0;
        const count = await prisma.workspaceMessage.count({
          where: {
            channelId: channel.id,
            deletedAt: null,
            id: { gt: lastRead },
            senderId: { not: req.user.id },
          },
        });
        return [channel.id, count];
      }),
    );
    const unreadByChannel = Object.fromEntries(unreadCounts);

    return ok(res, channels.map((channel) => ({
      ...channel,
      messageCount: channel._count?.messages || 0,
      unreadCount: unreadByChannel[channel.id] || 0,
    })));
  } catch (error) {
    next(error);
  }
}

export async function createChannel(req, res, next) {
  try {
    const workspaceId = Number(req.params.workspaceId);
    if (!Number.isInteger(workspaceId)) {
      throw new AppError("Workspace không hợp lệ", 422);
    }

    await assertWorkspaceAdmin(workspaceId, req.user.id);

    const name = normalizeChannelName(req.body.name);
    if (!name) {
      throw new AppError("Tên kênh phải từ 1 đến 32 ký tự, chỉ chứa chữ thường, số và dấu gạch", 422);
    }

    const topic = req.body.topic ? String(req.body.topic).trim().slice(0, 280) : null;
    const type = String(req.body.type || "TEXT").toUpperCase();

    if (!["TEXT", "VOICE"].includes(type)) {
      throw new AppError("Loại kênh không hợp lệ", 422);
    }

    const existed = await prisma.workspaceChannel.findUnique({
      where: { workspaceId_name: { workspaceId, name } },
      select: { id: true },
    });

    if (existed) {
      throw new AppError("Tên kênh đã tồn tại trong workspace này", 409);
    }

    const lastChannel = await prisma.workspaceChannel.findFirst({
      where: { workspaceId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const channel = await prisma.workspaceChannel.create({
      data: {
        workspaceId,
        name,
        topic,
        type,
        sortOrder: (lastChannel?.sortOrder || 0) + 1,
        createdById: req.user.id,
      },
    });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId,
        actorId: req.user.id,
        action: "CHANNEL_CREATED",
        title: "Tạo kênh chat mới",
        description: `${req.user.fullName} đã tạo kênh #${channel.name}.`,
        metadata: { channelId: channel.id, channelName: channel.name, channelType: channel.type },
      },
    });

    return created(res, channel, "Tạo kênh thành công.");
  } catch (error) {
    next(error);
  }
}

export async function updateChannel(req, res, next) {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const channelId = Number(req.params.channelId);

    if (!Number.isInteger(workspaceId) || !Number.isInteger(channelId)) {
      throw new AppError("Tham số không hợp lệ", 422);
    }

    await assertWorkspaceAdmin(workspaceId, req.user.id);

    const channel = await prisma.workspaceChannel.findFirst({
      where: { id: channelId, workspaceId },
    });

    if (!channel) {
      throw new AppError("Không tìm thấy kênh", 404);
    }

    const data = {};

    if (req.body.name !== undefined) {
      const name = normalizeChannelName(req.body.name);
      if (!name) {
        throw new AppError("Tên kênh phải từ 1 đến 32 ký tự, chỉ chứa chữ thường, số và dấu gạch", 422);
      }
      if (name !== channel.name) {
        const conflict = await prisma.workspaceChannel.findUnique({
          where: { workspaceId_name: { workspaceId, name } },
          select: { id: true },
        });
        if (conflict) {
          throw new AppError("Tên kênh đã tồn tại trong workspace này", 409);
        }
        data.name = name;
      }
    }

    if (req.body.topic !== undefined) {
      data.topic = req.body.topic ? String(req.body.topic).trim().slice(0, 280) : null;
    }

    if (Object.keys(data).length === 0) {
      return ok(res, channel, "Không có thay đổi.");
    }

    const updated = await prisma.workspaceChannel.update({
      where: { id: channel.id },
      data,
    });

    return ok(res, updated, "Đã cập nhật kênh.");
  } catch (error) {
    next(error);
  }
}

export async function deleteChannel(req, res, next) {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const channelId = Number(req.params.channelId);

    if (!Number.isInteger(workspaceId) || !Number.isInteger(channelId)) {
      throw new AppError("Tham số không hợp lệ", 422);
    }

    await assertWorkspaceAdmin(workspaceId, req.user.id);

    const channel = await prisma.workspaceChannel.findFirst({
      where: { id: channelId, workspaceId },
    });

    if (!channel) {
      throw new AppError("Không tìm thấy kênh", 404);
    }

    if (channel.name === "general") {
      throw new AppError("Không thể xóa kênh #general mặc định", 403);
    }

    await prisma.workspaceChannel.delete({ where: { id: channel.id } });

    await prisma.workspaceActivity.create({
      data: {
        workspaceId,
        actorId: req.user.id,
        action: "CHANNEL_DELETED",
        title: "Xóa kênh chat",
        description: `${req.user.fullName} đã xóa kênh #${channel.name}.`,
        metadata: { channelName: channel.name },
      },
    });

    return ok(res, null, "Đã xóa kênh.");
  } catch (error) {
    next(error);
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────

async function loadChannelOrThrow(workspaceId, channelId, userId) {
  await assertWorkspaceMember(workspaceId, userId);

  const channel = await prisma.workspaceChannel.findFirst({
    where: { id: channelId, workspaceId, isArchived: false },
  });

  if (!channel) {
    throw new AppError("Không tìm thấy kênh", 404);
  }

  return channel;
}

export async function listMessages(req, res, next) {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const channelId = Number(req.params.channelId);

    if (!Number.isInteger(workspaceId) || !Number.isInteger(channelId)) {
      throw new AppError("Tham số không hợp lệ", 422);
    }

    await loadChannelOrThrow(workspaceId, channelId, req.user.id);

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before ? Number(req.query.before) : null;

    const messages = await prisma.workspaceMessage.findMany({
      where: {
        channelId,
        deletedAt: null,
        ...(before ? { id: { lt: before } } : {}),
      },
      include: messageInclude,
      orderBy: { id: "desc" },
      take: limit,
    });

    // Trả ngược lại để frontend không phải reverse.
    return ok(res, messages.reverse());
  } catch (error) {
    next(error);
  }
}

export async function createMessage(req, res, next) {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const channelId = Number(req.params.channelId);

    if (!Number.isInteger(workspaceId) || !Number.isInteger(channelId)) {
      throw new AppError("Tham số không hợp lệ", 422);
    }

    await loadChannelOrThrow(workspaceId, channelId, req.user.id);

    const content = String(req.body.content || "").trim();
    const attachment = req.body.attachment || null;

    if (!content && !attachment) {
      throw new AppError("Nội dung tin nhắn không được để trống", 422);
    }

    if (content.length > 4000) {
      throw new AppError("Tin nhắn tối đa 4000 ký tự", 422);
    }

    const data = {
      channelId,
      senderId: req.user.id,
      content,
    };

    if (attachment) {
      const name = String(attachment.name || "").trim();
      const mime = String(attachment.mime || "application/octet-stream").trim();
      const fileData = String(attachment.data || "");
      const type = String(attachment.type || (mime.startsWith("image/") ? "IMAGE" : "FILE")).trim().toUpperCase();

      if (!name || !fileData) {
        throw new AppError("File đính kèm không hợp lệ", 422);
      }

      if (fileData.length > MAX_ATTACHMENT_DATA_LENGTH) {
        throw new AppError("File đính kèm tối đa khoảng 2MB", 422);
      }

      data.attachmentType = type === "IMAGE" ? "IMAGE" : "FILE";
      data.attachmentName = name;
      data.attachmentMime = mime;
      data.attachmentData = fileData;
    }

    const message = await prisma.workspaceMessage.create({
      data,
      include: messageInclude,
    });

    // Tự đánh dấu đã đọc tin nhắn vừa gửi cho chính người gửi.
    await prisma.workspaceMessageRead.upsert({
      where: { channelId_userId: { channelId, userId: req.user.id } },
      update: { lastReadMessageId: message.id },
      create: { channelId, userId: req.user.id, lastReadMessageId: message.id },
    });

    return created(res, message);
  } catch (error) {
    next(error);
  }
}

export async function markChannelRead(req, res, next) {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const channelId = Number(req.params.channelId);

    if (!Number.isInteger(workspaceId) || !Number.isInteger(channelId)) {
      throw new AppError("Tham số không hợp lệ", 422);
    }

    await loadChannelOrThrow(workspaceId, channelId, req.user.id);

    const lastMessage = await prisma.workspaceMessage.findFirst({
      where: { channelId, deletedAt: null },
      orderBy: { id: "desc" },
      select: { id: true },
    });

    await prisma.workspaceMessageRead.upsert({
      where: { channelId_userId: { channelId, userId: req.user.id } },
      update: { lastReadMessageId: lastMessage?.id || 0 },
      create: { channelId, userId: req.user.id, lastReadMessageId: lastMessage?.id || 0 },
    });

    return ok(res, null, "Đã đánh dấu kênh là đã đọc.");
  } catch (error) {
    next(error);
  }
}
