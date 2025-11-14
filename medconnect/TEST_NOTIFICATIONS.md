# Hướng dẫn Test Thông Báo

## 📋 Tổng quan

Hệ thống có **19 loại in-app notifications** và **10 loại email notifications** đã được đồng bộ.

## 🧪 Cách Test

### 1. Test bằng Script (Khuyến nghị)

Chạy script test tự động:

```bash
cd server
node scripts/testNotifications.js
```

Script sẽ:
- ✅ Kiểm tra số lượng notifications trong database
- ✅ Kiểm tra notifications theo type
- ✅ Hiển thị 5 notifications gần đây nhất
- ✅ Test tạo các loại notifications
- ✅ Kiểm tra video call reminders

### 2. Test bằng API Endpoint

#### Tạo test notification thủ công:

```bash
POST /api/notifications/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "appointment",
  "title": "🧪 Test Notification",
  "message": "Đây là thông báo test"
}
```

#### Xem notifications:

```bash
GET /api/notifications
Authorization: Bearer <token>
```

#### Xem số lượng chưa đọc:

```bash
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

### 3. Test Thủ Công (Từng Loại)

#### A. Test Notification Đặt Lịch Thành Công
1. Đăng nhập với tài khoản bệnh nhân
2. Đặt một lịch hẹn mới
3. ✅ Kiểm tra: Có notification "Đặt lịch hẹn thành công" trong tab Thông báo

#### B. Test Notification Thanh Toán Thành Công
1. Đăng nhập với tài khoản bệnh nhân
2. Thanh toán một lịch hẹn
3. ✅ Kiểm tra: Có notification "Thanh toán thành công" trong tab Thông báo

#### C. Test Notification Cuộc Hẹn Hoàn Thành
1. Bác sĩ hoàn thành một cuộc hẹn (status = "done")
2. ✅ Kiểm tra: Bệnh nhân có notification "Cuộc hẹn đã hoàn thành"

#### D. Test Notification Video Call Reminder (10 phút trước)
1. Tạo một appointment online với thời gian bắt đầu = hiện tại + 10 phút
2. Đợi cron job chạy (mỗi phút)
3. ✅ Kiểm tra: Bệnh nhân có notification "⏰ Nhắc nhở: Cuộc gọi video sắp bắt đầu"

#### E. Test Notification Nhắc Nhở Lịch Hẹn (24h trước)
1. Tạo một appointment với thời gian = ngày mai
2. Đợi cron job chạy
3. ✅ Kiểm tra: Bệnh nhân có notification "Nhắc nhở lịch hẹn"

### 4. Test Từ Frontend

1. Đăng nhập vào ứng dụng với tài khoản bệnh nhân
2. Vào tab **"Thông báo"** (`/benh-nhan/thong-bao`)
3. Kiểm tra:
   - ✅ Danh sách notifications hiển thị đúng
   - ✅ Badge số lượng chưa đọc hiển thị
   - ✅ Click vào notification đánh dấu đã đọc
   - ✅ NotificationCenter (chuông) hiển thị notifications

## 📊 Kết Quả Test Hiện Tại

Từ script test vừa chạy:
- ✅ **269 notifications** trong database
- ✅ **111 notifications** chưa đọc
- ✅ **144 appointment notifications** (108 chưa đọc)
- ✅ **123 leave_request notifications** (2 chưa đọc)
- ✅ **2 payment notifications** (1 chưa đọc)
- ✅ Test tạo booking notification: **Thành công** (tạo được 2 notifications)
- ✅ Video call reminder service: **Hoạt động** (không có appointment trong 10 phút nên không gửi)

## 🔍 Các Trường Hợp Cần Test

### ✅ Đã Test:
- [x] Tạo booking notification
- [x] Video call reminder service
- [x] Database notifications

### ⏳ Cần Test Thủ Công:
- [ ] Đặt lịch hẹn → Kiểm tra notification "Đặt lịch hẹn thành công"
- [ ] Thanh toán thành công → Kiểm tra notification "Thanh toán thành công"
- [ ] Thanh toán dịch vụ → Kiểm tra notification "Thanh toán dịch vụ thành công"
- [ ] Thanh toán tiền mặt → Kiểm tra notification "Thanh toán tiền mặt thành công"
- [ ] Bác sĩ hoàn thành cuộc hẹn → Kiểm tra notification "Cuộc hẹn đã hoàn thành"
- [ ] Video call 10 phút trước → Kiểm tra notification nhắc nhở
- [ ] Bác sĩ chấp nhận/từ chối → Kiểm tra notification
- [ ] Dời lịch hẹn → Kiểm tra notification
- [ ] Hủy lịch hẹn → Kiểm tra notification

## 🐛 Troubleshooting

Nếu notifications không hiển thị:

1. **Kiểm tra userId**: Đảm bảo notification có `userId` đúng với user đang đăng nhập
2. **Kiểm tra API**: Gọi `GET /api/notifications` để xem có notifications không
3. **Kiểm tra Console**: Xem có lỗi trong browser console không
4. **Kiểm tra Network**: Xem request API có thành công không

## 📝 Lưu ý

- Notifications được tạo tự động khi có sự kiện xảy ra
- Email và in-app notification đã được đồng bộ
- Không có trùng lặp notifications (đã được sửa)
- Tất cả notifications đều có mục đích rõ ràng

