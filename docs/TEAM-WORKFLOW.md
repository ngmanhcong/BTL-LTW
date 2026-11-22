# Làm việc với Git

## Clone và chạy

```powershell
git clone https://github.com/ngmanhcong/BTL-LTW.git
cd BTL-LTW
```

Xem [README](../README.md) để cài dependencies, khởi động Docker và chạy web.

## Tạo nhánh cho thay đổi

```powershell
git switch main
git pull --ff-only
git switch -c feature/ten-chuc-nang
```

Sau khi chạy thử, commit các file liên quan, push nhánh và tạo Pull Request vào `main`. Cập nhật tài liệu API hoặc cấu hình mẫu nếu thay đổi cách chạy.

Để cấu hình riêng của từng máy trong `.env`. Các file `.env.example` dùng để ghi tên biến môi trường và giá trị mẫu.
