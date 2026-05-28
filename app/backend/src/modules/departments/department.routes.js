import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.middleware.js";
import {
  createDepartment,
  deleteDepartment,
  getDepartment,
  listDepartments,
  updateDepartment,
  updateDepartmentStatus,
} from "./department.controller.js";

export const departmentRouter = Router();

departmentRouter.use(requireAuth);

departmentRouter.get("/", listDepartments);
departmentRouter.get("/:id", getDepartment);
departmentRouter.post("/", requireRoles("ADMIN"), createDepartment);
departmentRouter.put("/:id", requireRoles("ADMIN"), updateDepartment);
departmentRouter.patch("/:id/status", requireRoles("ADMIN"), updateDepartmentStatus);
departmentRouter.delete("/:id", requireRoles("ADMIN"), deleteDepartment);
