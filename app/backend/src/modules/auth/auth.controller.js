import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { ok } from "../../utils/api-response.js";
import { sendPasswordChangeCodeEmail, sendPasswordResetCodeEmail, sendVerificationEmail, sendRegistrationCodeEmail } from "../../utils/email.js";
import { AppError } from "../../utils/errors.js";
import { createUniqueUsername, normalizeUsername } from "../../utils/username.js";

const passwordChangeCodes = new Map();
const PASSWORD_CHANGE_CODE_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_CODE_TTL_MS = 10 * 60 * 1000;

const registrationCodes = new Map();
const REGISTRATION_CODE_TTL_MS = 10 * 60 * 1000;

function clearRegistrationCode(email) {
  const key = String(email || "").trim().toLowerCase();
  const storedCode = registrationCodes.get(key);

  if (storedCode?.timeoutId) {
    clearTimeout(storedCode.timeoutId);
  }

  registrationCodes.delete(key);
}

function storeRegistrationCode(email, codeHash) {
  const key = String(email || "").trim().toLowerCase();
  clearRegistrationCode(key);

  const codeId = crypto.randomUUID();
  const expiresAt = Date.now() + REGISTRATION_CODE_TTL_MS;
  const timeoutId = setTimeout(() => {
    const storedCode = registrationCodes.get(key);

    if (storedCode?.codeId === codeId) {
      registrationCodes.delete(key);
    }
  }, REGISTRATION_CODE_TTL_MS);

  timeoutId.unref?.();

  registrationCodes.set(key, {
    codeId,
    codeHash,
    expiresAt,
    timeoutId,
  });
}

async function assertValidRegistrationCode(email, verificationCode) {
  if (!verificationCode) {
    throw new AppError("Mã xác nhận là bắt buộc", 422);
  }

  if (!/^\d{6}$/.test(verificationCode)) {
    throw new AppError("Mã xác nhận phải gồm 6 chữ số", 422);
  }

  const key = String(email || "").trim().toLowerCase();
  const storedCode = registrationCodes.get(key);

  if (!storedCode || storedCode.expiresAt <= Date.now()) {
    clearRegistrationCode(key);
    throw new AppError("Mã xác nhận không tồn tại hoặc đã hết hạn", 400);
  }

  const codeMatched = await bcrypt.compare(verificationCode, storedCode.codeHash);

  if (!codeMatched) {
    throw new AppError("Mã xác nhận không đúng", 400);
  }
}

function sanitizeUser(user) {
  const { passwordHash, emailVerificationToken, passwordResetCodeHash, passwordResetExpiresAt, ...safeUser } = user;
  return safeUser;
}

function createEmailVerification() {
  return {
    token: crypto.randomBytes(32).toString("hex"),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}

function createSixDigitCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function assertStrongPassword(password, fieldName = "Mật khẩu") {
  if (!password) {
    throw new AppError(`${fieldName} là bắt buộc`, 422);
  }

  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new AppError(`${fieldName} phải dài tối thiểu 8 ký tự, có chữ hoa, chữ thường và số. Ví dụ: Example123.`, 422);
  }
}

function clearPasswordChangeCode(userId) {
  const storedCode = passwordChangeCodes.get(userId);

  if (storedCode?.timeoutId) {
    clearTimeout(storedCode.timeoutId);
  }

  passwordChangeCodes.delete(userId);
}

function storePasswordChangeCode(userId, codeHash) {
  clearPasswordChangeCode(userId);

  const codeId = crypto.randomUUID();
  const expiresAt = Date.now() + PASSWORD_CHANGE_CODE_TTL_MS;
  const timeoutId = setTimeout(() => {
    const storedCode = passwordChangeCodes.get(userId);

    if (storedCode?.codeId === codeId) {
      passwordChangeCodes.delete(userId);
    }
  }, PASSWORD_CHANGE_CODE_TTL_MS);

  timeoutId.unref?.();

  passwordChangeCodes.set(userId, {
    codeId,
    codeHash,
    expiresAt,
    timeoutId,
  });
}

