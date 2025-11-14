# 📋 RÀ SOÁT TOÀN BỘ THÔNG BÁO THEO ROLE

## 🎯 MỤC TIÊU
Rà soát tất cả các chức năng chính của từng role (PATIENT, DOCTOR, MANAGER, ADMIN) và đảm bảo:
- ✅ Có thông báo cho các sự kiện quan trọng
- ❌ Bỏ thông báo thừa/trùng lặp
- ➕ Thêm thông báo còn thiếu

---

## 👤 ROLE: PATIENT (Bệnh nhân)

### Chức năng chính cần thông báo:

| # | Chức Năng | Sự Kiện | Người Nhận | Thông Báo | Status |
|---|-----------|---------|-----------|-----------|--------|
| 1 | Đặt lịch hẹn | Đặt lịch thành công | Bệnh nhân | "Đặt lịch hẹn thành công" | ✅ |
| 2 | Đặt lịch hẹn | Đặt lịch thành công | Bác sĩ | "Có lịch hẹn mới" | ✅ |
| 3 | Thanh toán | Thanh toán thành công | Bệnh nhân | "Thanh toán thành công" | ✅ |
| 4 | Thanh toán dịch vụ | Thanh toán dịch vụ thành công | Bệnh nhân | "Thanh toán dịch vụ thành công" | ✅ |
| 5 | Hủy lịch hẹn | Hủy lịch thành công | Bác sĩ | "Bệnh nhân đã hủy lịch hẹn" | ✅ |
| 6 | Dời lịch hẹn | Yêu cầu dời lịch | Bác sĩ | "Có yêu cầu dời lịch" | ✅ |
| 7 | Dời lịch hẹn | Yêu cầu được chấp nhận | Bệnh nhân | "Lịch hẹn đã được dời" | ✅ |
| 8 | Dời lịch hẹn | Yêu cầu bị từ chối | Bệnh nhân | "Yêu cầu dời lịch bị từ chối" | ✅ |
| 9 | Lịch hẹn | Lịch hẹn được xác nhận | Bệnh nhân | "Lịch hẹn đã được xác nhận" | ✅ |
| 10 | Lịch hẹn | Lịch hẹn bị từ chối | Bệnh nhân | "Lịch hẹn bị từ chối" | ✅ |
| 11 | Lịch hẹn | Cuộc hẹn hoàn thành | Bệnh nhân | "Cuộc hẹn đã hoàn thành" | ✅ |
| 12 | Lịch hẹn | Lịch hẹn bị hủy (bác sĩ) | Bệnh nhân | "Lịch hẹn đã bị hủy" | ✅ |
| 13 | Lịch hẹn | Không đến khám (no_show) | Bệnh nhân | "Bạn đã không đến khám" | ✅ |
| 14 | Lịch hẹn | Lịch hẹn auto-expire | Bệnh nhân | "Lịch hẹn đã bị hủy" (do không thanh toán) | ✅ |
| 15 | Nhắc nhở | Video call 10 phút trước | Bệnh nhân | "⏰ Nhắc nhở: Cuộc gọi video sắp bắt đầu" | ✅ |
| 16 | Nhắc nhở | Lịch hẹn 24h trước | Bệnh nhân | "Nhắc nhở lịch hẹn" | ✅ |
| 17 | Quản lý dời lịch | Quản lý dời lịch | Bệnh nhân | "Lịch hẹn đã được dời bởi quản lý" | ✅ |

---

## 👨‍⚕️ ROLE: DOCTOR (Bác sĩ)

### Chức năng chính cần thông báo:

