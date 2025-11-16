# 📋 PHÂN TÍCH CHI TIẾT CÁC LUỒNG NGHIỆP VỤ - MEDCONNECT

## 🎯 TỔNG QUAN DỰ ÁN

**MedConnect** là hệ thống quản lý lịch hẹn và tư vấn y tế trực tuyến, hỗ trợ:
- Đặt lịch hẹn với bác sĩ (online/offline)
- Thanh toán qua PayOS
- Dời lịch hẹn
- Gọi video tư vấn
- Tư vấn AI
- Quản lý hồ sơ bệnh nhân
- Đánh giá bác sĩ

---

## 1. 🔐 LUỒNG XÁC THỰC (AUTHENTICATION)

### 1.1. Đăng ký tài khoản

**File:** `server/controllers/authController.js`

**Luồng:**
1. **Bệnh nhân đăng ký:**
   - Nhập email, password, fullName, phone
   - Hệ thống tạo User với `role: "patient"`, `status: "active"`
   - Tự động tạo Patient profile nếu chưa có
   - Gửi email xác nhận (nếu có)

2. **Bác sĩ đăng ký:**
   - Nhập thông tin cơ bản + upload giấy phép hành nghề
   - Tạo User với `role: "doctor"`, `status: "pending"`
   - Tạo Doctor profile với `isVerified: false`
   - Chờ Admin xác minh (`/api/admin/verify-doctor/:doctorId`)

**Models liên quan:**
- `User`: Thông tin tài khoản (email, password, role, status)
- `Patient`: Hồ sơ bệnh nhân (fullName, dob, gender, medicalHistory...)
- `Doctor`: Hồ sơ bác sĩ (fullName, licenseNo, specializationIds, isVerified...)

### 1.2. Đăng nhập

**Luồng:**
1. User nhập email/phone + password
2. Hệ thống verify password (bcrypt)
3. Tạo JWT token với thông tin:
   - `app_user_id`: ID của User
   - `role`: patient/doctor/admin/manager
   - `email`: Email của user
4. Set cookie với token (httpOnly, secure)
5. Trả về thông tin user + role

**Xác thực:**
- Firebase Authentication (cho Google login)
- Local authentication (email/password)
- Phone authentication (OTP)

### 1.3. Quên mật khẩu

**Luồng:**
1. User nhập email → Gửi OTP qua email
2. User nhập OTP → Verify OTP
3. User nhập password mới → Hash và lưu
4. Gửi email thông báo đổi mật khẩu thành công

---

## 2. 📅 LUỒNG ĐẶT LỊCH HẸN (APPOINTMENT BOOKING)

### 2.1. Đặt lịch đơn (Single Appointment)

**File:** `server/controllers/patientController.js` - `bookAppointment()`

**Luồng chi tiết:**

#### Bước 1: Bệnh nhân chọn bác sĩ và thời gian
- Frontend: `client/src/pages/Appointment/chon-bac-si/ChonBacSi.jsx`
- Bệnh nhân tìm kiếm bác sĩ theo chuyên khoa
- Xem lịch trống của bác sĩ (DoctorTimeSlot)
- Chọn slot thời gian phù hợp

#### Bước 2: Tạo Appointment
**API:** `POST /api/patients/appointments`

**Request body:**
```json
{
  "doctorId": "ObjectId",
  "slotId": "ObjectId",
  "mode": "online" | "offline",
  "clinicId": "ObjectId" (required nếu offline),
  "reason": "Lý do khám",
  "scheduledStart": "ISO Date",
  "scheduledEnd": "ISO Date",
  "patientId": "ObjectId" (optional - cho thành viên gia đình)
}
```

**Xử lý backend:**
1. ✅ Validate input (doctorId, slotId, mode, scheduledStart, scheduledEnd)
2. ✅ Kiểm tra slot có còn trống không:
   - Query Appointment với `slotId` và `status: ["accepted", "in_progress", "done"]`
   - Nếu có → Trả lỗi "Time slot is no longer available"
3. ✅ Lấy hoặc tạo Patient profile:
   - Nếu có `patientId` → Verify patient thuộc về user
   - Nếu không → Lấy patient của user hoặc tạo mới
