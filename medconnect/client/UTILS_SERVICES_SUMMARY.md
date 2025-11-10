# Tóm tắt Utils và Services/Hooks hiện có

## 📦 UTILS (`client/src/utils/`)

### 1. **appointmentUtils.jsx** - Xử lý Appointments

**Chức năng:**

- ✅ Format date/time cho appointments
- ✅ Get status config (color, text) cho status tags
- ✅ Transform appointment data để hiển thị
- ✅ Filter appointments: by status, clinic, mode, specialization, doctor name, date range
- ✅ Get unique clinics từ appointments
- ✅ Get relationship text (Bố, Mẹ, Con, etc.)

**Các hàm chính:**

```javascript
-isConfirmedStatus(status) -
  getStatusConfig(status) -
  formatDateTime(dateString) -
  filterByStatus(appointments, status) -
  filterByStatuses(appointments, statuses) -
  filterByClinic(appointments, clinicId) -
  filterByMode(appointments, mode) -
  filterAppointmentsBySpecialization(appointments, specializationId) -
  filterAppointmentsByDoctor(appointments, searchTerm) -
  applyAppointmentFilters(appointments, filters) - // Áp dụng tất cả filters
  getUniqueClinics(appointments) -
  transformAppointmentForDisplay(appointment);
```

---

### 2. **dateUtils.js** - Xử lý Ngày tháng

**Chức năng:**

- ✅ Parse date từ nhiều format (DD/MM/YYYY, Date object, string)
- ✅ Get date range (today, week, month, year)
- ✅ Check date trong range
- ✅ Format month name tiếng Việt
- ✅ Get days in month cho calendar
- ✅ Get record date từ object (tìm trong nhiều fields)

**Các hàm chính:**

```javascript
-parseDate(dateSource) -
  getRecordDate(record, dateFields) -
  getDateRange(preset) - // 'today', 'week', 'month', 'year'
  isDateInRange(date, start, end) -
  getDaysInMonth(date) -
  getMonthRange(date) -
  formatMonthName(date) - // "tháng 11 năm 2025"
  isCurrentMonth(date);
```

---

### 3. **filterUtils.js** - Filter tổng quát

**Chức năng:**

- ✅ Filter records by doctor name
- ✅ Filter records by specialization
- ✅ Filter records by consultation type
- ✅ Filter records by date range (preset/custom)
- ✅ Apply all filters cùng lúc

**Các hàm chính:**

```javascript
-filterByDoctor(records, searchTerm) -
  filterBySpecialization(records, specializationId, specializations) -
  filterByConsultationType(records, type) -
  filterByDateRange(records, preset, customRange, dateFields) -
  applyFilters(records, filters, specializations, dateFields);
```

---

### 4. **paymentUtils.js** - Xử lý Thanh toán

**Chức năng:**

- ✅ Format payment amount (VND)
- ✅ Get payment status config (color, text)
- ✅ Format payment method name

**Các hàm chính:**

```javascript
-formatPaymentAmount(amount) - // "100.000 ₫"
  getPaymentStatusConfig(status) - // { text, color, className }
  formatPaymentMethod(method); // "Tiền mặt", "VNPAY", etc.
```

---

### 5. **statsUtils.js** - Tính toán Thống kê

**Chức năng:**

- ✅ Calculate appointment statistics (confirmed, pending, completed, cancelled)
- ✅ Get trend text based on count

**Các hàm chính:**

```javascript
-calculateAppointmentStats(appointments) -
  getTrendText(count, positiveText, negativeText);
```

---

### 6. **Các Utils khác:**

- `familyMemberUtils.js` - Xử lý người thân
- `doctorUtils.js` - Xử lý bác sĩ
- `validationUtils.js` - Validation forms
- `imageUtils.js` - Xử lý hình ảnh
- `formUtils.js` - Xử lý forms
- `searchUtils.js` - Xử lý search
- `reviewUtils.js` - Xử lý reviews
- `notificationUtils.jsx` - Xử lý notifications
- `urlUtils.js` - Xử lý URLs
- `clientUtils.js` - Client utilities
- `greetingUtils.js` - Greeting messages
- `clearUserData.js` - Clear user data
- `leafletFix.js` - Leaflet map fix
- `videoCallUtils.js` - Video call utilities

---

## 🎣 HOOKS (`client/src/hooks/`)

### 1. **useAppointments.js** - Fetch Appointments

**Chức năng:**

- ✅ Fetch appointments từ API (`/api/patients/me/appointments`)
- ✅ Quản lý loading state
- ✅ Quản lý error state
- ✅ Có `refreshAppointments()` để refresh data
- ✅ Có `setAppointments()` để update state

**Return:**

```javascript
{
  appointments: Array,
  loading: boolean,
  error: Error | null,
  refreshAppointments: Function,
  setAppointments: Function
}
```

---

### 2. **useSpecializations.js** - Fetch Specializations

**Chức năng:**

- ✅ Fetch specializations từ API (`/api/specializations`)
- ✅ Quản lý loading state
- ✅ Quản lý error state

**Return:**

```javascript
{
  specializations: Array,
  isLoading: boolean,
  error: Error | null
}
```

---

### 3. **useAuth.js** - Authentication

**Chức năng:**

- ✅ Lắng nghe Firebase auth state changes
- ✅ Trả về current user
- ✅ Quản lý loading state

**Return:**

```javascript
{
  user: FirebaseUser | null,
  loading: boolean
}
```

---

### 4. **useUserProfile.js** - User Profile

**Chức năng:**

