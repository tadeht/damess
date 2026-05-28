import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { listPriorities, listRoles, listStatuses } from "./catalog.controller.js";

export const catalogRouter = Router();

catalogRouter.use(requireAuth);

catalogRouter.get("/priorities", listPriorities);
catalogRouter.get("/roles", listRoles);
catalogRouter.get("/statuses", listStatuses);
