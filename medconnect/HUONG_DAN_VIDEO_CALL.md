# Hướng dẫn Video Call giữa các máy khác nhau

## Vấn đề
Hiện tại ứng dụng đang chạy trên `localhost`, nên chỉ có thể test trên cùng một máy. Để video call hoạt động từ máy này sang máy khác, cần expose server ra internet.

## Giải pháp

### ✅ Cách 1: Sử dụng ngrok (Khuyến nghị - Nhanh nhất, không cần sửa code)

**Ưu điểm:**
- Nhanh, dễ setup
- Có HTTPS tự động (Jitsi yêu cầu)
- Không cần sửa code
- Miễn phí

**Các bước:**

1. **Cài đặt ngrok:**
   ```bash
   # Windows: Tải từ https://ngrok.com/download
   # Hoặc dùng Chocolatey:
   choco install ngrok
   
   # Mac:
   brew install ngrok
   
   # Linux:
   wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
   tar xvzf ngrok-v3-stable-linux-amd64.tgz
   ```

2. **Đăng ký tài khoản ngrok (miễn phí):**
   - Truy cập: https://ngrok.com
   - Đăng ký và lấy auth token

3. **Cấu hình ngrok:**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

4. **Expose server backend (port 3000):**
   ```bash
   ngrok http 3000
   ```
   
   Bạn sẽ nhận được URL như: `https://abc123.ngrok.io`

5. **Expose client frontend (port 5173):**
   Mở terminal mới:
   ```bash
   ngrok http 5173
   ```
   
   Bạn sẽ nhận được URL như: `https://xyz789.ngrok.io`

6. **Cấu hình biến môi trường:**
   
   Tạo file `server/.env`:
   ```env
   PORT=3000
   MONGODB_URL=mongodb://localhost:27017/MedConnect
   CLIENT_URL=https://xyz789.ngrok.io
   ```
   
   Tạo file `client/.env`:
   ```env
   VITE_API_URL=https://abc123.ngrok.io
   VITE_API_BASE=https://abc123.ngrok.io/api
   ```

7. **Khởi động lại server và client:**
   ```bash
   # Terminal 1: Server
   cd server
   npm start
   
   # Terminal 2: Client
   cd client
   npm run dev
   ```

8. **Truy cập ứng dụng:**
   - Máy 1 (Doctor): Truy cập `https://xyz789.ngrok.io`
   - Máy 2 (Patient): Truy cập `https://xyz789.ngrok.io`
   - Cả hai sẽ kết nối được với nhau!

**Lưu ý:**
- URL ngrok miễn phí thay đổi mỗi lần restart (trừ khi dùng tài khoản trả phí)
- Video call sẽ hoạt động vì có HTTPS (Jitsi yêu cầu)

---

### ✅ Cách 2: Deploy lên server public (Production)

**Ưu điểm:**
- URL cố định
- Ổn định, chuyên nghiệp
- Có thể tự host hoặc dùng cloud

**Các bước:**

1. **Deploy backend lên Railway/Heroku/Render:**
   - Đăng ký tài khoản
   - Kết nối GitHub repo
   - Set biến môi trường:
     - `PORT` (tự động)
     - `MONGODB_URL` (MongoDB Atlas)
     - `CLIENT_URL` (URL frontend)

2. **Deploy frontend lên Vercel/Netlify:**
   - Đăng ký tài khoản
   - Kết nối GitHub repo
   - Set biến môi trường:
     - `VITE_API_URL` (URL backend)
     - `VITE_API_BASE` (URL backend + /api)

3. **Cấu hình CORS trên backend:**
   - Cho phép domain frontend trong `server/index.js`

4. **Truy cập ứng dụng:**
   - Cả hai máy truy cập qua domain public
   - Video call hoạt động với HTTPS

---

### ✅ Cách 3: Cấu hình mạng LAN (Nếu cùng mạng nội bộ)

**Ưu điểm:**
- Không cần internet
- Nhanh, ổn định
- Miễn phí

**Nhược điểm:**
- Chỉ hoạt động trong cùng mạng LAN
- Cần HTTPS hoặc localhost (Jitsi yêu cầu)
- Phức tạp hơn

**Các bước:**