async function assertValidPasswordChangeCode(userId, verificationCode) {
  if (!verificationCode) {
    throw new AppError("Mã xác nhận là bắt buộc", 422);
  }

  if (!/^\d{6}$/.test(verificationCode)) {
    throw new AppError("Mã xác nhận phải gồm 6 chữ số", 422);
  }

  const storedCode = passwordChangeCodes.get(userId);

  if (!storedCode || storedCode.expiresAt <= Date.now()) {
    clearPasswordChangeCode(userId);
    throw new AppError("Mã xác nhận không tồn tại hoặc đã hết hạn", 400);
  }

  const codeMatched = await bcrypt.compare(verificationCode, storedCode.codeHash);

  if (!codeMatched) {
    throw new AppError("Mã xác nhận không đúng", 400);
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function assertValidResetCode(resetCode) {
  if (!resetCode) {
    throw new AppError("Mã xác nhận là bắt buộc", 422);
  }

  if (!/^\d{6}$/.test(resetCode)) {
    throw new AppError("Mã xác nhận phải gồm 6 chữ số", 422);
  }
}

async function getUserByResetEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new AppError("Email là bắt buộc", 422);
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      role: true,
      department: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError("Email này chưa được đăng ký trong hệ thống", 404);
  }

  if (!user.emailVerifiedAt) {
    throw new AppError("Tài khoản này chưa xác thực email, vui lòng xác thực trước khi đặt lại mật khẩu", 403);
  }

  return user;
}

async function assertValidPasswordResetCode(user, resetCode) {
  assertValidResetCode(resetCode);

  if (!user.passwordResetCodeHash || !user.passwordResetExpiresAt || user.passwordResetExpiresAt <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
      },
    });
    throw new AppError("Mã xác nhận không tồn tại hoặc đã hết hạn", 400);
  }

  const codeMatched = await bcrypt.compare(resetCode, user.passwordResetCodeHash);

  if (!codeMatched) {
    throw new AppError("Mã xác nhận không đúng", 400);
  }
}

export async function login(req, res, next) {
  try {
    const { email, identifier, password } = req.body;
    const loginId = String(identifier || email || "").trim();

    if (!loginId || !password) {
      throw new AppError("Email hoặc username và mật khẩu là bắt buộc", 422);
    }

    const isEmailLogin = loginId.includes("@");
    const user = await prisma.user.findUnique({
      where: isEmailLogin ? { email: normalizeEmail(loginId) } : { username: normalizeUsername(loginId) },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError("Email/username hoặc mật khẩu không đúng", 401);
    }

    const matched = await bcrypt.compare(password, user.passwordHash);

    if (!matched) {
      throw new AppError("Email/username hoặc mật khẩu không đúng", 401);
    }

    if (!user.emailVerifiedAt) {
      throw new AppError("Vui lòng xác thực email trước khi đăng nhập", 403);
    }

    const token = jwt.sign({ userId: user.id, role: user.role.code }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    return ok(res, {
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function requestRegisterCode(req, res, next) {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      throw new AppError("Email là bắt buộc", 422);
    }

    const existed = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existed) {
      throw new AppError("Email này đã được đăng ký trong hệ thống", 409);
    }

    const code = createSixDigitCode();
    const codeHash = await bcrypt.hash(code, 10);

    storeRegistrationCode(normalizedEmail, codeHash);

    await sendRegistrationCodeEmail({
      to: normalizedEmail,
      code,
    });

    return ok(res, null, "Đã gửi mã xác nhận 6 số tới email của bạn.");
  } catch (error) {
    next(error);
  }
}

export async function verifyRegisterCode(req, res, next) {
  try {
    const { email, verificationCode } = req.body;
    const normalizedEmail = normalizeEmail(email);

    await assertValidRegistrationCode(normalizedEmail, verificationCode);

    return ok(res, null, "Mã xác nhận hợp lệ.");
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const { fullName, email, username, password, verificationCode } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const trimmedFullName = String(fullName || "").trim();
    const normalizedUsername = normalizeUsername(username);

    if (!trimmedFullName || !normalizedEmail || !password) {
      throw new AppError("Họ tên, email và mật khẩu là bắt buộc", 422);
    }

    if (!normalizedUsername) {
      throw new AppError("Tên đăng nhập (username) là bắt buộc", 422);
    }

    if (normalizedUsername.length < 4) {
      throw new AppError("Tên đăng nhập (username) phải từ 4 ký tự trở lên", 422);
    }

    assertStrongPassword(password);
    await assertValidRegistrationCode(normalizedEmail, verificationCode);

    const emailExisted = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (emailExisted) {
      throw new AppError("Email đã được sử dụng", 409);
    }

    const usernameExisted = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (usernameExisted) {
      throw new AppError("Tên đăng nhập (username) đã được sử dụng", 409);
    }

    const requesterRole = await prisma.role.findUnique({
      where: { code: "REQUESTER" },
    });

    if (!requesterRole) {
      throw new AppError("Chưa cấu hình vai trò Người dùng", 500);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        fullName: trimmedFullName,
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
        roleId: requesterRole.id,
        emailVerifiedAt: new Date(),
      },
      include: {
        role: true,
        department: true,
      },
    });

    clearRegistrationCode(normalizedEmail);

    const token = jwt.sign({ userId: user.id, role: user.role.code }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    return ok(res, {
      token,
      user: sanitizeUser(user),
    }, "Đăng ký tài khoản thành công.");
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;

    if (!token) {
      throw new AppError("Token xác thực là bắt buộc", 422);
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user) {
      throw new AppError("Liên kết xác thực không hợp lệ hoặc đã hết hạn", 400);
    }

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
      include: {
        role: true,
        department: true,
      },
    });

    return ok(res, sanitizeUser(verifiedUser), "Xác thực email thành công. Bạn có thể đăng nhập.");
  } catch (error) {
    next(error);
  }
}

