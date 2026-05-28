import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { channelRouter } from "../channels/channel.routes.js";
import { createWorkspace, deleteWorkspace, joinWorkspace, leaveWorkspace, listWorkspaceActivities, listWorkspaces, previewWorkspaceInvite, removeWorkspaceMember, updateWorkspaceMemberRole, updateWorkspaceSettings } from "./workspace.controller.js";

export const workspaceRouter = Router();

workspaceRouter.use(requireAuth);
workspaceRouter.get("/", listWorkspaces);
workspaceRouter.get("/invite/:code", previewWorkspaceInvite);
workspaceRouter.get("/:id/activities", listWorkspaceActivities);
workspaceRouter.post("/", createWorkspace);
workspaceRouter.post("/join", joinWorkspace);
workspaceRouter.patch("/:id/settings", updateWorkspaceSettings);
workspaceRouter.patch("/:id/members/:memberId/role", updateWorkspaceMemberRole);
workspaceRouter.delete("/:id/members/me", leaveWorkspace);
workspaceRouter.delete("/:id/members/:memberId", removeWorkspaceMember);
workspaceRouter.delete("/:id", deleteWorkspace);

// Mount channel router. Param mapping: :id (workspace) → :workspaceId (channel).
workspaceRouter.use("/:workspaceId/channels", channelRouter);