4. ✅ Tạo Appointment với:
   - `status: "accepted"` (tự động chấp nhận, không cần bác sĩ duyệt)
   - `paymentStatus: "unpaid"`
   - `totalPay: 0`, `amountPaid: 0` (chưa có dịch vụ)
5. ✅ Update DoctorTimeSlot: `status: "booked"`
6. ✅ Tạo notification cho bác sĩ về lịch hẹn mới
7. ✅ Trả về appointment đã tạo

**Models:**
- `Appointment`: Lưu thông tin lịch hẹn
- `DoctorTimeSlot`: Slot thời gian của bác sĩ
- `Notification`: Thông báo cho bác sĩ

**Trạng thái Appointment:**
- `pending_doctor`: Chờ bác sĩ duyệt (không dùng nữa)
- `accepted`: Đã chấp nhận
- `rejected`: Bị từ chối
- `in_progress`: Đang diễn ra
- `cancelled`: Đã hủy
- `done`: Hoàn tất
- `no_show`: Không đến
- `rescheduled`: Đã dời lịch

### 2.2. Đặt nhiều lịch (Multiple Appointments - Medical Visit)

**File:** `server/controllers/medicalVisitController.js`

**Luồng chi tiết:**

#### Bước 1: Bệnh nhân chọn nhiều chuyên khoa
- Frontend: `client/src/pages/Appointment/dat-lich-nhieu-chuyen-khoa/DatLichNhieuChuyenKhoa.jsx`
- Bệnh nhân chọn nhiều chuyên khoa cần khám
- Hệ thống gợi ý bác sĩ và thời gian phù hợp

#### Bước 2: Tính toán hóa đơn (Pre-payment)
**API:** `POST /api/medical-visits/calculate-payment-summary`

**Request body:**
```json
{
  "visitDate": "YYYY-MM-DD",
  "appointments": [
    {
      "doctorId": "ObjectId",
      "slotId": "ObjectId",
      "mode": "online" | "offline",
      "clinicId": "ObjectId",
      "reason": "Lý do khám"
    }
  ]
}
```

**Xử lý:**
1. ✅ Validate tất cả appointments (slot còn trống, doctor hợp lệ...)
2. ✅ Tính tổng phí từ:
   - Giá khám theo trình độ bác sĩ (EducationLevelPrice)
   - Giá dịch vụ (ServicePrice) nếu có
3. ✅ Trả về payment summary:
   ```json
   {
     "totalAmount": 500000,
     "appointmentSummaries": [
       {
         "doctorId": "...",
         "doctorName": "...",
         "specialization": "...",
         "scheduledStart": "...",
         "fee": 200000
       }
     ]
   }
   ```

#### Bước 3: Tạo Payment và thanh toán
**API:** `POST /api/medical-visits/create-payment`

**Xử lý:**
1. ✅ Tạo Payment với:
   - `invoiceType: "booking"`
   - `status: "pending_manager"` (chờ manager xử lý) hoặc `"initiated"` (tạo PayOS link)
   - `appointmentData`: Lưu thông tin appointments (CHƯA tạo Appointment trong DB)
   - `total`: Tổng phí
2. ✅ Nếu gateway = "payos":
   - Gọi PayOS API tạo payment link
   - Lưu `orderCode` và `payUrl`
   - Trả về `payUrl` cho frontend
3. ✅ Frontend redirect đến PayOS để thanh toán

#### Bước 4: Webhook PayOS (Sau khi thanh toán thành công)
**File:** `server/services/payos.service.js` - `handlePayosWebhook()`

**Luồng:**
1. ✅ PayOS gửi webhook với `orderCode` và `status: "PAID"`
2. ✅ Tìm Payment theo `orderCode`
3. ✅ Update Payment: `status: "captured"`, `paidAt: new Date()`
4. ✅ **Tạo MedicalVisit:**
   - `patientId`: ID bệnh nhân
   - `visitDate`: Ngày khám
   - `status: "scheduled"` (tất cả appointments đã được chấp nhận)
   - `paymentStatus: "paid"`
   - `totalFee`: Tổng phí
