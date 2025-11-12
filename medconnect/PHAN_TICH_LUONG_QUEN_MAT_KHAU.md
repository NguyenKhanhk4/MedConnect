# PHÂN TÍCH LUỒNG CHẠY CHỨC NĂNG QUÊN MẬT KHẨU, GỬI OTP, ĐỔI MẬT KHẨU

## TỔNG QUAN

Luồng quên mật khẩu được chia thành **3 bước chính**:
1. **Quên mật khẩu (Forgot Password)**: Người dùng nhập email → Hệ thống gửi OTP qua email
2. **Xác minh OTP (Verify OTP)**: Người dùng nhập OTP → Hệ thống xác minh và trả về reset token
3. **Đặt lại mật khẩu (Reset Password)**: Người dùng nhập mật khẩu mới → Hệ thống cập nhật mật khẩu

---

## BƯỚC 1: QUÊN MẬT KHẨU (FORGOT PASSWORD)

### 1.1. Frontend - Component `QuenMatKhau.jsx`

**File**: `client/src/pages/Auth/quen-mat-khau/QuenMatKhau.jsx`

**Luồng hoạt động**:
1. Người dùng nhập email vào form
2. Khi submit form, gọi hàm `requestPasswordOtp(email)` từ `userService.js`
3. Nếu thành công:
   - Hiển thị thông báo thành công
   - Sau 800ms, chuyển hướng đến trang `/xac-minh-otp` kèm theo `email` trong navigation state
4. Nếu thất bại:
   - Hiển thị thông báo lỗi từ server

**Code chính**:
```jsx
const onSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setMessage("");
  try {
    setLoading(true);
    const response = await requestPasswordOtp(email.trim());
    setMessage(response.message || "Nếu email hợp lệ, mã OTP đã được gửi...");
    setTimeout(() => navigate("/xac-minh-otp", { state: { email } }), 800);
  } catch (err) {
    // Xử lý lỗi
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};
```

### 1.2. Frontend Service - `requestPasswordOtp()`

**File**: `client/src/services/userService.js`

**Chức năng**:
- Gửi POST request đến endpoint `/api/auth/forgot`
- Body: `{ email }`
- Trả về response từ server

**Code**:
```javascript
export async function requestPasswordOtp(email) {
  const r = await fetch(`${BASE}/api/auth/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
