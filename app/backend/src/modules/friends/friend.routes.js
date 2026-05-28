import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  acceptFriendRequest,
  declineFriendRequest,
  findUserByUsername,
  listDirectMessages,
  listFriends,
  removeFriend,
  sendDirectMessage,
  sendFriendRequest,
} from "./friend.controller.js";

export const friendRouter = Router();

friendRouter.use(requireAuth);
friendRouter.get("/", listFriends);
friendRouter.get("/search", findUserByUsername);
friendRouter.post("/requests", sendFriendRequest);
friendRouter.post("/requests/:id/accept", acceptFriendRequest);
friendRouter.post("/requests/:id/decline", declineFriendRequest);
friendRouter.delete("/:id", removeFriend);
friendRouter.get("/:friendId/messages", listDirectMessages);
friendRouter.post("/:friendId/messages", sendDirectMessage);
