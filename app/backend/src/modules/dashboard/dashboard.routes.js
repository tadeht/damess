import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { byDepartment, byStatus, summary } from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", summary);
dashboardRouter.get("/by-status", byStatus);
dashboardRouter.get("/by-department", byDepartment);