```

### 1.3. Backend Route

**File**: `server/routes/authRoutes.js`

**Route**: `POST /api/auth/forgot`
**Handler**: `forgotPassword`

```javascript
router.post("/forgot", forgotPassword);
```

### 1.4. Backend Controller - `forgotPassword()`

**File**: `server/controllers/authController.js` (dòng 1081-1160)

**Luồng xử lý chi tiết**:

#### Bước 1: Validate Input
- Kiểm tra email có tồn tại không
- Validate format email bằng regex: `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i`
- Nếu thiếu email → Trả về lỗi 400: "Thiếu email"
- Nếu email không hợp lệ → Trả về lỗi 400: "Email không hợp lệ"

#### Bước 2: Tìm User trong Database
```javascript
const user = await User.findOne({
  email: String(email).toLowerCase().trim(),
  status: "active",
});
```
- Tìm user theo email (chuyển về lowercase, trim)
- Chỉ tìm user có status = "active"
- Nếu không tìm thấy → Trả về lỗi 404: "Email không tồn tại trong hệ thống"

#### Bước 3: Kiểm tra OTP đang hoạt động (Rate Limiting)
```javascript
const existingReset = await PasswordReset.findOne({
  userId: user._id,
  type: "reset",
  used: false,
  expiresAt: { $gt: new Date() },
});
```
- Kiểm tra xem user này đã có OTP đang hoạt động chưa (chưa dùng, chưa hết hạn)
- Nếu có OTP đang hoạt động và số lần thử >= 5 → Trả về lỗi 429: "Bạn đã thử quá nhiều lần"

**Mục đích**: Chống brute-force attack và spam request

#### Bước 4: Tạo OTP mới
```javascript
const otp = generateOTP(); // Tạo OTP 6 chữ số (100000-999999)
const codeHash = await bcrypt.hash(otp, 10); // Hash OTP bằng bcrypt
const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Hết hạn sau 10 phút
```

**Hàm `generateOTP()`** (dòng 955-957):
```javascript
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```
- Tạo OTP ngẫu nhiên 6 chữ số (từ 100000 đến 999999)
- Trả về dạng string

#### Bước 5: Xóa OTP cũ
```javascript
await PasswordReset.deleteMany({
  userId: user._id,
  type: "reset",
});
```
- Xóa tất cả OTP cũ của user này (type = "reset")
- Đảm bảo chỉ có 1 OTP hoạt động tại một thời điểm

#### Bước 6: Lưu OTP vào Database
```javascript
await PasswordReset.create({
  userId: user._id,
  email: user.email,
  codeHash: codeHash,      // Hash của OTP (để bảo mật)
  otp: otp,                // OTP thực (để so sánh trực tiếp)
  type: "reset",
  expiresAt: expiresAt,    // Hết hạn sau 10 phút
  used: false,             // Chưa được sử dụng
  attempts: 0,             // Số lần thử = 0
});
```

**Model `PasswordReset`** (file: `server/models/passwordReset.model.js`):
- `userId`: ID của user
- `email`: Email của user
- `codeHash`: Hash của OTP (dùng bcrypt)
- `otp`: OTP thực (lưu plain text để so sánh nhanh)
- `type`: Loại OTP ("reset" hoặc "verify")
- `expiresAt`: Thời gian hết hạn
- `used`: Đã sử dụng chưa
- `attempts`: Số lần thử OTP sai
- `createdAt`: Thời gian tạo

**Lưu ý**: 
- Có index TTL (Time To Live) trên `expiresAt` để tự động xóa record khi hết hạn
- `PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })`

#### Bước 7: Gửi OTP qua Email
```javascript
await sendOtpMail(user.email, otp);
```

**Hàm `sendOtpMail()`** (dòng 945-952):
```javascript
async function sendOtpMail(to, otp) {
  await sendMail({
    to,
    subject: "Mã OTP đặt lại mật khẩu (hiệu lực 10 phút)",
    text: `Mã OTP của bạn là: ${otp}. Mã sẽ hết hạn sau 10 phút.`,
    html: `<p>Mã OTP của bạn là: <b>${otp}</b></p><p>Mã sẽ hết hạn sau <b>10 phút</b>.</p>`,
  });
}
```

**Hàm `sendMail()`** (file: `server/utils/email.js`):
- Sử dụng `nodemailer` để gửi email
- Cấu hình SMTP từ environment variables:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USERNAME`
  - `SMTP_PASSWORD`
  - `SMTP_FROMNAME`
  - `SMTP_FROMEMAIL`

#### Bước 8: Trả về Response
```javascript
return ok(res, {
  ok: true,
  message: "Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.",
  email: user.email, // Trả về email để frontend sử dụng
});
```

**Response Format**:
- Status: 200
- Body: `{ ok: true, message: "...", email: "..." }`

---

## BƯỚC 2: XÁC MINH OTP (VERIFY OTP)

### 2.1. Frontend - Component `XacMinhOtp.jsx`

**File**: `client/src/pages/Auth/xac-minh-otp/XacMinhOtp.jsx`

**Luồng hoạt động**:
1. Nhận `email` từ navigation state (từ bước 1)
2. Người dùng nhập OTP vào form
3. Khi submit, gọi hàm `verifyPasswordOtp(email, otp)` từ `userService.js`
4. Nếu thành công:
   - Lấy `resetToken` từ response
   - Chuyển hướng đến trang `/dat-lai-mat-khau` kèm theo `token` và `email` trong navigation state
5. Nếu thất bại:
   - Hiển thị thông báo lỗi từ server

**Code chính**:
```jsx
const onSubmit = async (e) => {
  e.preventDefault();
  setError("");
  try {
    setLoading(true);
    const res = await verifyPasswordOtp(email.trim(), otp.trim());
    const token = res?.data?.resetToken || res?.resetToken;
    navigate("/dat-lai-mat-khau", { state: { token, email } });
  } catch (err) {
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};
```

