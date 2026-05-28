import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  archiveProjectPage,
  closeProject,
  createProject,
  createProjectPage,
  createProjectWorkLog,
  createProjectWorkItem,
  extendProject,
  listProjectPages,
  listProjectWorkItems,
  listProjects,
  updateProject,
  updateProjectPage,
  updateProjectStatus,
  updateProjectWorkItem,
  updateProjectWorkItemStatus,
} from "./project.controller.js";

export const projectRouter = Router();

projectRouter.use(requireAuth);

projectRouter.get("/", listProjects);
projectRouter.post("/", createProject);
projectRouter.patch("/:id/extend", extendProject);
projectRouter.patch("/:id/close", closeProject);
projectRouter.get("/:id/work-items", listProjectWorkItems);
projectRouter.post("/:id/work-items", createProjectWorkItem);
projectRouter.put("/:id/work-items/:itemId", updateProjectWorkItem);
projectRouter.patch("/:id/work-items/:itemId/status", updateProjectWorkItemStatus);
projectRouter.post("/:id/work-items/:itemId/work-logs", createProjectWorkLog);
projectRouter.get("/:id/pages", listProjectPages);
projectRouter.post("/:id/pages", createProjectPage);
projectRouter.put("/:id/pages/:pageId", updateProjectPage);
projectRouter.patch("/:id/pages/:pageId/archive", archiveProjectPage);
projectRouter.put("/:id", updateProject);
projectRouter.patch("/:id/status", updateProjectStatus);
