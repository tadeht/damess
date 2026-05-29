import { prisma } from "../../config/prisma.js";
import { ok } from "../../utils/api-response.js";
import { AppError } from "../../utils/errors.js";
import { normalizeUsername } from "../../utils/username.js";
import { createUserNotification } from "../notifications/notification.service.js";
import TrackingService from "../../lib/tracking.js";

const PENDING = "PENDING";
const ACCEPTED = "ACCEPTED";
const DECLINED = "DECLINED";

const userSelect = {
  id: true,
  fullName: true,
  username: true,
  email: true,
          avatarData: true,
};

function getFriendPair(userId, friendId) {
  return userId < friendId
    ? { userAId: userId, userBId: friendId }
    : { userAId: friendId, userBId: userId };
}

function sanitizeFriendship(friendship, currentUserId) {
  const friend = friendship.userAId === currentUserId ? friendship.userB : friendship.userA;

  return {
    id: friendship.id,
    createdAt: friendship.createdAt,
    friend,
  };
}

async function enrichFriendship(friendship, currentUserId) {
  const friendItem = sanitizeFriendship(friendship, currentUserId);
  const friendId = friendItem.friend.id;

  const [latestMessage, unreadCount] = await prisma.$transaction([
    prisma.directMessage.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: friendId },
          { senderId: friendId, receiverId: currentUserId },
        ],
      },
      include: {
        sender: { select: userSelect },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.directMessage.count({
      where: {
        senderId: friendId,
        receiverId: currentUserId,
        readAt: null,
      },
    }),
  ]);

  // Gắn trạng thái online từ TrackingService
  const status = TrackingService.getStatus(friendId);
  friendItem.friend = {
    ...friendItem.friend,
    isOnline: status.isOnline,
    lastActiveAt: status.lastActiveAt,
  };

  return {
    ...friendItem,
    latestMessage,
    unreadCount,
  };
}