1. **Tìm IP của máy chạy server:**
   ```bash
   # Windows:
   ipconfig
   # Tìm IPv4 Address, ví dụ: 192.168.1.100
   
   # Mac/Linux:
   ifconfig
   # Hoặc:
   ip addr show
   ```

2. **Cấu hình server để listen trên tất cả interface:**
   
   Sửa `server/index.js`:
   ```javascript
   const PORT = process.env.PORT || 3000;
   const HOST = process.env.HOST || '0.0.0.0'; // Listen trên tất cả interface
   
   server.listen(PORT, HOST, () => {
     const domain = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
     console.log(`🚀 Server đang chạy tại: ${domain}`);
     console.log(`🌐 Truy cập từ máy khác: http://YOUR_IP:${PORT}`);
   });
   ```

3. **Cấu hình CORS để cho phép IP LAN:**
   
   Sửa `server/index.js`:
   ```javascript
   const allowedOrigins = [
     "http://localhost:5173",
     "http://192.168.1.100:5173", // IP của máy chạy client
     // Thêm các IP khác nếu cần
   ];
   ```

4. **Cấu hình client để dùng IP server:**
   
   Tạo file `client/.env`:
   ```env
   VITE_API_URL=http://192.168.1.100:3000
   VITE_API_BASE=http://192.168.1.100:3000/api
   ```

5. **Vấn đề HTTPS với Jitsi:**
   - Jitsi yêu cầu HTTPS (trừ localhost)
   - Giải pháp: Dùng ngrok cho HTTPS, hoặc tự tạo certificate

**Lưu ý:**
- Firewall có thể chặn kết nối
- Cần mở port 3000 và 5173 trên firewall
- Jitsi vẫn yêu cầu HTTPS, nên cách này khó thực hiện

---

## Khuyến nghị

**Cho development/testing:**
- ✅ **Dùng ngrok (Cách 1)** - Nhanh, dễ, có HTTPS

**Cho production:**
- ✅ **Deploy lên server public (Cách 2)** - Ổn định, chuyên nghiệp

**Cho mạng nội bộ:**
- ⚠️ **Cách 3 khó** vì Jitsi yêu cầu HTTPS (trừ localhost)

## Kiểm tra Video Call

Sau khi setup:

1. **Máy 1 (Doctor):**
   - Truy cập ứng dụng
   - Vào lịch hẹn
   - Click "Bắt đầu video call"

2. **Máy 2 (Patient):**
   - Truy cập ứng dụng (cùng URL nếu dùng ngrok/deploy)
   - Vào lịch hẹn
   - Click "Tham gia video call"

3. **Kiểm tra:**
   - Cả hai máy đều thấy video của nhau
   - Audio hoạt động
   - Có thể bật/tắt camera, microphone

## Troubleshooting

**Lỗi: "CORS rejected"**
- Kiểm tra CORS config trên server
- Đảm bảo URL frontend trong `allowedOrigins`

**Lỗi: "Failed to fetch"**
- Kiểm tra `VITE_API_URL` trong client
- Đảm bảo server đang chạy
- Kiểm tra firewall

**Lỗi: "Camera/Microphone permission denied"**
- Cho phép quyền camera/microphone trên browser
- Kiểm tra browser settings

**Lỗi: "Jitsi Meet failed to load"**
- Kiểm tra kết nối internet
- Kiểm tra HTTPS (Jitsi yêu cầu HTTPS)
- Kiểm tra console để xem lỗi chi tiết

---

## Tóm tắt

**Để video call hoạt động từ máy này sang máy khác:**

1. ✅ **Dùng ngrok** (khuyến nghị cho dev/test)
   - Expose server và client qua ngrok
   - Có HTTPS tự động
   - Không cần sửa code nhiều

2. ✅ **Deploy lên server public** (khuyến nghị cho production)
   - Deploy backend và frontend
   - Có HTTPS và domain cố định
   - Ổn định, chuyên nghiệp

3. ⚠️ **Cấu hình LAN** (khó vì Jitsi yêu cầu HTTPS)
   - Chỉ hoạt động trong mạng LAN
   - Cần HTTPS hoặc localhost
   - Phức tạp hơn

**Video call sẽ hoạt động vì:**
- Jitsi Meet public server (`meet.jit.si`) đã sẵn sàng
- Chỉ cần HTTPS (ngrok/deploy cung cấp)
- Cả hai máy truy cập cùng ứng dụng qua internet

