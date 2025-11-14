# 📋 Bảng Kiểm Tra Thông Báo Đầy Đủ

## ✅ THÔNG BÁO ĐÃ CÓ

### 1. APPOINTMENT - Đặt Lịch & Xác Nhận

| Sự Kiện | Người Nhận | Thông Báo | File | Status |
|---------|-----------|-----------|-----|--------|
| Bệnh nhân đặt lịch (auto-accepted) | Bệnh nhân | "Đặt lịch hẹn thành công" | `patientController.js` → `createBookingNotification` | ✅ |
| Bệnh nhân đặt lịch | Bác sĩ | "Có lịch hẹn mới" | `notificationService.js` → `createBookingNotification` | ✅ |
| Bác sĩ tạo lịch | Bệnh nhân | "Đặt lịch hẹn thành công" | `doctorController.js` → `createBookingNotification` | ✅ |
| Bác sĩ tạo lịch | Bác sĩ | "Có lịch hẹn mới" | `notificationService.js` → `createBookingNotification` | ✅ |
| Quản lý tạo lịch | Bệnh nhân | "Đặt lịch hẹn thành công" | `managerController.js` → `createBookingNotification` | ✅ |
| Quản lý tạo lịch | Bác sĩ | "Có lịch hẹn mới (Quản lý tạo)" | `notificationService.js` → `createBookingNotification` | ✅ |
| Bác sĩ chấp nhận lịch (backward compat) | Bệnh nhân | "Lịch hẹn đã được xác nhận" | `medicalVisitController.js` → `createAppointmentNotification("accepted")` | ✅ |
| Bác sĩ từ chối lịch | Bệnh nhân | "Lịch hẹn bị từ chối" | `medicalVisitController.js` → `createAppointmentNotification("rejected")` | ✅ |

### 2. APPOINTMENT - Thay Đổi Trạng Thái

| Sự Kiện | Người Nhận | Thông Báo | File | Status |
|---------|-----------|-----------|-----|--------|
| Bác sĩ cập nhật status = "accepted" | Bệnh nhân | "Lịch hẹn đã được xác nhận" | `doctorController.js` → `createAppointmentNotification("accepted")` | ✅ |
| Bác sĩ cập nhật status = "rejected" | Bệnh nhân | "Lịch hẹn bị từ chối" | `doctorController.js` → `createAppointmentNotification("rejected")` | ✅ |
| Bác sĩ cập nhật status = "done" | Bệnh nhân | "Cuộc hẹn đã hoàn thành" | `doctorController.js` → `createAppointmentNotification("done")` | ✅ |
| Bác sĩ cập nhật status = "cancelled" | Bệnh nhân | "Lịch hẹn đã bị hủy" | `doctorController.js` → `createAppointmentNotification("cancelled")` | ✅ |
| Bác sĩ cập nhật status = "no_show" | Bệnh nhân | ⚠️ **THIẾU** - Cần thêm notification | `doctorController.js` → `createAppointmentNotification("no_show")` | ❌ |
| Bệnh nhân hủy lịch | Bác sĩ | "Bệnh nhân đã hủy lịch hẹn" | `patientController.js` → `createAppointmentNotification("cancelled")` | ✅ |

### 3. RESCHEDULE - Dời Lịch

| Sự Kiện | Người Nhận | Thông Báo | File | Status |
|---------|-----------|-----------|-----|--------|
| Bệnh nhân yêu cầu dời lịch | Bác sĩ | "Có yêu cầu dời lịch" | `rescheduleController.js` → `createAppointmentNotification("reschedule_requested")` | ✅ |
| Bác sĩ chấp nhận yêu cầu dời | Bệnh nhân | "Lịch hẹn đã được dời" | `rescheduleController.js` → `createAppointmentNotification("rescheduled")` | ✅ |
| Bác sĩ từ chối yêu cầu dời | Bệnh nhân | "Yêu cầu dời lịch bị từ chối" | `rescheduleController.js` → `createAppointmentNotification("reschedule_rejected")` | ✅ |
| Quản lý dời lịch trực tiếp | Bệnh nhân | "Lịch hẹn đã được dời bởi quản lý" | `managerController.js` → `createAppointmentNotification("rescheduled")` | ✅ |
| Quản lý dời lịch trực tiếp | Bác sĩ | "Lịch hẹn đã được dời bởi quản lý" | `managerController.js` → `createAppointmentNotification("rescheduled")` | ✅ |

