import { AppError } from "../utils/errors.js";

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return next(new AppError("Dữ liệu không hợp lệ", 422, result.error.issues));
    }

    req.validated = result.data;
    next();
  };
}
