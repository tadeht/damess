# Backend - Hệ thống quản lý yêu cầu nội bộ

## 1. Công nghệ

- Node.js
- ExpressJS
- PostgreSQL
- Prisma
- JWT

## 2. Cài đặt

Yêu cầu máy đã cài Node.js và PostgreSQL.

```bash
npm install
```

Tạo file `.env` từ `.env.example` và sửa lại `DATABASE_URL` nếu cần.

```bash
cp .env.example .env
```

## 3. Khởi tạo database

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
```

## 4. Chạy backend

```bash
npm run dev
```

Backend mặc định chạy tại:

```text
http://localhost:5000
```

Kiểm tra health:

```text
GET http://localhost:5000/health
```

## 5. Tài khoản demo

Mật khẩu chung: `123456`

- `admin@example.com`
- `manager.kt@example.com`
- `nhanvien.kd@example.com`
- `xuly.kt@example.com`

## 6. API chính

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/departments`
- `GET /api/request-types`
- `GET /api/catalog/priorities`
- `GET /api/catalog/roles`
- `GET /api/catalog/statuses`
- `GET /api/rules`
- `POST /api/rules`
- `GET /api/requests`
- `POST /api/requests`
- `GET /api/requests/:id`
- `POST /api/requests/:id/assign`
- `POST /api/requests/:id/status`
- `POST /api/requests/:id/comments`
- `GET /api/dashboard/summary`