**Lưu ý**: 
- Email được lấy từ navigation state (không cho phép chỉnh sửa)
- Token được lưu trong memory (navigation state), không lưu vào localStorage để bảo mật

### 2.2. Frontend Service - `verifyPasswordOtp()`

**File**: `client/src/services/userService.js`

**Chức năng**:
- Gửi POST request đến endpoint `/api/auth/verify-otp`
- Body: `{ email, otp }`
- Trả về response chứa `resetToken`

**Code**:
```javascript
export async function verifyPasswordOtp(email, otp) {
  const r = await fetch(`${BASE}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, otp })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
```

### 2.3. Backend Route

**File**: `server/routes/authRoutes.js`

**Route**: `POST /api/auth/verify-otp`
**Handler**: `verifyPasswordOtp`

```javascript
router.post("/verify-otp", verifyPasswordOtp);
```

### 2.4. Backend Controller - `verifyPasswordOtp()`

**File**: `server/controllers/authController.js` (dòng 1166-1238)

**Luồng xử lý chi tiết**:

#### Bước 1: Validate Input
- Kiểm tra `email` và `otp` có tồn tại không
- Nếu thiếu → Trả về lỗi 400: "Thiếu dữ liệu"

#### Bước 2: Tìm User
```javascript
const user = await User.findOne({
  email: String(email).toLowerCase().trim(),
  status: "active",
});
```
- Tìm user theo email (chuyển về lowercase, trim)
- Chỉ tìm user có status = "active"
- Nếu không tìm thấy → Trả về lỗi 400: "OTP không hợp lệ"

#### Bước 3: Tìm OTP Record
```javascript
const resetRecord = await PasswordReset.findOne({
  userId: user._id,
  email: user.email,
  type: "reset",
  used: false,
  expiresAt: { $gt: new Date() },
});
```
- Tìm OTP record của user này:
  - `userId` khớp
  - `email` khớp
  - `type` = "reset"
  - `used` = false (chưa dùng)
  - `expiresAt` > hiện tại (chưa hết hạn)

- Nếu không tìm thấy → Trả về lỗi 400: "OTP không hợp lệ hoặc đã hết hạn"

#### Bước 4: Kiểm tra Số Lần Thử
```javascript
if (resetRecord.attempts >= 5) {
  return fail(
    res,
    429,
    ERROR_CODES.TOO_MANY_REQUESTS,
    "Quá số lần thử. Vui lòng yêu cầu OTP mới."
  );
}
```
- Nếu số lần thử >= 5 → Trả về lỗi 429: "Quá số lần thử"
- **Mục đích**: Chống brute-force attack

#### Bước 5: So sánh OTP
```javascript
if (String(otp) !== resetRecord.otp) {
  // Tăng số lần thử
  resetRecord.attempts += 1;
  await resetRecord.save();
  return fail(res, 400, ERROR_CODES.BAD_REQUEST, "OTP không hợp lệ");
}
```
- So sánh OTP người dùng nhập với OTP đã lưu trong database (so sánh trực tiếp, không hash)
- Nếu không khớp:
  - Tăng `attempts` lên 1
  - Lưu lại record
  - Trả về lỗi 400: "OTP không hợp lệ"

**Lưu ý**: 
- OTP được lưu plain text trong database để so sánh nhanh
- `codeHash` không được sử dụng ở đây (có thể dùng cho mục đích khác hoặc bảo mật thêm)

#### Bước 6: Tạo Reset Token (JWT)
```javascript
const resetToken = jwt.sign(
  { sub: String(user._id), purpose: "reset" },
  process.env.JWT_RESET_SECRET,
  { expiresIn: process.env.JWT_RESET_EXPIRES || "15m" }
);
```
- Tạo JWT token với:
  - Payload: `{ sub: user._id, purpose: "reset" }`
  - Secret: `process.env.JWT_RESET_SECRET`
  - Expires: 15 phút (mặc định) hoặc từ `JWT_RESET_EXPIRES`

#### Bước 7: Hash Reset Token và Cập nhật Record
```javascript
const tokenHash = crypto
  .createHash("sha256")
  .update(resetToken)
  .digest("hex");