5. ✅ **Tạo tất cả Appointments:**
   - Duyệt qua `payment.appointmentData`
   - Tạo Appointment với `status: "accepted"` (auto-accepted)
   - Link appointment với MedicalVisit: `visitId`
   - Update slot: `status: "booked"`
6. ✅ Update Payment: `appointmentIds`, `medicalVisitId`
7. ✅ Gửi notification cho bác sĩ về lịch hẹn mới
8. ✅ Gửi email xác nhận cho bệnh nhân

**Models:**
- `MedicalVisit`: Phiên khám (gom nhiều appointments)
- `Payment`: Hóa đơn thanh toán
- `Appointment`: Từng lịch hẹn trong phiên

---

## 3. 💰 LUỒNG THANH TOÁN (PAYMENT)

### 3.1. Thanh toán đặt lịch (Booking Payment)

**File:** `server/services/payos.service.js`

**Luồng:**
1. **Tạo Payment:**
   - `invoiceType: "booking"`
   - `appointmentId`: ID appointment (single) hoặc `appointmentData` (multiple)
   - `total`: Phí đặt lịch (có thể = 0 nếu miễn phí)
   - `status: "initiated"`

2. **Tạo PayOS Link:**
   - Gọi PayOS API: `createPaymentLink()`
   - Nhận `orderCode` và `checkoutUrl`
   - Lưu `orderCode` vào Payment

3. **Thanh toán:**
   - User thanh toán trên PayOS
   - PayOS gửi webhook về server

4. **Webhook xử lý:**
   - Verify webhook signature
   - Update Payment: `status: "captured"`, `paidAt`
   - Update Appointment: `paymentStatus: "paid"`, `amountPaid`
   - Gửi email xác nhận

### 3.2. Thanh toán dịch vụ (Service Payment)

**Luồng:**
1. **Bác sĩ chọn dịch vụ trong lúc khám:**
   - Frontend: `client/src/pages/Doctor/kham-truc-tiep/KhamTrucTiep.jsx`
   - Bác sĩ chọn services từ danh sách (ServicePrice)
   - Update Appointment: `services`, `totalPay`

2. **Tạo Payment cho dịch vụ:**
   - `invoiceType: "service"`
   - `appointmentId`: ID appointment đang khám
   - `items`: Danh sách dịch vụ
   - `total`: Tổng phí dịch vụ

3. **Thanh toán tương tự booking payment**

**Models:**
- `Payment`: Hóa đơn
- `ServicePrice`: Bảng giá dịch vụ
- `Appointment.services`: Snapshot dịch vụ tại thời điểm bác sĩ chọn

### 3.3. Trạng thái Payment

- `pending_manager`: Chờ manager xử lý (thanh toán tiền mặt tại phòng khám)
- `initiated`: Đã tạo PayOS link, chờ thanh toán
- `authorized`: Đã ủy quyền (chưa capture)
- `captured`: Đã thanh toán thành công
- `failed`: Thanh toán thất bại
- `refunded`: Đã hoàn tiền
- `cancelled`: Đã hủy

---

## 4. 🔄 LUỒNG DỜI LỊCH (RESCHEDULE)

**File:** `server/controllers/rescheduleController.js`

### 4.1. Bệnh nhân yêu cầu dời lịch

**Luồng:**
1. **Bệnh nhân bấm "Dời lịch":**
   - Frontend: `client/src/components/RescheduleButton/RescheduleButton.jsx`
   - Kiểm tra điều kiện:
     - Appointment status: `"accepted"` hoặc `"pending_doctor"`
     - Còn hơn 24 giờ trước lịch hẹn
     - **Chưa có reschedule request nào** (chỉ được dời 1 lần)

2. **Hiển thị modal dời lịch:**
   - Frontend: `client/src/components/RescheduleModal/RescheduleModal.jsx`
   - Bệnh nhân chọn ngày/giờ mới
   - Nhập lý do dời lịch
   - **Xác nhận:** "Bạn chỉ có thể dời lịch được 1 lần và sau khi dời lịch bạn không thể quay lại được lịch cũ. Bạn có chắc chắn muốn dời lịch không?"

