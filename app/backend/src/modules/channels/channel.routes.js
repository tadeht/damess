import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  createChannel,
  createMessage,
  deleteChannel,
  listChannels,
  listMessages,
  markChannelRead,
  updateChannel,
} from "./channel.controller.js";

// Mount với mergeParams để đọc :workspaceId từ parent router.
export const channelRouter = Router({ mergeParams: true });

channelRouter.use(requireAuth);

// Channel CRUD
channelRouter.get("/", listChannels);
channelRouter.post("/", createChannel);
channelRouter.patch("/:channelId", updateChannel);
channelRouter.delete("/:channelId", deleteChannel);

// Messages trong channel
channelRouter.get("/:channelId/messages", listMessages);
channelRouter.post("/:channelId/messages", createMessage);
channelRouter.post("/:channelId/read", markChannelRead);
