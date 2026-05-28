# Damess — Hướng dẫn chạy ứng dụng

## Yêu cầu

- Node.js >= 18
- PostgreSQL >= 14 (service `postgresql-x64-17` đang chạy)
- Database `yeu_cau_noi_bo` đã tạo

## Chạy bản Web

Double-click `START_WEB.bat` hoặc chạy thủ công:

```bat
cd app\backend
node src/server.js
```

Mở trình duyệt: `http://localhost:5000`

## Chạy bản Desktop

Double-click `START_DESKTOP_APP.bat`

Script sẽ tự khởi động backend và mở ứng dụng desktop.

## Lưu ý

- Backend API chạy tại `http://localhost:5000/api`
- Frontend được serve bởi backend tại `http://localhost:5000`
- Desktop app kết nối tới cùng backend
- Cả web và desktop dùng chung database
