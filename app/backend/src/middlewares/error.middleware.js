import { AppError } from "../utils/errors.js";

export function notFoundHandler(req, res, next) {
  next(new AppError(`Không tìm thấy endpoint ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: err.message || "Lỗi hệ thống",
    errors: err.errors || [],
  });
}