resetRecord.codeHash = tokenHash; // Lưu hash của reset token
resetRecord.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Gia hạn 15 phút
resetRecord.used = false; // Chưa dùng để reset password
await resetRecord.save();
```
- Hash reset token bằng SHA-256
- Lưu hash vào `codeHash` (thay thế hash của OTP)
- Gia hạn `expiresAt` thêm 15 phút (thời gian hiệu lực của reset token)
- `used` vẫn là `false` (sẽ được set thành `true` khi reset password thành công)

#### Bước 8: Trả về Reset Token
```javascript
return ok(res, { resetToken });
```

**Response Format**:
- Status: 200
- Body: `{ resetToken: "..." }`

**Lưu ý bảo mật**:
- Reset token chỉ có hiệu lực 15 phút
- Token được hash và lưu trong database để verify sau này
- Token chỉ có thể dùng 1 lần (sau khi reset password, `used` sẽ được set thành `true`)

---

## BƯỚC 3: ĐẶT LẠI MẬT KHẨU (RESET PASSWORD)

### 3.1. Frontend - Component `DatLaiMatKhau.jsx`

**File**: `client/src/pages/Auth/dat-lai-mat-khau/DatLaiMatKhau.jsx`

**Luồng hoạt động**:
1. Nhận `token` và `email` từ navigation state (từ bước 2)
2. Nếu không có token/email → Redirect về `/quen-mat-khau`
3. Người dùng nhập mật khẩu mới và xác nhận mật khẩu
4. Khi submit, gọi hàm `resetPasswordWithToken(token, email, newPassword, confirmPassword)` từ `userService.js`
5. Nếu thành công:
   - Hiển thị thông báo thành công
   - Sau 1 giây, chuyển hướng đến trang `/dang-nhap`
6. Nếu thất bại:
   - Hiển thị thông báo lỗi từ server

**Code chính**:
```jsx
useEffect(() => {
  const t = location.state?.token;
  const e = location.state?.email;
  if (t && e) {
    setToken(t);
    setEmail(e);
  } else {
    navigate("/quen-mat-khau");
  }
}, [location.state]);

