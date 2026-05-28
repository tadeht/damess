# Desktop App

Thư mục này dùng để đóng gói frontend thành ứng dụng desktop Windows bằng Electron.

## Lưu ý

Ứng dụng desktop hiện là lớp giao diện. Backend và PostgreSQL vẫn chạy local:

- Backend: `http://localhost:5000`
- Database: PostgreSQL `yeu_cau_noi_bo`

Trước khi mở app desktop, cần chạy backend:

```bash
cd ../backend
npm.cmd run dev
```

## Build ứng dụng

Chạy từ thư mục `app/desktop`:

```bash
npm.cmd install
npm.cmd run dist
```

File `.exe` sẽ nằm trong:

```text
app/desktop/dist/
```
