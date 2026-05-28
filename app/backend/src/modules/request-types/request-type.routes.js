import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  createRequestType,
  listRequestTypes,
  updateRequestType,
  updateRequestTypeStatus,
} from "./request-type.controller.js";

export const requestTypeRouter = Router();

requestTypeRouter.use(requireAuth);

requestTypeRouter.get("/", listRequestTypes);
requestTypeRouter.post("/", createRequestType);
requestTypeRouter.put("/:id", updateRequestType);
requestTypeRouter.patch("/:id/status", updateRequestTypeStatus);
