# 📧 RÀ SOÁT EMAIL - CHỈ GỬI CHO BỆNH NHÂN

## ✅ ĐÃ KIỂM TRA VÀ XÁC NHẬN

### Email chỉ gửi cho BỆNH NHÂN (PATIENT):

1. ✅ **Appointment Acceptance Email** - `sendAppointmentAcceptanceEmail()` 
   - Gửi cho: `patientEmail`
   - File: `server/controllers/doctorController.js`

2. ✅ **Appointment Rejection Email** - `sendAppointmentRejectionEmail()`
   - Gửi cho: `patientEmail`
   - File: `server/controllers/doctorController.js`

3. ✅ **Appointment Completion Email** - `sendAppointmentCompletedEmail()`
   - Gửi cho: `patientEmail`
   - File: `server/controllers/doctorController.js`

4. ✅ **Appointment Cancellation Email** - `sendAppointmentCancellationEmail()`
   - Gửi cho: `patientEmail`
   - File: `server/controllers/patientController.js`

5. ✅ **Payment Confirmation Email** - `sendPaymentConfirmationEmail()`
   - Gửi cho: `patientEmail`
   - File: `server/services/payos.service.js`

6. ✅ **Service Payment Confirmation Email** - `sendServicePaymentConfirmationEmail()`
   - Gửi cho: `patientEmail`
   - File: `server/services/payos.service.js`

7. ✅ **Cash Payment Confirmation Email**
   - Gửi cho: `patientEmail`
   - File: `server/controllers/managerController.js`

8. ✅ **Video Call Reminder Email**
   - Gửi cho: `patientEmail`
   - File: `server/services/videoCallReminderService.js`

9. ✅ **Reschedule Confirmation Email** - `sendAppointmentRescheduledEmail()`
   - Gửi cho: `patientEmail`
   - File: `server/controllers/rescheduleController.js`

10. ✅ **Patient Welcome Email** - `sendPatientWelcomeEmail()`
    - Gửi cho: `user.email` (chỉ khi role = "patient")
    - File: `server/controllers/authController.js`

11. ✅ **OTP Email** - `sendOtpMail()`
    - Gửi cho: User đang reset password (có thể là bất kỳ role nào, nhưng đây là chức năng chung)
    - File: `server/controllers/authController.js`
    - **Lưu ý**: OTP email là chức năng chung cho tất cả user, không chỉ patient

---

## ✅ EMAIL GỬI CHO BÁC SĨ (2 LOẠI)

### Email xác minh tài khoản bác sĩ (phê duyệt/từ chối):

1. ✅ **Doctor Approval Email** - `sendDoctorApprovalEmail()`
   - **Gửi email** - Khi admin phê duyệt tài khoản bác sĩ thành công (canBeActive = true)
   - File: `server/controllers/adminController.js` - `approveDoctor()`
   - **Lưu ý**: Chỉ gửi khi bác sĩ có đầy đủ thông tin và có thể active

2. ✅ **Doctor Rejection Email** - `sendDoctorRejectionEmail()`
   - **Gửi email** - Khi admin từ chối tài khoản bác sĩ
   - File: `server/controllers/adminController.js` - `rejectDoctor()`

---

## ❌ KHÔNG GỬI EMAIL CHO BÁC SĨ (CHỈ DÙNG IN-APP NOTIFICATION)

### Email đã được comment (chỉ dùng in-app notification):

1. ❌ **Doctor Suspension Email** - `sendDoctorSuspensionEmail()`
   - **Đã comment** - Bác sĩ nhận in-app notification thay vì email
   - File: `server/controllers/adminController.js` - `approveDoctor()`
   - **Lý do**: Bác sĩ thiếu thông tin, chỉ cần in-app notification

---

## 📊 TỔNG KẾT

### ✅ Email chỉ gửi cho BỆNH NHÂN:
- **10 loại email** cho bệnh nhân (appointment, payment, reminder, welcome, reschedule)
- **1 loại email** chung (OTP - cho tất cả user khi reset password)

### ✅ Email gửi cho BÁC SĨ (2 LOẠI):
- **2 loại email**: 
  - Xác minh tài khoản bác sĩ thành công (approval)
  - Từ chối tài khoản bác sĩ (rejection)
- **1 loại email** đã được comment: suspension (chỉ dùng in-app notification)

### ❌ Email KHÔNG gửi cho MANAGER/ADMIN:
- Manager/Admin chỉ nhận **in-app notification**, không nhận email

---

## ✅ KẾT LUẬN

**Đã đảm bảo:**
- ✅ Chỉ bệnh nhân nhận email
- ✅ Bác sĩ/Manager/Admin chỉ nhận in-app notification
- ✅ Tất cả email cho bác sĩ đã được comment
- ✅ OTP email là chức năng chung (cần thiết cho tất cả user)