- ✅ Fetch user profile từ API (kết hợp Firebase + API)
- ✅ Priority: Patient profile > User data > Firebase data
- ✅ Quản lý loading/error state
- ✅ Có `refreshProfile()` để refresh

**Return:**

```javascript
{
  userProfile: Object, // Combined profile data
  loading: boolean,
  error: string | null,
  refreshProfile: Function
}
```

**Profile data bao gồm:**

- uid, email, phone, displayName, photoURL
- fullName, avatar, avatarUrl
- role, appUserId
- dob, gender, nationalId, address
- wardCode, districtCode, provinceCode
- relationshipToOwner
- bloodType, allergyNotes
- profileComplete

---

### 5. **Các Hooks khác:**

- `useAppointmentDetails.js` - Fetch appointment details
- `useConsultations.js` - Fetch consultations
- `useConsultationSummaries.js` - Fetch consultation summaries
- `useConsultationAdvice.js` - Fetch consultation advice
- `useFamilyMembers.js` - Fetch family members
- `useFavoriteDoctors.js` - Fetch favorite doctors
- `useFavoriteToggle.js` - Toggle favorite doctor
- `useNotifications.js` - Fetch notifications
- `usePatientAppointments.js` - Fetch patient appointments
- `useDoctor.js` - Fetch doctor details
- `useDoctorVisitCounts.js` - Fetch doctor visit counts
- `useClinics.js` - Fetch clinics
- `useLocations.js` - Fetch locations
- `useMultipleFamilyConsultationSummaries.js` - Fetch multiple family consultation summaries
- `useMultipleFamilyConsultationAdvice.js` - Fetch multiple family consultation advice

---

## 🔌 SERVICES (`client/src/services/`)

### 1. **payService.js** - PayOS Payment

**Chức năng:**

- ✅ Tạo link thanh toán PayOS
- ✅ Kiểm tra trạng thái thanh toán
- ✅ Hủy link thanh toán

**Các hàm chính:**

```javascript
-createPayOSPayment(paymentData) - // { appointmentId, amount, description }
  checkPayOSStatus(orderCode) -
  cancelPayOSPayment(orderCode);
```

---

### 2. **userService.js** - User Authentication

**Chức năng:**

- ✅ Request password OTP
- ✅ Verify password OTP
- ✅ Reset password with token

**Các hàm chính:**

```javascript
-requestPasswordOtp(email) -
  verifyPasswordOtp(email, otp) -
  resetPasswordWithToken(token, email, newPassword, confirmPassword);
```

---

### 3. **Các Services khác:**

- `jitsiService.js` - Jitsi video call
- `videoCallAPI.js` - Video call API
- `productService.js` - Product service
- `todoService.js` - Todo service

---

## 🔄 Luồng sử dụng

### Ví dụ: Hiển thị Appointments

```javascript
// 1. Component sử dụng Hook để fetch data
function MyAppointments() {
  const { appointments, loading } = useAppointments();
  const { specializations } = useSpecializations();

  // 2. Sử dụng Utils để filter/format data
  const upcomingAppointments = filterByStatuses(appointments, [
    "pending_doctor",
    "accepted",
  ]);
  const filteredAppointments = applyAppointmentFilters(
    upcomingAppointments,
    filters
  );

  // 3. Format để hiển thị
  const formattedAppointments = filteredAppointments.map((apt) => {
    const { date, time } = formatDateTime(apt.scheduledStart);
    return { ...apt, date, time };
  });

  return <div>{/* Hiển thị */}</div>;
}
```

### Ví dụ: Thanh toán

```javascript
// 1. Component gọi Service để tạo payment
function PaymentButton() {
  const handlePayment = async () => {
    // 2. Gọi Service
    const result = await createPayOSPayment({
      appointmentId: "123",
      amount: 100000,
      description: "Thanh toán lịch hẹn",
    });

    // 3. Sử dụng Utils để format
    const formattedAmount = formatPaymentAmount(result.amount);

    // Redirect to payment URL
    window.location.href = result.data.payUrl;
  };

  return <button onClick={handlePayment}>Thanh toán</button>;
}
```

---

## 📊 Tổng kết

### Utils (19 files)

- **appointmentUtils.jsx**: Filter, format appointments
- **dateUtils.js**: Parse, format dates
- **filterUtils.js**: Filter records
- **paymentUtils.js**: Format payments
- **statsUtils.js**: Calculate statistics
- **+ 14 utils khác**: familyMember, doctor, validation, image, form, search, review, notification, url, client, greeting, clearUserData, leafletFix, videoCall

### Hooks (19 files)

- **useAppointments.js**: Fetch appointments
- **useSpecializations.js**: Fetch specializations
- **useAuth.js**: Firebase auth
- **useUserProfile.js**: User profile
- **+ 15 hooks khác**: appointments, consultations, family members, favorites, notifications, doctors, clinics, locations, etc.

### Services (6 files)

- **payService.js**: PayOS payment
- **userService.js**: User authentication
- **jitsiService.js**: Jitsi video call
- **videoCallAPI.js**: Video call API
- **productService.js**: Product service
- **todoService.js**: Todo service

---

## ✅ Best Practices

1. **Utils**: Pure functions, không gọi API, dễ test
2. **Hooks**: React hooks, quản lý state, fetch data
3. **Services**: API calls, không có React state, có thể dùng trong hooks

**Khi refactor:**

- Tách logic filter/format → Utils
- Tách API calls → Services
- Tách state management → Hooks
- Component chỉ render UI và gọi hooks/services/utils