### 4. PAYMENT - Thanh Toán

| Sự Kiện | Người Nhận | Thông Báo | File | Status |
|---------|-----------|-----------|-----|--------|
| Thanh toán online thành công (PayOS) | Bệnh nhân | "Thanh toán thành công" | `payos.service.js` → `Notification.create` | ✅ |
| Thanh toán dịch vụ thành công (PayOS) | Bệnh nhân | "Thanh toán dịch vụ thành công" | `payos.service.js` → `Notification.create` | ✅ |
| Thanh toán tiền mặt thành công | Bệnh nhân | "Thanh toán tiền mặt thành công" | `managerController.js` → `Notification.create` | ✅ |

### 5. REMINDERS - Nhắc Nhở

| Sự Kiện | Người Nhận | Thông Báo | File | Status |
|---------|-----------|-----------|-----|--------|
| Video call 10 phút trước | Bệnh nhân | "⏰ Nhắc nhở: Cuộc gọi video sắp bắt đầu" | `videoCallReminderService.js` → `Notification.create` | ✅ |
| Nhắc nhở lịch hẹn 24h trước | Bệnh nhân | "Nhắc nhở lịch hẹn" | `notificationService.js` → `createAppointmentNotification("reminder")` | ✅ |

### 6. OTHER - Khác

| Sự Kiện | Người Nhận | Thông Báo | File | Status |
|---------|-----------|-----------|-----|--------|
| Leave request (nghỉ phép) | Manager | "Có yêu cầu nghỉ phép" | `leaveRequestController.js` | ✅ |

---

## ⚠️ CẦN KIỂM TRA

### 1. Appointment Status "in_progress"
- **Câu hỏi**: Khi appointment chuyển sang "in_progress", có cần thông báo cho bệnh nhân không?
- **Hiện tại**: Không có notification cho status "in_progress"
- **Đề xuất**: Có thể thêm notification "Cuộc hẹn đã bắt đầu" cho bệnh nhân

### 2. Payment Status Changes
- **Câu hỏi**: Khi payment status thay đổi (pending → paid, paid → captured), có cần thông báo không?
- **Hiện tại**: Chỉ có notification khi thanh toán thành công
- **Đề xuất**: Có thể thêm notification khi payment được capture

### 3. Appointment Auto-Expire
- **Câu hỏi**: Khi appointment tự động hết hạn (autoExpireAt), có cần thông báo không?
- **Hiện tại**: ✅ ĐÃ CÓ notification "Lịch hẹn đã bị hủy" (do không thanh toán trong thời hạn 10 phút)
- **File**: `scripts/cancelUnpaidAppointments.js` → `Notification.create`

### 4. Service Payment Status
- **Câu hỏi**: Khi service payment được manager xử lý (pending_manager → paid), có cần thông báo không?
- **Hiện tại**: Không có notification
- **File**: `servicePaymentController.js`

---

## 📊 TỔNG KẾT

