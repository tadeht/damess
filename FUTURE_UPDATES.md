# DANH SÁCH TÍNH NĂNG CẦN CẬP NHẬT TRONG TƯƠNG LAI

> File này lưu lại các tính năng có thể phát triển thêm sau khi sản phẩm đã ổn định.

---

## 🔴 Ưu tiên cao

### 1. Tách WorkspacesPage thành components nhỏ
- File hiện tại: `app/frontend/src/features/workspaces/WorkspacesPage.jsx` (~5,990 dòng)
- Tách thành ~10-15 components: WorkspaceRail, WorkspaceSidebar, WorkspaceOverview, WorkspaceMembers, WorkspaceRequests, WorkspaceProjects, WorkspaceActivities, WorkspaceSettings, FriendsPanel, ChatPanel, NotificationsPanel...
- Giúp dễ maintain và mở rộng

### 2. Thêm Pagination cho danh sách
- Requests, Users, Departments hiện load limit=100 không phân trang
- Thêm phân trang hoặc infinite scroll
- Backend đã hỗ trợ `skip`/`take` qua Prisma

### 3. Thêm Zod validation backend
- Package `zod` đã cài nhưng chưa dùng nhiều
- Thêm validation cho tất cả request body/params/query
- Dùng middleware `validate(schema)` đã có sẵn

### 4. Responsive hoàn chỉnh
- Rà responsive trên mobile/tablet
- Đặc biệt bảng yêu cầu, form tạo yêu cầu, workspace
- Test trên nhiều kích thước màn hình

---

## 🟡 Ưu tiên trung bình

### 5. Chuyển Chat từ Polling sang WebSocket
- Hiện dùng polling 2.5s (chat) và 5s (notifications)
- Chuyển sang Socket.IO cho real-time
- Giảm tải server, giảm delay

### 6. Chuyển Attachments từ Base64 sang File Storage
- Hiện lưu file dạng base64 trong database (~2MB/file, max 6 file)
- Chuyển sang lưu file trên disk hoặc S3/Cloudinary
- Giảm tải database, hỗ trợ file lớn hơn

### 7. Giảm JSON body limit
- Hiện set 500MB trong Express — quá lớn, rủi ro DoS
- Giảm xuống 5-10MB

### 8. Voice/Video Channels
- Schema đã có `VOICE` type cho `workspace_channels`
- Triển khai WebRTC cho voice/video call
- Screen share

### 9. Search bar trong AppLayout
- Hiện chỉ có UI placeholder, chưa có chức năng
- Thêm tìm kiếm global: yêu cầu, người dùng, bộ phận

---

## 🟢 Nice-to-have

### 10. Deploy Public
- Deploy lên Render / Railway / VPS
- Cấu hình PostgreSQL trên cloud (Neon / Supabase)
- Domain riêng

### 11. Settings Page đầy đủ
- Hiện disabled "Sắp có" trên menu
- Cài đặt profile, avatar, theme, ngôn ngữ
- Cài đặt thông báo

### 12. Sticker/GIF trong Chat
- Thêm thư viện sticker
- Tích hợp Tenor/Giphy API cho GIF

### 13. Export báo cáo
- Xuất báo cáo PDF/Excel từ dashboard
- Lọc theo thời gian, bộ phận, trạng thái

### 14. Mobile App
- React Native hoặc PWA
- Đồng bộ với web API

### 15. Multi-tenant SaaS
- Hiện là single-tenant (1 bản deploy = 1 doanh nghiệp)
- Mở rộng thành SaaS nhiều doanh nghiệp dùng chung
