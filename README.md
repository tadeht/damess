# Damess — Hệ thống quản lý yêu cầu nội bộ

## Giới thiệu

Damess là hệ thống quản lý quy trình xử lý yêu cầu nội bộ dành cho doanh nghiệp.  
Doanh nghiệp triển khai có thể tự cấu hình tên, bộ phận, người dùng và phân quyền theo cơ cấu riêng.

## Công nghệ

| Layer | Stack |
|-------|-------|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| Backend | Node.js + Express + Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT + Nodemailer (Gmail SMTP) |
| Desktop | Electron |

## Cấu trúc thư mục

```text
├── README.md
├── FUTURE_UPDATES.md
├── app/
│   ├── backend/        # API server (Express + Prisma)
│   ├── frontend/       # Web app (React + Vite)
│   └── desktop/        # Desktop app (Electron)
└── database/
    └── erd/            # Sơ đồ ERD
```

## Cách chạy

### Yêu cầu

- Node.js >= 18
- PostgreSQL >= 14 (đang chạy, database `yeu_cau_noi_bo`)
- pnpm (cho frontend/desktop)

### Chạy Web

```bat
cd app\backend
npm install
npm run start
```

Mở trình duyệt tại `http://localhost:5000`

### Chạy Dev (Frontend + Backend riêng)

```bat
:: Terminal 1 - Backend
cd app\backend
npm run dev

:: Terminal 2 - Frontend
cd app\frontend
pnpm install
pnpm run dev -- --host 127.0.0.1
```

Frontend dev: `http://127.0.0.1:5173`

### Chạy Desktop App

1. Build frontend: `cd app\frontend && pnpm build`
2. Chạy desktop: `cd app\desktop && pnpm install && pnpm start`

Hoặc build thành .exe: `cd app\desktop && pnpm run dist`

### Database Studio

```bat
cd app\backend
npm run prisma:studio
```

Mở `http://localhost:5555`

## Tính năng chính

- Đăng ký / Đăng nhập / Xác thực email / Quên & đổi mật khẩu
- Workspace (kiểu Discord): tạo, mời, quản lý thành viên
- Tạo yêu cầu nội bộ (PUBLIC/PRIVATE) với mã tự sinh REQ-YYYY-NNNN
- Phân công xử lý, cập nhật trạng thái (8 trạng thái)
- Ghi chú, file đính kèm, lịch sử thao tác
- Dự án: STORY → TASK → SUB_TASK (board 5 cột)
- Tài liệu wiki theo dự án với revision history
- Chat 1:1 (DM) và kênh chat workspace
- Thông báo in-app
- Dashboard và báo cáo
- Quản trị: Người dùng, Bộ phận, Loại yêu cầu, Quy tắc xử lý

## Thông tin sinh viên

- Họ tên: Nguyễn Thế Đạt
- MSSV: 2722225705
- Lớp: UD27.09
- Trường: Đại học Kinh doanh và Công nghệ Hà Nội