| # | Chức Năng | Sự Kiện | Người Nhận | Thông Báo | Status |
|---|-----------|---------|-----------|-----------|--------|
| 1 | Nhận lịch hẹn | Có lịch hẹn mới | Bác sĩ | "Có lịch hẹn mới" | ✅ |
| 2 | Nhận lịch hẹn | Quản lý tạo lịch | Bác sĩ | "Có lịch hẹn mới (Quản lý tạo)" | ✅ |
| 3 | Xác nhận lịch | Chấp nhận lịch | Bệnh nhân | "Lịch hẹn đã được xác nhận" | ✅ |
| 4 | Xác nhận lịch | Từ chối lịch | Bệnh nhân | "Lịch hẹn bị từ chối" | ✅ |
| 5 | Cập nhật trạng thái | Status = "accepted" | Bệnh nhân | "Lịch hẹn đã được xác nhận" | ✅ |
| 6 | Cập nhật trạng thái | Status = "rejected" | Bệnh nhân | "Lịch hẹn bị từ chối" | ✅ |
| 7 | Cập nhật trạng thái | Status = "done" | Bệnh nhân | "Cuộc hẹn đã hoàn thành" | ✅ |
| 8 | Cập nhật trạng thái | Status = "cancelled" | Bệnh nhân | "Lịch hẹn đã bị hủy" | ✅ |
| 9 | Cập nhật trạng thái | Status = "no_show" | Bệnh nhân | ⚠️ **THIẾU** | ❌ |
| 10 | Cập nhật trạng thái | Status = "in_progress" | Bệnh nhân | "Cuộc hẹn đã bắt đầu" | ✅ |
| 11 | Bệnh nhân hủy | Bệnh nhân hủy lịch | Bác sĩ | "Bệnh nhân đã hủy lịch hẹn" | ✅ |
| 12 | Dời lịch | Nhận yêu cầu dời lịch | Bác sĩ | "Có yêu cầu dời lịch" | ✅ |
| 13 | Dời lịch | Chấp nhận yêu cầu dời | Bệnh nhân | "Lịch hẹn đã được dời" | ✅ |
| 14 | Dời lịch | Từ chối yêu cầu dời | Bệnh nhân | "Yêu cầu dời lịch bị từ chối" | ✅ |
| 15 | Quản lý dời lịch | Quản lý dời lịch | Bác sĩ | "Lịch hẹn đã được dời bởi quản lý" | ✅ |
| 16 | Tạo lịch | Tạo lịch cho bệnh nhân | Bệnh nhân | "Đặt lịch hẹn thành công" | ✅ |
| 17 | Tạo lịch | Tạo lịch cho bệnh nhân | Bác sĩ | "Có lịch hẹn mới" | ✅ |
| 18 | Nghỉ phép | Tạo yêu cầu nghỉ phép | Manager | "Có yêu cầu nghỉ phép" | ✅ |
| 19 | Nghỉ phép | Yêu cầu được chấp nhận | Bác sĩ | "Yêu cầu nghỉ phép đã được chấp nhận" | ✅ |
| 20 | Nghỉ phép | Yêu cầu bị từ chối | Bác sĩ | "Yêu cầu nghỉ phép bị từ chối" | ✅ |
| 21 | Thanh toán dịch vụ | Tạo thanh toán dịch vụ | Bệnh nhân | ⚠️ **CẦN XÁC NHẬN** | ⚠️ |
| 22 | Thanh toán dịch vụ | Manager xử lý thanh toán | Bác sĩ | ⚠️ **CẦN XÁC NHẬN** | ⚠️ |

---

## 👔 ROLE: MANAGER (Quản lý)

### Chức năng chính cần thông báo:

| # | Chức Năng | Sự Kiện | Người Nhận | Thông Báo | Status |
|---|-----------|---------|-----------|-----------|--------|
| 1 | Tạo lịch hẹn | Tạo lịch cho bệnh nhân | Bệnh nhân | "Đặt lịch hẹn thành công" | ✅ |
| 2 | Tạo lịch hẹn | Tạo lịch cho bệnh nhân | Bác sĩ | "Có lịch hẹn mới (Quản lý tạo)" | ✅ |
| 3 | Dời lịch hẹn | Dời lịch trực tiếp | Bệnh nhân | "Lịch hẹn đã được dời bởi quản lý" | ✅ |
| 4 | Dời lịch hẹn | Dời lịch trực tiếp | Bác sĩ | "Lịch hẹn đã được dời bởi quản lý" | ✅ |
| 5 | Thanh toán tiền mặt | Xử lý thanh toán tiền mặt | Bệnh nhân | "Thanh toán tiền mặt thành công" | ✅ |
| 6 | Thanh toán chuyển khoản | Xử lý thanh toán chuyển khoản | Bệnh nhân | ⚠️ **CẦN XÁC NHẬN** (có thể dùng chung với cash) | ⚠️ |
| 7 | Nghỉ phép | Nhận yêu cầu nghỉ phép | Manager | "Có yêu cầu nghỉ phép" | ✅ |
| 8 | Nghỉ phép | Chấp nhận yêu cầu | Bác sĩ | "Yêu cầu nghỉ phép đã được chấp nhận" | ✅ |
| 9 | Nghỉ phép | Từ chối yêu cầu | Bác sĩ | "Yêu cầu nghỉ phép bị từ chối" | ✅ |
| 10 | Thanh toán dịch vụ | Xử lý thanh toán dịch vụ | Bệnh nhân | ⚠️ **CẦN XÁC NHẬN** | ⚠️ |
| 11 | Thanh toán dịch vụ | Xử lý thanh toán dịch vụ | Bác sĩ | ⚠️ **CẦN XÁC NHẬN** | ⚠️ |

