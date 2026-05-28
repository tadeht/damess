import { Router } from "express";
import { changePassword, checkUsername, login, me, register, requestChangePasswordCode, requestForgotPasswordCode, resendVerificationEmail, resetForgotPassword, updateProfile, updateUsername, verifyChangePasswordCode, verifyEmail, verifyForgotPasswordCode } from "./auth.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.get("/verify-email", verifyEmail);
authRouter.post("/resend-verification", resendVerificationEmail);
authRouter.post("/forgot-password/code", requestForgotPasswordCode);
authRouter.post("/forgot-password/verify-code", verifyForgotPasswordCode);
authRouter.post("/forgot-password/reset", resetForgotPassword);
authRouter.get("/me", requireAuth, me);
authRouter.get("/username/check", requireAuth, checkUsername);
authRouter.patch("/username", requireAuth, updateUsername);
authRouter.patch("/profile", requireAuth, updateProfile);
authRouter.post("/change-password/code", requireAuth, requestChangePasswordCode);
authRouter.post("/change-password/verify-code", requireAuth, verifyChangePasswordCode);
authRouter.post("/change-password", requireAuth, changePassword);