### Đã có: **19 loại thông báo in-app**
1. ✅ Đặt lịch hẹn thành công (bệnh nhân)
2. ✅ Có lịch hẹn mới (bác sĩ)
3. ✅ Lịch hẹn đã được xác nhận (bệnh nhân)
4. ✅ Lịch hẹn bị từ chối (bệnh nhân)
5. ✅ Cuộc hẹn đã hoàn thành (bệnh nhân)
6. ✅ Lịch hẹn đã bị hủy (bệnh nhân)
7. ✅ Bệnh nhân đã hủy lịch hẹn (bác sĩ)
8. ✅ Bạn đã không đến khám (bệnh nhân)
9. ✅ Có yêu cầu dời lịch (bác sĩ)
10. ✅ Lịch hẹn đã được dời (bệnh nhân)
11. ✅ Lịch hẹn đã được dời bởi quản lý (bệnh nhân + bác sĩ)
12. ✅ Yêu cầu dời lịch bị từ chối (bệnh nhân)
13. ✅ Thanh toán thành công (bệnh nhân)
14. ✅ Thanh toán dịch vụ thành công (bệnh nhân)
15. ✅ Thanh toán tiền mặt thành công (bệnh nhân)
16. ✅ Nhắc nhở: Cuộc gọi video sắp bắt đầu (bệnh nhân)
17. ✅ Nhắc nhở lịch hẹn (bệnh nhân)
18. ✅ Có lịch hẹn mới (Quản lý tạo) (bác sĩ)
19. ✅ Có yêu cầu nghỉ phép (manager)

### Cần xác nhận: **4 trường hợp**
1. ⚠️ Appointment status "in_progress" → Có cần notification không?
2. ⚠️ Payment status "captured" → Có cần notification không?
3. ⚠️ Appointment auto-expire → Có cần notification không?
4. ⚠️ Service payment manager approval → Có cần notification không?

---

## 🔍 KIỂM TRA CHI TIẾT

### File: `server/services/notificationService.js`
- ✅ `createAppointmentNotification()` - Xử lý: accepted, rejected, cancelled, no_show, rescheduled, reschedule_requested, reschedule_rejected, reminder, done
- ✅ `createBookingNotification()` - Xử lý: booking notifications cho bệnh nhân và bác sĩ

### File: `server/controllers/patientController.js`
- ✅ `bookAppointment()` - Gọi `createBookingNotification()`
- ✅ `cancelAppointment()` - Gọi `createAppointmentNotification("cancelled")`

### File: `server/controllers/doctorController.js`
- ✅ `updateAppointmentStatus()` - Gọi `createAppointmentNotification(status)`
- ✅ `createAppointmentByDoctor()` - Gọi `createBookingNotification()`

### File: `server/controllers/managerController.js`
- ✅ `createAppointmentByManager()` - Gọi `createBookingNotification()`
- ✅ `rescheduleAppointmentByManager()` - Gọi `createAppointmentNotification("rescheduled")`
- ✅ `processCashPayment()` - Tạo notification payment

### File: `server/services/payos.service.js`
- ✅ `handlePayosWebhook()` - Tạo notification payment cho booking và service payment

### File: `server/services/videoCallReminderService.js`
- ✅ `sendVideoCallReminders()` - Tạo notification video call reminder

### File: `server/controllers/rescheduleController.js`
- ✅ `requestReschedule()` - Gọi `createAppointmentNotification("reschedule_requested")`
- ✅ `approveReschedule()` - Gọi `createAppointmentNotification("rescheduled")`
- ✅ `rejectReschedule()` - Gọi `createAppointmentNotification("reschedule_rejected")`

---

## ✅ KẾT LUẬN

**Hệ thống thông báo đã đầy đủ cho các sự kiện chính:**
- ✅ Đặt lịch hẹn
- ✅ Xác nhận/Từ chối lịch hẹn
- ✅ Hủy lịch hẹn
- ✅ Dời lịch hẹn
- ✅ Thanh toán
- ✅ Nhắc nhở
- ✅ Hoàn thành cuộc hẹn

**Cần xác nhận với người dùng về 4 trường hợp:**
1. Notification khi appointment chuyển sang "in_progress"
2. Notification khi payment được "captured"
3. Notification khi appointment auto-expire
4. Notification khi service payment được manager xử lý