---

## 👑 ROLE: ADMIN (Quản trị viên)

### Chức năng chính cần thông báo:

| # | Chức Năng | Sự Kiện | Người Nhận | Thông Báo | Status |
|---|-----------|---------|-----------|-----------|--------|
| 1 | Duyệt bác sĩ | Chấp nhận đăng ký bác sĩ | Bác sĩ | "Đơn đăng ký bác sĩ đã được phê duyệt" | ✅ |
| 2 | Duyệt bác sĩ | Từ chối đăng ký bác sĩ | Bác sĩ | "Đơn đăng ký bác sĩ bị từ chối" | ✅ |
| 3 | Quản lý người dùng | Khóa tài khoản (ban) | Người dùng | "Tài khoản của bạn đã bị cấm" | ✅ |
| 4 | Quản lý người dùng | Tạm khóa (suspend) | Người dùng | "Tài khoản của bạn đã bị tạm khóa" | ✅ |
| 5 | Quản lý người dùng | Kích hoạt lại | Người dùng | "Tài khoản của bạn đã được kích hoạt" | ✅ |
| 6 | Quản lý người dùng | Xóa tài khoản | Người dùng | ⚠️ **KHÔNG CẦN** (user đã bị xóa) | ✅ |
| 7 | Quản lý người dùng | Tạo tài khoản mới | Người dùng | "Tài khoản của bạn đã được tạo" | ✅ |
| 8 | Quản lý người dùng | Đổi mật khẩu | Người dùng | "Mật khẩu của bạn đã được đổi" | ✅ |
| 9 | Quản lý lịch hẹn | Cập nhật trạng thái lịch hẹn | Bệnh nhân/Bác sĩ | ⚠️ **CẦN XÁC NHẬN** | ⚠️ |
| 10 | Quản lý lịch hẹn | Xóa lịch hẹn | Bệnh nhân/Bác sĩ | ⚠️ **CẦN XÁC NHẬN** | ⚠️ |
| 11 | Quản lý chuyên khoa | Thêm chuyên khoa | - | Không cần | ✅ |
| 12 | Quản lý chuyên khoa | Cập nhật chuyên khoa | - | Không cần | ✅ |
| 13 | Quản lý chuyên khoa | Xóa chuyên khoa | - | Không cần | ✅ |

---

## 📊 TỔNG KẾT

### ✅ Đã có thông báo: **20 loại**
### ❌ Thiếu thông báo: **15 loại**
### ⚠️ Cần xác nhận: **6 loại**

---

## 🎯 CẦN THỰC HIỆN

### 1. Thêm thông báo còn thiếu (15 loại):
- [ ] Patient: no_show notification
- [ ] Doctor: Leave request approved
- [ ] Doctor: Leave request rejected
- [ ] Manager: Bank transfer payment success
- [ ] Manager: Leave request approved notification
- [ ] Manager: Leave request rejected notification
- [ ] Admin: Doctor registration approved
- [ ] Admin: Doctor registration rejected
- [ ] Admin: User banned
- [ ] Admin: User suspended
- [ ] Admin: User activated
- [ ] Admin: User deleted
- [ ] Admin: User created
- [ ] Admin: User password changed
- [ ] Service payment: Manager processing notification

### 2. Xác nhận và thêm nếu cần (6 loại):
- [ ] Appointment status "in_progress" notification
- [ ] Service payment created notification
- [ ] Service payment manager processing notification
- [ ] Admin update appointment status notification
- [ ] Admin delete appointment notification
- [ ] Payment status "captured" notification

### 3. Kiểm tra và bỏ thông báo thừa:
- [ ] Đã sửa: Trùng lặp booking notification khi thanh toán thành công ✅

---

## 📝 LƯU Ý

1. **Thông báo quan trọng**: Tất cả các thông báo về lịch hẹn, thanh toán, và thay đổi trạng thái đều quan trọng
2. **Thông báo admin**: Các thao tác của admin ảnh hưởng trực tiếp đến người dùng nên cần thông báo
3. **Thông báo manager**: Các thao tác của manager cũng cần thông báo cho bệnh nhân và bác sĩ
4. **Thông báo doctor**: Các thao tác của doctor cần thông báo cho bệnh nhân