export async function resendVerificationEmail(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email là bắt buộc", 422);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError("Không tìm thấy tài khoản hợp lệ với email này", 404);
    }

    if (user.emailVerifiedAt) {
      return ok(res, null, "Email này đã được xác thực.");
    }

    const verification = createEmailVerification();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verification.token,
        emailVerificationExpiresAt: verification.expiresAt,
      },
    });

    await sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      token: verification.token,
    });

    return ok(res, null, "Đã gửi lại email xác thực.");
  } catch (error) {
    next(error);
  }
}

export async function requestForgotPasswordCode(req, res, next) {
  try {
    const { email } = req.body;
    const user = await getUserByResetEmail(email);
    const code = createSixDigitCode();
    const codeHash = await bcrypt.hash(code, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MS),
      },
    });

    await sendPasswordResetCodeEmail({
      to: user.email,
      fullName: user.fullName,
      code,
    });

    return ok(res, null, "Đã gửi mã xác nhận 6 số tới email của bạn.");
  } catch (error) {
    next(error);
  }
}

export async function verifyForgotPasswordCode(req, res, next) {
  try {
    const { email, resetCode } = req.body;
    const user = await getUserByResetEmail(email);

    await assertValidPasswordResetCode(user, resetCode);

    return ok(res, null, "Mã xác nhận hợp lệ.");
  } catch (error) {
    next(error);
  }
}

export async function resetForgotPassword(req, res, next) {
  try {
    const { email, resetCode, newPassword } = req.body;

    assertStrongPassword(newPassword, "Mật khẩu mới");

    const user = await getUserByResetEmail(email);
    await assertValidPasswordResetCode(user, resetCode);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return ok(res, null, "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.");
  } catch (error) {
    next(error);
  }
}

export async function requestChangePasswordCode(req, res, next) {
  try {
    const code = createSixDigitCode();
    const codeHash = await bcrypt.hash(code, 10);

    storePasswordChangeCode(req.user.id, codeHash);

    await sendPasswordChangeCodeEmail({
      to: req.user.email,
      fullName: req.user.fullName,
      code,
    });

    return ok(res, null, "Đã gửi mã xác nhận 6 số tới email của bạn.");
  } catch (error) {
    next(error);
  }
}