3. **Gửi yêu cầu:**
   **API:** `POST /api/reschedule/request`

   **Request body:**
   ```json
   {
     "appointmentId": "ObjectId",
     "newDateTime": "ISO Date",
     "reason": "Lý do dời lịch",
     "mode": "online" | "offline",
     "clinicId": "ObjectId" (nếu offline)
   }
   ```

   **Xử lý backend:**
   - ✅ Kiểm tra appointment thuộc về bệnh nhân
   - ✅ Kiểm tra có thể dời lịch (còn > 24h)
   - ✅ **Kiểm tra chưa có reschedule request nào** (pending, approved, rejected)
   - ✅ Validate thời gian mới (phải trong tương lai)
   - ✅ Tạo RescheduleRequest với:
     - `status: "pending"`
     - `originalAppointmentId`: ID appointment gốc
     - `newDateTime`: Thời gian mới
     - `reason`: Lý do
   - ✅ Gửi notification cho bác sĩ
   - ✅ **Ẩn nút "Dời lịch"** trên frontend (đã có request pending)

4. **Sau khi gửi yêu cầu:**
   - Frontend ẩn nút "Dời lịch"
   - Hiển thị trạng thái "Đang chờ bác sĩ duyệt"

### 4.2. Bác sĩ duyệt yêu cầu dời lịch

**Luồng:**

#### Bác sĩ đồng ý:
**API:** `POST /api/reschedule/:requestId/approve`

**Xử lý:**
1. ✅ Tìm RescheduleRequest với `status: "pending"`
2. ✅ Tìm Appointment gốc
3. ✅ **Tạo Appointment mới:**
   - Copy thông tin từ appointment gốc
   - `scheduledStart`, `scheduledEnd`: Thời gian mới
   - `slotId`: Slot mới (tạo mới hoặc dùng slot có sẵn)
   - `status: "accepted"`
   - `rescheduledFromId`: Link đến appointment gốc
4. ✅ **Update Appointment gốc:**
   - `status: "rescheduled"`
   - `rescheduledToId`: Link đến appointment mới
   - **Giải phóng slot cũ:** Update DoctorTimeSlot: `status: "available"`
5. ✅ **Update RescheduleRequest:**
   - `status: "approved"`
   - `reviewedBy`: ID bác sĩ
   - `reviewedAt`: Thời gian duyệt
6. ✅ Gửi notification cho bệnh nhân
7. ✅ **Gửi email xác nhận** cho bệnh nhân (thông báo dời lịch thành công)

#### Bác sĩ từ chối:
**API:** `POST /api/reschedule/:requestId/reject`

**Xử lý:**
1. ✅ Tìm RescheduleRequest với `status: "pending"`
2. ✅ Update RescheduleRequest:
   - `status: "rejected"`
   - `reviewNotes`: Lý do từ chối
   - `reviewedBy`: ID bác sĩ
   - `reviewedAt`: Thời gian từ chối
3. ✅ Gửi notification cho bệnh nhân
4. ✅ **Gửi email thông báo từ chối** cho bệnh nhân
5. ✅ **Nút "Dời lịch" vẫn bị ẩn** (đã dùng 1 lần)

### 4.3. Quy tắc dời lịch

- ✅ **Chỉ được dời 1 lần** cho mỗi appointment
- ✅ Phải dời trước 24 giờ
- ✅ Nếu bác sĩ từ chối → Không thể dời lại
- ✅ Nếu bác sĩ đồng ý → Appointment mới được tạo, appointment cũ chuyển sang `rescheduled`

**Models:**
- `RescheduleRequest`: Yêu cầu dời lịch
- `Appointment`: Lịch hẹn (có link `rescheduledFromId`, `rescheduledToId`)

---

## 5. 🏥 LUỒNG KHÁM BỆNH (MEDICAL VISIT)

### 5.1. Tạo Medical Visit (Đặt nhiều lịch)

**Đã mô tả ở mục 2.2**