export async function listFriends(req, res, next) {
  try {
    const [friendships, incomingRequests, outgoingRequests] = await prisma.$transaction([
      prisma.friendship.findMany({
        where: {
          OR: [
            { userAId: req.user.id },
            { userBId: req.user.id },
          ],
        },
        include: {
          userA: { select: userSelect },
          userB: { select: userSelect },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.friendRequest.findMany({
        where: {
          addresseeId: req.user.id,
          status: PENDING,
        },
        include: {
          requester: { select: userSelect },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.friendRequest.findMany({
        where: {
          requesterId: req.user.id,
          status: PENDING,
        },
        include: {
          addressee: { select: userSelect },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const friends = await Promise.all(friendships.map((friendship) => enrichFriendship(friendship, req.user.id)));
    friends.sort((first, second) => {
      const firstTime = new Date(first.latestMessage?.createdAt || first.createdAt).getTime();
      const secondTime = new Date(second.latestMessage?.createdAt || second.createdAt).getTime();
      return secondTime - firstTime;
    });

    return ok(res, {
      friends,
      incomingRequests,
      outgoingRequests,
    });
  } catch (error) {
    next(error);
  }
}

export async function findUserByUsername(req, res, next) {
  try {
    const rawInput = req.query.username;

    if (!rawInput) {
      throw new AppError("Từ khóa tìm kiếm là bắt buộc", 422);
    }

    const username = normalizeUsername(rawInput);
    const isIdSearch = /^\\d+$/.test(rawInput);

    let whereClause;
    if (isIdSearch) {
      whereClause = { id: parseInt(rawInput, 10) };
    } else if (rawInput.includes('@')) {
      whereClause = { email: rawInput.trim().toLowerCase() };
    } else {
      whereClause = { username };
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
      select: userSelect,
    });

    if (!user || user.id === req.user.id) {
      throw new AppError("Không tìm thấy tài khoản phù hợp", 404);
    }

    const pair = getFriendPair(req.user.id, user.id);
    const [friendship, sentRequest, receivedRequest] = await prisma.$transaction([
      prisma.friendship.findUnique({
        where: { userAId_userBId: pair },
      }),
      prisma.friendRequest.findUnique({
        where: {
          requesterId_addresseeId: {
            requesterId: req.user.id,
            addresseeId: user.id,
          },
        },
      }),
      prisma.friendRequest.findUnique({
        where: {
          requesterId_addresseeId: {
            requesterId: user.id,
            addresseeId: req.user.id,
          },
        },
      }),
    ]);

    return ok(res, {
      user,
      relation: {
        isFriend: Boolean(friendship),
        outgoingRequest: sentRequest,
        incomingRequest: receivedRequest,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function sendFriendRequest(req, res, next) {
  try {
    const username = normalizeUsername(req.body.username);

    if (!username) {
      throw new AppError("Username là bắt buộc", 422);
    }

    const addressee = await prisma.user.findUnique({
      where: { username },
      select: userSelect,
    });

    if (!addressee || addressee.id === req.user.id) {
      throw new AppError("Không tìm thấy tài khoản để kết bạn", 404);
    }

    const pair = getFriendPair(req.user.id, addressee.id);
    const friendship = await prisma.friendship.findUnique({
      where: { userAId_userBId: pair },
    });

    if (friendship) {
      throw new AppError("Hai tài khoản đã là bạn bè", 409);
    }

    const reverseRequest = await prisma.friendRequest.findUnique({
      where: {
        requesterId_addresseeId: {
          requesterId: addressee.id,
          addresseeId: req.user.id,
        },
      },
    });

    if (reverseRequest?.status === PENDING) {
      return acceptFriendRequestById(reverseRequest.id, req, res, next);
    }

    const request = await prisma.friendRequest.upsert({
      where: {
        requesterId_addresseeId: {
          requesterId: req.user.id,
          addresseeId: addressee.id,
        },
      },
      create: {
        requesterId: req.user.id,
        addresseeId: addressee.id,
      },
      update: {
        status: PENDING,
      },
      include: {
        addressee: { select: userSelect },
      },
    });

    await createUserNotification({
      userId: addressee.id,
      title: "Lời mời kết bạn mới",
      content: `${req.user.fullName} (@${req.user.username}) đã gửi lời mời kết bạn.`,
      type: "FRIEND",
      link: "/workspaces?friends=1",
    });

    return ok(res, request, "Đã gửi lời mời kết bạn.");
  } catch (error) {
    next(error);
  }
}

async function acceptFriendRequestById(requestId, req, res, next) {
  try {
    const request = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        addresseeId: req.user.id,
        status: PENDING,
      },
      include: {
        requester: { select: userSelect },
      },
    });

    if (!request) {
      throw new AppError("Không tìm thấy lời mời kết bạn", 404);
    }

    const pair = getFriendPair(request.requesterId, request.addresseeId);
    const friendship = await prisma.$transaction(async (tx) => {
      await tx.friendRequest.update({
        where: { id: request.id },
        data: { status: ACCEPTED },
      });

      return tx.friendship.upsert({
        where: { userAId_userBId: pair },
        create: pair,
        update: {},
        include: {
          userA: { select: userSelect },
          userB: { select: userSelect },
        },
      });
    });

    await createUserNotification({
      userId: request.requesterId,
      title: "Lời mời kết bạn đã được chấp nhận",
      content: `${req.user.fullName} (@${req.user.username}) đã chấp nhận lời mời kết bạn.`,
      type: "FRIEND",
      link: `/workspaces?chat=${req.user.id}`,
    });

    return ok(res, sanitizeFriendship(friendship, req.user.id), "Đã chấp nhận lời mời kết bạn.");
  } catch (error) {
    next(error);
  }
}

export async function acceptFriendRequest(req, res, next) {
  return acceptFriendRequestById(Number(req.params.id), req, res, next);
}

export async function declineFriendRequest(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      throw new AppError("Lời mời kết bạn không hợp lệ", 422);
    }

    const request = await prisma.friendRequest.findFirst({
      where: {
        id,
        addresseeId: req.user.id,
        status: PENDING,
      },
    });

    if (!request) {
      throw new AppError("Không tìm thấy lời mời kết bạn", 404);
    }

    await prisma.friendRequest.update({
      where: { id },
      data: { status: DECLINED },
    });

    return ok(res, null, "Đã từ chối lời mời kết bạn.");
  } catch (error) {
    next(error);
  }
}

export async function removeFriend(req, res, next) {
  try {
    const friendId = Number(req.params.id);

    if (!Number.isInteger(friendId) || friendId === req.user.id) {
      throw new AppError("Tài khoản bạn bè không hợp lệ", 422);
    }

    const pair = getFriendPair(req.user.id, friendId);
    const friendship = await prisma.friendship.findUnique({
      where: { userAId_userBId: pair },
    });

    if (!friendship) {
      throw new AppError("Hai tài khoản chưa là bạn bè", 404);
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return ok(res, null, "Đã xoá bạn bè.");
  } catch (error) {
    next(error);
  }
}

export async function listDirectMessages(req, res, next) {
  try {
    const friendId = Number(req.params.friendId);

    if (!Number.isInteger(friendId) || friendId === req.user.id) {
      throw new AppError("Tài khoản bạn bè không hợp lệ", 422);
    }

    const pair = getFriendPair(req.user.id, friendId);
    const friendship = await prisma.friendship.findUnique({
      where: { userAId_userBId: pair },
    });

    if (!friendship) {
      throw new AppError("Bạn chỉ có thể nhắn tin với tài khoản đã kết bạn", 403);
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: friendId },
          { senderId: friendId, receiverId: req.user.id },
        ],
      },
      include: {
        sender: { select: userSelect },
        receiver: { select: userSelect },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    await prisma.directMessage.updateMany({
      where: {
        senderId: friendId,
        receiverId: req.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return ok(res, messages);
  } catch (error) {
    next(error);
  }
}

export async function sendDirectMessage(req, res, next) {
  try {
    const friendId = Number(req.params.friendId);
    const content = String(req.body.content || "").trim();
    const attachment = req.body.attachment || null;

    if (!Number.isInteger(friendId) || friendId === req.user.id) {
      throw new AppError("Tài khoản bạn bè không hợp lệ", 422);
    }

    if (!content && !attachment) {
      throw new AppError("Nội dung tin nhắn hoặc file đính kèm là bắt buộc", 422);
    }

    if (attachment && !["IMAGE", "FILE"].includes(attachment.type)) {
      throw new AppError("Loại file đính kèm không hợp lệ", 422);
    }

    const pair = getFriendPair(req.user.id, friendId);
    const friendship = await prisma.friendship.findUnique({
      where: { userAId_userBId: pair },
    });

    if (!friendship) {
      throw new AppError("Bạn chỉ có thể nhắn tin với tài khoản đã kết bạn", 403);
    }

    const message = await prisma.directMessage.create({
      data: {
        senderId: req.user.id,
        receiverId: friendId,
        content,
        attachmentType: attachment?.type || null,
        attachmentName: attachment?.name ? String(attachment.name).slice(0, 180) : null,
        attachmentMime: attachment?.mime ? String(attachment.mime).slice(0, 120) : null,
        attachmentData: attachment?.data || null,
      },
      include: {
        sender: { select: userSelect },
        receiver: { select: userSelect },
      },
    });

    await createUserNotification({
      userId: friendId,
      title: "Tin nhắn mới",
      content: `@${req.user.username} đã nhắn cho bạn.`,
      type: "MESSAGE",
      link: `/workspaces?chat=${req.user.id}`,
    });

    return ok(res, message, "Đã gửi tin nhắn.");
  } catch (error) {
    next(error);
  }
}