export async function verifyChangePasswordCode(req, res, next) {
  try {
    const { verificationCode } = req.body;

    if (!verificationCode) {
      throw new AppError("Mã xác nhận là bắt buộc", 422);
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      throw new AppError("Mã xác nhận phải gồm 6 chữ số", 422);
    }

    const storedCode = passwordChangeCodes.get(req.user.id);

    if (!storedCode || storedCode.expiresAt < Date.now()) {
      passwordChangeCodes.delete(req.user.id);
      throw new AppError("Mã xác nhận không tồn tại hoặc đã hết hạn", 400);
    }

    const codeMatched = await bcrypt.compare(verificationCode, storedCode.codeHash);

    if (!codeMatched) {
      throw new AppError("Mã xác nhận không đúng", 400);
    }

    return ok(res, null, "Mã xác nhận hợp lệ");
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, verificationCode } = req.body;

    if (!currentPassword || !newPassword || !verificationCode) {
      throw new AppError("Mật khẩu hiện tại, mật khẩu mới và mã xác nhận là bắt buộc", 422);
    }

    assertStrongPassword(newPassword, "Mật khẩu mới");

    if (!/^\d{6}$/.test(verificationCode)) {
      throw new AppError("Mã xác nhận phải gồm 6 chữ số", 422);
    }

    const storedCode = passwordChangeCodes.get(req.user.id);

    if (!storedCode || storedCode.expiresAt < Date.now()) {
      passwordChangeCodes.delete(req.user.id);
      throw new AppError("Mã xác nhận không tồn tại hoặc đã hết hạn", 400);
    }

    const codeMatched = await bcrypt.compare(verificationCode, storedCode.codeHash);

    if (!codeMatched) {
      throw new AppError("Mã xác nhận không đúng", 400);
    }

    const matched = await bcrypt.compare(currentPassword, req.user.passwordHash);

    if (!matched) {
      throw new AppError("Mật khẩu hiện tại không đúng", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    clearPasswordChangeCode(req.user.id);

    return ok(res, null, "Đổi mật khẩu thành công");
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    return ok(res, sanitizeUser(req.user));
  } catch (error) {
    next(error);
  }
}

export async function checkUsername(req, res, next) {
  try {
    const username = normalizeUsername(req.query.username);

    if (!username) {
      throw new AppError("Username là bắt buộc", 422);
    }

    if (username.length < 4) {
      throw new AppError("Username phải có ít nhất 4 ký tự", 422);
    }

    const existed = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    return ok(res, {
      username,
      available: !existed || existed.id === req.user.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUsername(req, res, next) {
  try {
    const username = normalizeUsername(req.body.username);

    if (!username) {
      throw new AppError("Username là bắt buộc", 422);
    }

    if (username.length < 4) {
      throw new AppError("Username phải có ít nhất 4 ký tự", 422);
    }

    const existed = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existed && existed.id !== req.user.id) {
      throw new AppError("Username này đã được sử dụng", 409);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { username },
      include: {
        role: true,
        department: true,
      },
    });

    return ok(res, sanitizeUser(user), "Đã cập nhật username.");
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const fullName = String(req.body.fullName || "").trim();

    if (!fullName) {
      throw new AppError("Họ tên là bắt buộc", 422);
    }

    if (fullName.length < 2 || fullName.length > 80) {
      throw new AppError("Họ tên phải từ 2 đến 80 ký tự", 422);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName },
      include: {
        role: true,
        department: true,
      },
    });

    return ok(res, sanitizeUser(user), "Đã cập nhật tên hiển thị.");
  } catch (error) {
    next(error);
  }
}

export async function updateAvatar(req, res, next) {
  try {
    const { avatarName, avatarMime, avatarData } = req.body;
    
    // Optional: add validation for file size if needed, but we trust the frontend here for simplicity
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarName, avatarMime, avatarData },
      include: {
        role: true,
        department: true,
      },
    });

    return ok(res, sanitizeUser(user), "Cập nhật ảnh đại diện thành công");
  } catch (error) {
    next(error);
  }
}