const onSubmit = async (e) => {
  e.preventDefault();
  // Validate input
  if (!email || !password || !confirm) {
    setError("Vui lòng điền đầy đủ thông tin.");
    return;
  }
  if (password.length < 8) {
    setError("Mật khẩu phải có ít nhất 8 ký tự.");
    return;
  }
  if (password !== confirm) {
    setError("Mật khẩu xác nhận không khớp.");
    return;
  }
  
  try {
    setLoading(true);
    await resetPasswordWithToken(token.trim(), email.trim(), password, confirm);
    setMessage("Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.");
    setTimeout(() => navigate("/dang-nhap"), 1000);
  } catch (err) {
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};
```

**Validation ở Frontend**:
- Email: Bắt buộc
- Password: Bắt buộc, tối thiểu 8 ký tự
- Confirm Password: Bắt buộc, phải khớp với password

### 3.2. Frontend Service - `resetPasswordWithToken()`

**File**: `client/src/services/userService.js`

**Chức năng**:
- Gửi POST request đến endpoint `/api/auth/reset`
- Body: `{ token, email, newPassword, confirmPassword }`
- Trả về response từ server

**Code**:
```javascript
export async function resetPasswordWithToken(token, email, newPassword, confirmPassword) {
  console.log("resetPasswordWithToken called with:", { 
    token: token?.substring(0, 20) + "...", 
    email, 
    newPassword: "***", 
    confirmPassword: "***" 
  });
  const r = await fetch(`${BASE}/api/auth/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token, email, newPassword, confirmPassword })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
```

### 3.3. Backend Route

**File**: `server/routes/authRoutes.js`

**Route**: `POST /api/auth/reset`
**Handler**: `resetPassword`

```javascript
router.post("/reset", resetPassword);
```

### 3.4. Backend Controller - `resetPassword()`

**File**: `server/controllers/authController.js` (dòng 1244-1367)

**Luồng xử lý chi tiết**:

#### Bước 1: Validate Input
```javascript
const { token, email, newPassword, confirmPassword } = req.body || {};
if (!token || !email || !newPassword || !confirmPassword) {
  return fail(res, 400, ERROR_CODES.BAD_REQUEST, "Thiếu dữ liệu bắt buộc");
}
```
- Kiểm tra tất cả các trường bắt buộc
- Nếu thiếu → Trả về lỗi 400: "Thiếu dữ liệu bắt buộc"

#### Bước 2: Validate Email Format
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
if (!emailRegex.test(email)) {
  return fail(res, 400, ERROR_CODES.BAD_REQUEST, "Email không hợp lệ");
}
```
- Validate format email bằng regex
- Nếu không hợp lệ → Trả về lỗi 400: "Email không hợp lệ"

#### Bước 3: Validate Password
```javascript
if (newPassword.length < 8) {
  return fail(
    res,
    400,
    ERROR_CODES.BAD_REQUEST,
    "Mật khẩu phải có ít nhất 8 ký tự"
  );
}

if (newPassword !== confirmPassword) {
  return fail(
    res,
    400,
    ERROR_CODES.BAD_REQUEST,
    "Mật khẩu xác nhận không khớp"
  );
}
```
- Kiểm tra độ dài mật khẩu (tối thiểu 8 ký tự)
- Kiểm tra mật khẩu xác nhận có khớp không
- Nếu không hợp lệ → Trả về lỗi 400

#### Bước 4: Verify JWT Token
```javascript
let payload;
try {
  payload = jwt.verify(token, process.env.JWT_RESET_SECRET);
  if (payload?.purpose !== "reset") throw new Error("bad purpose");
} catch {
  return fail(
    res,
    400,
    ERROR_CODES.BAD_REQUEST,
    "Mã xác thực không hợp lệ"
  );
}
```
- Verify JWT token bằng secret key
- Kiểm tra `purpose` phải là "reset"
- Nếu không hợp lệ → Trả về lỗi 400: "Mã xác thực không hợp lệ"

#### Bước 5: Hash Reset Token và Tìm Record
```javascript
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

const resetRecord = await PasswordReset.findOne({
  userId: payload.sub,
  codeHash: tokenHash,
  type: "reset",
  used: false,
  expiresAt: { $gt: new Date() },
});
```
- Hash reset token bằng SHA-256 (giống như bước 2)
- Tìm OTP record với:
  - `userId` = `payload.sub` (user ID từ JWT)
  - `codeHash` = hash của reset token
  - `type` = "reset"
  - `used` = false (chưa dùng)
  - `expiresAt` > hiện tại (chưa hết hạn)

- Nếu không tìm thấy → Trả về lỗi 400: "Mã xác thực không hợp lệ hoặc đã hết hạn"

**Lưu ý**: 
- Token phải khớp với hash đã lưu trong database
- Token chỉ có thể dùng 1 lần (sau khi reset, `used` sẽ được set thành `true`)
- Token có thời hạn (15 phút)

#### Bước 6: Tìm User và Kiểm tra Email
```javascript
const user = await User.findById(payload.sub).select("+passwordHash");
if (!user) {
  return fail(
    res,
    400,
    ERROR_CODES.BAD_REQUEST,
    "Người dùng không tồn tại"
  );
}

if (user.email.toLowerCase() !== email.toLowerCase()) {
  return fail(
    res,
    400,
    ERROR_CODES.BAD_REQUEST,
    "Email không khớp với tài khoản đã gửi OTP"
  );
}
```
- Tìm user theo ID từ JWT payload
- Select thêm `passwordHash` (vì trong schema đang `select: false`)
- Kiểm tra email có khớp với email trong request không
- Nếu không khớp → Trả về lỗi 400: "Email không khớp với tài khoản đã gửi OTP"

**Mục đích**: Đảm bảo người dùng nhập đúng email của mình

#### Bước 7: Hash Mật khẩu mới và Cập nhật
```javascript
const hashed = await hashPassword(newPassword);
user.passwordHash = hashed;
await user.save();
```

**Hàm `hashPassword()`** (file: `server/helpers/auth.js`):
```javascript
export async function hashPassword(plain) {
  if (!plain) return null;
  try {
    // Use argon2 for new passwords
    return await argon2.hash(plain);
  } catch (e) {
    console.error("❌ Password hashing error:", e);
    throw new Error("Failed to hash password");
  }
}
```
- Sử dụng `argon2` để hash mật khẩu (thay vì bcrypt)
- Argon2 là thuật toán hash mật khẩu hiện đại và an toàn hơn
- Cập nhật `passwordHash` của user
- Lưu user vào database

#### Bước 8: Đánh dấu Reset Record đã được sử dụng
```javascript
resetRecord.used = true;
await resetRecord.save();
```
- Set `used` = `true` để đánh dấu reset token đã được sử dụng
- Token không thể dùng lại

#### Bước 9: Trả về Response
```javascript
return ok(res, { ok: true, message: "Đổi mật khẩu thành công" });
```

**Response Format**:
- Status: 200
- Body: `{ ok: true, message: "Đổi mật khẩu thành công" }`

---

## SƠ ĐỒ LUỒNG TỔNG QUAN

```
┌─────────────────────────────────────────────────────────────────┐
│                    BƯỚC 1: QUÊN MẬT KHẨU                        │
└─────────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
   Frontend                            Backend
   QuenMatKhau.jsx              forgotPassword()
        │                                   │
        │ 1. Nhập email                    │
        │ 2. requestPasswordOtp(email)     │
        │──────────────────────────────────>│
        │                                   │ 3. Validate email
        │                                   │ 4. Tìm user
        │                                   │ 5. Kiểm tra rate limit
        │                                   │ 6. Tạo OTP (6 số)
        │                                   │ 7. Xóa OTP cũ
        │                                   │ 8. Lưu OTP vào DB
        │                                   │ 9. Gửi OTP qua email
        │                                   │
        │<──────────────────────────────────│
        │ { ok: true, message: "..." }     │
        │                                   │
        │ 10. Chuyển đến /xac-minh-otp     │
        │     (kèm email trong state)      │
        │                                   │
        └───────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BƯỚC 2: XÁC MINH OTP                         │
└─────────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
   Frontend                            Backend
   XacMinhOtp.jsx              verifyPasswordOtp()
        │                                   │
        │ 1. Nhận email từ state           │
        │ 2. Nhập OTP                      │
        │ 3. verifyPasswordOtp(email, otp) │
        │──────────────────────────────────>│
        │                                   │ 4. Validate input
        │                                   │ 5. Tìm user
        │                                   │ 6. Tìm OTP record
        │                                   │ 7. Kiểm tra số lần thử
        │                                   │ 8. So sánh OTP
        │                                   │ 9. Tạo reset token (JWT)
        │                                   │ 10. Hash token (SHA-256)
        │                                   │ 11. Cập nhật record
        │                                   │
        │<──────────────────────────────────│
        │ { resetToken: "..." }            │
        │                                   │
        │ 12. Chuyển đến /dat-lai-mat-khau │
        │     (kèm token, email trong state)│
        │                                   │
        └───────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 BƯỚC 3: ĐẶT LẠI MẬT KHẨU                        │
└─────────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
   Frontend                            Backend
   DatLaiMatKhau.jsx              resetPassword()
        │                                   │
        │ 1. Nhận token, email từ state    │
        │ 2. Nhập mật khẩu mới             │
        │ 3. resetPasswordWithToken(...)   │
        │──────────────────────────────────>│
        │                                   │ 4. Validate input
        │                                   │ 5. Validate email format
        │                                   │ 6. Validate password
        │                                   │ 7. Verify JWT token
        │                                   │ 8. Hash token (SHA-256)
        │                                   │ 9. Tìm reset record
        │                                   │ 10. Tìm user
        │                                   │ 11. Kiểm tra email khớp
        │                                   │ 12. Hash mật khẩu mới (argon2)
        │                                   │ 13. Cập nhật user.passwordHash
        │                                   │ 14. Đánh dấu record.used = true
        │                                   │
        │<──────────────────────────────────│
        │ { ok: true, message: "..." }     │
        │                                   │
        │ 15. Chuyển đến /dang-nhap        │
        │                                   │
        └───────────────────────────────────┘
```

---

## CÁC ĐIỂM BẢO MẬT

### 1. Rate Limiting (Chống Brute-force)
- **OTP Request**: Kiểm tra số lần thử OTP (tối đa 5 lần)
- **OTP Verification**: Tăng số lần thử mỗi lần nhập sai OTP
- **Token Expiration**: OTP hết hạn sau 10 phút, reset token hết hạn sau 15 phút

### 2. Token Security
- **JWT Token**: Sử dụng JWT với secret key riêng (`JWT_RESET_SECRET`)
- **Token Hash**: Hash token bằng SHA-256 trước khi lưu vào database
- **Single Use**: Token chỉ có thể dùng 1 lần (sau khi reset, `used` = `true`)
- **Token Expiration**: Token có thời hạn (15 phút)

### 3. Password Security
- **Password Hashing**: Sử dụng Argon2 để hash mật khẩu (thay vì bcrypt)
- **Password Validation**: Mật khẩu tối thiểu 8 ký tự
- **Password Confirmation**: Yêu cầu nhập lại mật khẩu để xác nhận

### 4. Email Verification
- **Email Validation**: Validate format email ở cả frontend và backend
- **Email Matching**: Kiểm tra email có khớp với tài khoản đã gửi OTP không
- **Active User Only**: Chỉ cho phép reset mật khẩu cho user có status = "active"

### 5. Data Storage
- **OTP Storage**: OTP được lưu plain text để so sánh nhanh (có thể cải thiện bằng cách hash)
- **Token Storage**: Token hash được lưu trong database để verify
- **TTL Index**: Sử dụng TTL index để tự động xóa record khi hết hạn

### 6. Frontend Security
- **Token Storage**: Token được lưu trong memory (navigation state), không lưu vào localStorage
- **State Validation**: Kiểm tra token/email có tồn tại trong state trước khi reset password
- **Auto Redirect**: Tự động redirect về trang quên mật khẩu nếu thiếu token/email

---

## CÁC ĐIỂM CẦN LƯU Ý

### 1. OTP Storage
- Hiện tại OTP được lưu plain text trong database để so sánh nhanh
- **Cải thiện**: Có thể hash OTP và so sánh bằng bcrypt để tăng tính bảo mật

### 2. Error Handling
- Frontend cần xử lý các lỗi từ server một cách chi tiết
- Backend cần trả về thông báo lỗi rõ ràng cho người dùng

### 3. Email Delivery
- Cần đảm bảo email được gửi thành công
- Có thể thêm retry mechanism nếu email gửi thất bại
- Có thể thêm email template đẹp hơn

### 4. Logging
- Cần log các hoạt động quan trọng (gửi OTP, verify OTP, reset password)
- Cần log các lỗi để debug

### 5. Testing
- Cần test các trường hợp:
  - OTP hết hạn
  - OTP sai nhiều lần
  - Token hết hạn
  - Token đã được sử dụng
  - Email không tồn tại
  - User không active

---

## TÓM TẮT

### Luồng hoạt động:
1. **Quên mật khẩu**: User nhập email → Server tạo OTP (6 số) → Gửi OTP qua email → Lưu OTP vào database
2. **Xác minh OTP**: User nhập OTP → Server so sánh OTP → Tạo reset token (JWT) → Trả về token
3. **Đặt lại mật khẩu**: User nhập mật khẩu mới → Server verify token → Hash mật khẩu mới → Cập nhật database → Đánh dấu token đã dùng

### Bảo mật:
- Rate limiting (tối đa 5 lần thử OTP)
- Token expiration (OTP: 10 phút, Reset token: 15 phút)
- Single-use token
- Password hashing (Argon2)
- Email verification
- Token storage in memory (không lưu localStorage)

### Database Schema:
- **PasswordReset**: Lưu OTP, reset token hash, số lần thử, thời gian hết hạn
- **User**: Lưu password hash (Argon2)

### API Endpoints:
- `POST /api/auth/forgot` - Yêu cầu OTP
- `POST /api/auth/verify-otp` - Xác minh OTP
- `POST /api/auth/reset` - Đặt lại mật khẩu
