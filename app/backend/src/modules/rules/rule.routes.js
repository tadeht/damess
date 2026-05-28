import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.middleware.js";
import { createRule, listRules, updateRule, updateRuleStatus } from "./rule.controller.js";

export const ruleRouter = Router();

ruleRouter.use(requireAuth);

ruleRouter.get("/", listRules);
ruleRouter.post("/", requireRoles("ADMIN"), createRule);
ruleRouter.put("/:id", requireRoles("ADMIN"), updateRule);
ruleRouter.patch("/:id/status", requireRoles("ADMIN"), updateRuleStatus);
