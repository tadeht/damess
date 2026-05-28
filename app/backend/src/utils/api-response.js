export function ok(res, data = null, message = "OK") {
  return res.json({
    success: true,
    data,
    message,
  });
}

export function created(res, data = null, message = "Tạo mới thành công") {
  return res.status(201).json({
    success: true,
    data,
    message,
  });
}
