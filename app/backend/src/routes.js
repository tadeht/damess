import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { departmentRouter } from "./modules/departments/department.routes.js";
import { friendRouter } from "./modules/friends/friend.routes.js";
import { requestTypeRouter } from "./modules/request-types/request-type.routes.js";
import { requestRouter } from "./modules/requests/request.routes.js";
import { notificationRouter } from "./modules/notifications/notification.routes.js";
import { projectRouter } from "./modules/projects/project.routes.js";
import { ruleRouter } from "./modules/rules/rule.routes.js";
import { userRouter } from "./modules/users/user.routes.js";
import { workspaceRouter } from "./modules/workspaces/workspace.routes.js";

export const routes = Router();

routes.use("/auth", authRouter);
routes.use("/catalog", catalogRouter);
routes.use("/users", userRouter);
routes.use("/departments", departmentRouter);
routes.use("/friends", friendRouter);
routes.use("/request-types", requestTypeRouter);
routes.use("/requests", requestRouter);
routes.use("/notifications", notificationRouter);
routes.use("/projects", projectRouter);
routes.use("/rules", ruleRouter);
routes.use("/dashboard", dashboardRouter);
routes.use("/workspaces", workspaceRouter);
