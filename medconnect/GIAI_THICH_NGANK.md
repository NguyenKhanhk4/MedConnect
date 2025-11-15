# Giải thích ngắn gọn: Video Call với ngrok

## ✅ Đúng rồi! Chỉ cần ngrok là đủ

### Tại sao?

**1. Vấn đề hiện tại:**
- Ứng dụng chạy trên `localhost` (chỉ máy của bạn truy cập được)
- Máy khác không thể truy cập `localhost` của bạn
- → Không thể video call giữa 2 máy khác nhau

**2. Ngrok giải quyết:**
- Ngrok tạo một **tunnel** từ internet vào `localhost` của bạn
- Cung cấp URL công khai (ví dụ: `https://abc123.ngrok.io`)
- Có **HTTPS tự động** (Jitsi yêu cầu)
- → Máy khác có thể truy cập ứng dụng của bạn qua URL ngrok

**3. Video Call hoạt động:**
- Ứng dụng của bạn đã dùng **Jitsi Meet public server** (`meet.jit.si`)
- Jitsi Meet đã sẵn sàng, chỉ cần:
  - ✅ HTTPS (ngrok cung cấp)
  - ✅ Cả 2 máy truy cập cùng ứng dụng (qua URL ngrok)
  - ✅ Cả 2 máy join cùng `roomId` (đã có trong code)

---

## ❓ Cả 2 máy đều phải cài ngrok à?

### ✅ KHÔNG! Chỉ cần 1 máy cài ngrok

**Máy 1 (Máy chạy server - CẦN cài ngrok):**
- ✅ Cài đặt ngrok
- ✅ Chạy server (port 3000)
- ✅ Chạy client (port 5173)
- ✅ Expose server và client qua ngrok
- ✅ Có URL ngrok (ví dụ: `https://xyz789.ngrok.io`)

**Máy 2 (Máy khác - KHÔNG CẦN cài ngrok):**
- ❌ **KHÔNG CẦN** cài ngrok
- ✅ Chỉ cần có **internet**
- ✅ Truy cập URL ngrok từ trình duyệt (ví dụ: `https://xyz789.ngrok.io`)
- ✅ Vào ứng dụng và video call

### Cách hoạt động:

```
Máy 1 (Chạy server + ngrok)              Internet              Máy 2 (Chỉ truy cập)
     │                                        │                         │
     │ 1. Chạy server (port 3000)            │                         │
     │ 2. Chạy client (port 5173)            │                         │
     │ 3. Chạy ngrok: ngrok http 5173        │                         │
     │    → URL: https://xyz789.ngrok.io     │                         │
     │                                        │                         │
     │ 4. Truy cập localhost:5173            │                         │
     │    hoặc https://xyz789.ngrok.io       │                         │
     │                                        │                         │
     │                                        │ 5. Truy cập             │
     │                                        │<────────────────────────┤
     │                                        │  https://xyz789.ngrok.io│
     │                                        │  (chỉ cần trình duyệt)  │
     │                                        │                         │
     │ 6. Join room: room_medconnect_123                                │
     ├───────────────────────────────────────>│<────────────────────────┤
     │                                        │                         │
     │                                        │ 7. Jitsi Meet           │
     │                                        │<────────────────────────>│
     │                                        │  (meet.jit.si)          │
     │                                        │                         │
     │<────────────────────────────────────────────────────────────────>│
     │              Video Call hoạt động!                                │
```

### Ví dụ cụ thể:

**Máy 1 (Doctor - Máy bạn):**
```bash
# Bước 1: Chạy server
cd server
npm start
# → Server chạy trên port 3000

# Bước 2: Chạy client (terminal mới)
cd client
npm run dev
# → Client chạy trên port 5173

# Bước 3: Expose client qua ngrok (terminal mới)
ngrok http 5173
# → URL: https://abc123.ngrok.io

# Bước 4: Truy cập ứng dụng
# Mở trình duyệt: https://abc123.ngrok.io
```

**Máy 2 (Patient - Máy khác):**
```bash
# KHÔNG CẦN cài ngrok!
# KHÔNG CẦN cài đặt gì cả!

# Chỉ cần:
# 1. Có internet
# 2. Mở trình duyệt
# 3. Truy cập: https://abc123.ngrok.io
# 4. Vào ứng dụng và video call
```

---

## 📋 Tóm tắt:

### Máy 1 (Máy chạy server):
- ✅ Cài đặt ngrok
- ✅ Chạy server (npm start)
- ✅ Chạy client (npm run dev)
- ✅ Expose qua ngrok
- ✅ Có URL ngrok

### Máy 2 (Máy khác):
- ❌ **KHÔNG CẦN** cài ngrok
- ❌ **KHÔNG CẦN** cài đặt gì cả
- ✅ Chỉ cần internet
- ✅ Truy cập URL ngrok từ trình duyệt
- ✅ Vào ứng dụng và video call

---

## 🎯 Các bước setup (chỉ trên Máy 1):

**Bước 1: Cài đặt ngrok (chỉ Máy 1)**
```bash
# Tải từ: https://ngrok.com/download
# Hoặc: choco install ngrok (Windows)
```

**Bước 2: Đăng ký ngrok (miễn phí)**
- Truy cập: https://ngrok.com
- Đăng ký và lấy auth token

**Bước 3: Cấu hình ngrok (chỉ Máy 1)**
```bash
ngrok config add-authtoken YOUR_TOKEN
```

**Bước 4: Expose server (port 3000) - Chỉ Máy 1**
```bash
ngrok http 3000
# Lưu URL: https://abc123.ngrok.io
```

**Bước 5: Expose client (port 5173) - Chỉ Máy 1**
```bash
ngrok http 5173
# Lưu URL: https://xyz789.ngrok.io
```

**Bước 6: Cấu hình biến môi trường (chỉ Máy 1)**

Tạo `server/.env`:
```env
CLIENT_URL=https://xyz789.ngrok.io
```

Tạo `client/.env`:
```env
VITE_API_URL=https://abc123.ngrok.io
```

**Bước 7: Khởi động lại server và client (chỉ Máy 1)**

**Bước 8: Test video call**
- **Máy 1**: Mở `https://xyz789.ngrok.io`
- **Máy 2**: Mở `https://xyz789.ngrok.io` (chỉ cần trình duyệt, không cần cài gì)
- Cả 2 vào cùng lịch hẹn → Video call hoạt động! 🎉

---

## ❓ Câu hỏi thường gặp:

**Q: Máy 2 có cần cài ngrok không?**
A: **KHÔNG!** Chỉ cần truy cập URL ngrok từ trình duyệt.

**Q: Máy 2 có cần cài đặt gì không?**
A: **KHÔNG!** Chỉ cần internet và trình duyệt.

**Q: Máy 2 có cần cấu hình gì không?**
A: **KHÔNG!** Chỉ cần truy cập URL ngrok.

**Q: Máy 2 có thể ở xa không?**
A: **CÓ!** Miễn là có internet và truy cập được URL ngrok.

**Q: Máy 2 có cần cùng mạng không?**
A: **KHÔNG!** Chỉ cần internet, có thể ở bất kỳ đâu.

---

## 🎉 Kết luận:

**Chỉ cần 1 máy cài ngrok (máy chạy server)!**

- ✅ **Máy 1**: Cài ngrok, chạy server/client, expose qua ngrok
- ✅ **Máy 2**: Chỉ cần internet + trình duyệt + truy cập URL ngrok
- ✅ Video call hoạt động ngay!

**Đơn giản vậy thôi!** 🎊