### 5.2. Bác sĩ khám bệnh

**Frontend:** `client/src/pages/Doctor/kham-truc-tiep/KhamTrucTiep.jsx`

**Luồng:**
1. **Bác sĩ xem danh sách lịch hẹn:**
   - API: `GET /api/doctors/appointments`
   - Filter theo status: `"accepted"`, `"in_progress"`

2. **Bác sĩ bắt đầu khám:**
   - Update Appointment: `status: "in_progress"`
   - Update MedicalVisit: `status: "in_progress"` (nếu có)

3. **Bác sĩ chọn dịch vụ:**
   - Chọn từ danh sách ServicePrice
   - Update Appointment:
     - `services`: Array dịch vụ (snapshot)
     - `totalPay`: Tổng phí
   - Tạo Payment với `invoiceType: "service"`

4. **Bác sĩ kết thúc khám:**
   - Update Appointment: `status: "done"`
   - Tạo MedicalVisit record (nếu chưa có)
   - Gửi notification cho bệnh nhân

### 5.3. Bệnh nhân xem hồ sơ khám

**Frontend:** `client/src/pages/Patient/ho-so-suc-khoe/HoSoSucKhoe.jsx`

**Luồng:**
1. Bệnh nhân xem danh sách appointments đã khám
2. Xem chi tiết từng lần khám:
   - Thông tin bác sĩ
   - Dịch vụ đã sử dụng
   - Kết quả khám (nếu có)
   - Đơn thuốc (Prescription) nếu có

**Models:**
- `MedicalVisit`: Phiên khám
- `Appointment`: Lịch hẹn trong phiên
- `Prescription`: Đơn thuốc
- `ConsultationSummary`: Tóm tắt tư vấn

---

## 6. 📹 LUỒNG GỌI VIDEO (VIDEO CALL)

**File:** `server/routes/videoCallRoutes.js`

### 6.1. Tạo cuộc gọi video

**Luồng:**
1. **Bác sĩ/Bệnh nhân bắt đầu cuộc gọi:**
   - API: `POST /api/video-calls/create`
   - Tạo VideoCall record với:
     - `appointmentId`: ID appointment
     - `status: "initiated"`
     - `roomId`: ID phòng (Firebase/Zoom)

2. **Gửi notification:**
   - Bác sĩ gọi → Gửi notification cho bệnh nhân
   - Bệnh nhân gọi → Gửi notification cho bác sĩ

3. **Tham gia cuộc gọi:**
   - Frontend: `client/src/pages/Patient/trang-goi-video/TrangGoiVideo.jsx`
   - Sử dụng WebRTC hoặc Firebase/Zoom SDK
   - Update VideoCall: `status: "in_progress"`

4. **Kết thúc cuộc gọi:**
   - Update VideoCall: `status: "ended"`
   - Lưu thời lượng cuộc gọi
   - Update Appointment: `status: "done"` (nếu đã khám xong)

**Models:**
- `VideoCall`: Thông tin cuộc gọi video

---

## 7. ⭐ LUỒNG ĐÁNH GIÁ (REVIEW)

**File:** `server/controllers/reviewController.js`

### 7.1. Bệnh nhân đánh giá bác sĩ

**Luồng:**
1. **Sau khi khám xong:**
   - Frontend: `client/src/pages/Patient/modal-danh-gia/ModalDanhGia.jsx`
   - Bệnh nhân có thể đánh giá bác sĩ

2. **Tạo Review:**
   **API:** `POST /api/reviews`

   **Request body:**
   ```json
   {
     "appointmentId": "ObjectId",
     "doctorId": "ObjectId",
     "rating": 1-5,
     "comment": "Nhận xét"
   }
   ```

3. **Xử lý:**
   - ✅ Tạo Review record
   - ✅ Tính lại `ratingAvg` và `ratingCount` của Doctor
   - ✅ Update Doctor: `ratingAvg`, `ratingCount`

**Models:**
- `Review`: Đánh giá của bệnh nhân
- `Doctor.ratingAvg`: Điểm trung bình
- `Doctor.ratingCount`: Số lượng đánh giá

