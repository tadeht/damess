import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  addComment,
  assignRequest,
  createRequest,
  getRequest,
  listRequestComments,
  listRequestHistories,
  listRequests,
  selfAssignRequest,
  updateRequest,
  updateRequestStatus,
} from "./request.controller.js";

export const requestRouter = Router();

requestRouter.use(requireAuth);

requestRouter.get("/", listRequests);
requestRouter.post("/", createRequest);
requestRouter.get("/:id", getRequest);
requestRouter.put("/:id", updateRequest);
requestRouter.post("/:id/assign", assignRequest);
requestRouter.post("/:id/self-assign", selfAssignRequest);
requestRouter.post("/:id/status", updateRequestStatus);
requestRouter.post("/:id/comments", addComment);
requestRouter.get("/:id/comments", listRequestComments);
requestRouter.get("/:id/histories", listRequestHistories);
