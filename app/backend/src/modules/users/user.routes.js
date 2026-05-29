import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.middleware.js";
import { createUser, deleteUser, getUser, listUsers, updateUser, updateUserStatus, pingHeartbeat } from "./user.controller.js";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.post("/heartbeat", pingHeartbeat);

userRouter.get("/", requireRoles("ADMIN"), listUsers);
userRouter.get("/:id", requireRoles("ADMIN"), getUser);
userRouter.post("/", requireRoles("ADMIN"), createUser);
userRouter.put("/:id", requireRoles("ADMIN"), updateUser);
userRouter.patch("/:id/status", requireRoles("ADMIN"), updateUserStatus);
userRouter.delete("/:id", requireRoles("ADMIN"), deleteUser);