---

## 8. 🔔 LUỒNG THÔNG BÁO (NOTIFICATION)

**File:** `server/services/notificationService.js`

### 8.1. Các loại thông báo

1. **Booking Notification:**
   - Khi bệnh nhân đặt lịch → Gửi cho bác sĩ
   - Khi thanh toán thành công → Gửi cho bác sĩ và bệnh nhân

2. **Reschedule Notification:**
   - Khi bệnh nhân yêu cầu dời lịch → Gửi cho bác sĩ
   - Khi bác sĩ duyệt/từ chối → Gửi cho bệnh nhân

3. **Payment Notification:**
   - Khi thanh toán thành công → Gửi cho bệnh nhân
   - Khi thanh toán dịch vụ → Gửi cho bệnh nhân

4. **Video Call Notification:**
   - Khi bác sĩ/bệnh nhân gọi → Gửi cho người còn lại

### 8.2. Cơ chế thông báo

- **In-app notification:** Lưu trong DB (Notification model)
- **Email notification:** Gửi qua email service
- **Push notification:** (Có thể tích hợp Firebase Cloud Messaging)

**Models:**
- `Notification`: Thông báo trong app

---

## 9. 🤖 LUỒNG TƯ VẤN AI

**File:** `server/controllers/aiController.js`

### 9.1. Tư vấn AI

**Luồng:**
1. **Bệnh nhân hỏi AI:**
   - Frontend: `client/src/pages/Patient/tu-van-truc-tuyen/TuVanTrucTuyen.jsx`
   - API: `POST /api/ai/chat`

2. **Xử lý:**
   - Lưu conversation (AiConversation)
   - Lưu message (AiMessage)
   - Gọi OpenAI API để trả lời
   - Lưu response vào DB

3. **Trả về response:**
   - Hiển thị câu trả lời cho bệnh nhân
   - Lưu lịch sử conversation

**Models:**
- `AiConversation`: Cuộc hội thoại
- `AiMessage`: Từng tin nhắn

---

## 10. 👨‍⚕️ LUỒNG QUẢN LÝ BÁC SĨ

### 10.1. Bác sĩ đăng ký

**Đã mô tả ở mục 1.1**

### 10.2. Admin xác minh bác sĩ

**API:** `POST /api/admin/verify-doctor/:doctorId`

**Luồng:**
1. Admin xem danh sách bác sĩ chờ xác minh
2. Admin xem giấy phép hành nghề
3. Admin duyệt/từ chối:
   - **Duyệt:**
     - Update Doctor: `isVerified: true`
     - Update User: `status: "active"`
   - **Từ chối:**
     - Update Doctor: `isVerified: false`
     - Update User: `status: "rejected"`
     - Lưu `rejectionReason`

### 10.3. Bác sĩ quản lý lịch

**Frontend:** `client/src/pages/Doctor/quan-ly-lich/QuanLyLich.jsx`

**Luồng:**
1. Bác sĩ tạo lịch làm việc:
   - Chọn ngày, giờ
   - Tạo DoctorTimeSlot với `status: "available"`

2. Bác sĩ xem lịch hẹn:
   - API: `GET /api/doctors/appointments`
   - Filter theo status, ngày

3. Bác sĩ chấp nhận/từ chối lịch hẹn:
   - **Chấp nhận:** Update Appointment: `status: "accepted"`
   - **Từ chối:** Update Appointment: `status: "rejected"`, `rejectReason`

---

## 11. 👤 LUỒNG QUẢN LÝ BỆNH NHÂN

### 11.1. Bệnh nhân quản lý hồ sơ

**Frontend:** `client/src/pages/Patient/ho-so-suc-khoe/HoSoSucKhoe.jsx`

**Luồng:**
1. Bệnh nhân xem/cập nhật thông tin:
   - FullName, DOB, Gender
   - Medical History
   - Allergy Notes
   - Health Insurance

2. Bệnh nhân quản lý thành viên gia đình:
   - Thêm thành viên (tạo Patient với `relationshipToOwner`)
   - Đặt lịch cho thành viên

