# Truy cập cùng Wi-Fi

Hiện máy đã quay về `http://localhost:3000`. Cấu hình này không phụ thuộc IP
Wi-Fi. Muốn đặt lại cấu hình localhost: `node scripts/configure-loopback.cjs`,
sau đó khởi động lại các tiến trình của dự án.

Khi bật LAN bằng `configure-lan.cjs`, cả chủ máy và người dùng khác nên dùng
địa chỉ IP được cấu hình, rồi đăng nhập lại trên địa chỉ đó.

Frontend nghe cổng 3000 trên các giao diện mạng; Gateway nghe cổng 8000.
Các dịch vụ 8001–8004 vẫn chỉ nghe ở loopback. CORS HTTP và Socket.IO chỉ
cho phép các origin local đã cấu hình, có hỗ trợ cookie đăng nhập.

Windows Firewall cần cho phép TCP 3000,8000 từ `LocalSubnet`. Không cần
chuyển tiếp cổng trên router. Máy chủ phải bật và chạy `start-local.ps1`.
Hai thiết bị cần cùng mạng và router không bật cách ly thiết bị/guest Wi-Fi.

Đã tạo quy tắc `PTITSocial-LAN-3000-8000`. Nếu cài lại trên máy khác, mở
PowerShell bằng quyền Administrator và chạy:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\enable-lan-firewall.ps1
```

Nếu IP Wi-Fi đổi, chạy `ipconfig`, tìm IPv4 của Wi-Fi, rồi:

```powershell
node scripts/configure-lan.cjs <IPv4-moi>
```

Khởi động lại các tiến trình Node của dự án sau khi đổi cấu hình. Script giữ
nguyên khóa API, session secret và dữ liệu. Đường dẫn media loopback cũ được
đổi ở phía giao diện khi hiển thị; không sửa dữ liệu đã lưu trong MongoDB.