### 11.2. Bệnh nhân xem lịch hẹn

**Frontend:** `client/src/pages/Patient/lich-hen-cua-toi/LichHenCuaToi.jsx`

**Luồng:**
1. API: `GET /api/patients/appointments`
2. Filter theo status, ngày
3. Hiển thị danh sách appointments
4. Bệnh nhân có thể:
   - Xem chi tiết
   - Dời lịch (nếu chưa dời)
   - Hủy lịch (nếu còn > 24h)

---

## 12. 👨‍💼 LUỒNG QUẢN LÝ (ADMIN & MANAGER)

### 12.1. Admin

**Chức năng:**
- Xác minh bác sĩ
- Quản lý người dùng (block/unblock)
- Xem thống kê
- Quản lý chuyên khoa
- Quản lý phòng khám

### 12.2. Manager

**Chức năng:**
- Quản lý thanh toán (xác nhận thanh toán tiền mặt)
- Quản lý giá dịch vụ (ServicePrice)
- Quản lý giá theo trình độ (EducationLevelPrice)
- Quản lý yêu cầu nghỉ phép của bác sĩ (LeaveRequest)
- Xem thống kê doanh thu

---

## 📊 SƠ ĐỒ LUỒNG CHÍNH

### Luồng đặt lịch đơn:
```
Bệnh nhân chọn bác sĩ
    ↓
Chọn thời gian (slot)
    ↓
Tạo Appointment (status: accepted)
    ↓
Update Slot (status: booked)
    ↓
Gửi notification cho bác sĩ
    ↓
Thanh toán (nếu cần)
    ↓
Bác sĩ khám
    ↓
Bệnh nhân đánh giá
```

### Luồng đặt nhiều lịch:
```
Bệnh nhân chọn nhiều chuyên khoa
    ↓
Tính toán hóa đơn (calculate-payment-summary)
    ↓
Tạo Payment (appointmentData - chưa tạo Appointment)
    ↓
Thanh toán PayOS
    ↓
Webhook PayOS
    ↓
Tạo MedicalVisit
    ↓
Tạo tất cả Appointments (status: accepted)
    ↓
Gửi notification
```

### Luồng dời lịch:
```
Bệnh nhân yêu cầu dời lịch
    ↓
Tạo RescheduleRequest (status: pending)
    ↓
Gửi notification cho bác sĩ
    ↓
Bác sĩ duyệt/từ chối
    ↓
Nếu đồng ý:
    - Tạo Appointment mới
    - Update Appointment cũ (status: rescheduled)
    - Giải phóng slot cũ
    ↓
Gửi email + notification cho bệnh nhân
```

---

## 🔑 CÁC ĐIỂM QUAN TRỌNG

1. **Appointment chỉ được dời 1 lần:**
   - Kiểm tra RescheduleRequest (pending, approved, rejected)
   - Nếu đã có → Không cho tạo request mới

2. **Thanh toán trước khi tạo Appointment (Multiple):**
   - Payment lưu `appointmentData` (chưa tạo Appointment)
   - Sau khi thanh toán thành công → Mới tạo Appointment

3. **Auto-accept appointments:**
   - Tất cả appointments được tự động chấp nhận (`status: "accepted"`)
   - Không cần bác sĩ duyệt

4. **Slot booking:**
   - Mỗi slot chỉ có 1 appointment active
   - Unique index trên `slotId` với status active

5. **Payment có 2 loại:**
   - `booking`: Thanh toán đặt lịch
   - `service`: Thanh toán dịch vụ

---

## 📝 KẾT LUẬN

Hệ thống MedConnect có các luồng nghiệp vụ phức tạp, bao gồm:
- ✅ Đặt lịch đơn và nhiều lịch
- ✅ Thanh toán qua PayOS
- ✅ Dời lịch (chỉ 1 lần)
- ✅ Gọi video
- ✅ Tư vấn AI
- ✅ Đánh giá bác sĩ
- ✅ Quản lý hồ sơ bệnh nhân

Tất cả các luồng đều có validation, error handling, và notification để đảm bảo trải nghiệm người dùng tốt.

