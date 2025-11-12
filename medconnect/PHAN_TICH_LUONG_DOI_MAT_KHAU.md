# PHÂN TÍCH LUỒNG HOẠT ĐỘNG CHỨC NĂNG ĐỔI MẬT KHẨU

## TỔNG QUAN
Chức năng đổi mật khẩu cho phép người dùng (bác sĩ và bệnh nhân) thay đổi mật khẩu tài khoản khi đã đăng nhập vào hệ thống. Chức năng này yêu cầu người dùng nhập mật khẩu hiện tại để xác thực trước khi cho phép đặt mật khẩu mới.

**Lưu ý quan trọng:**
- Chức năng này chỉ dành cho người dùng đã đăng nhập (yêu cầu authentication)
- Không cần OTP như chức năng reset password (quên mật khẩu)
- Hỗ trợ cả bác sĩ và bệnh nhân - cùng một luồng xử lý
- Mật khẩu được hash bằng Argon2 (thuật toán hiện đại và an toàn)

---

## KIẾN TRÚC TỔNG THỂ

```
[Frontend UI] → [API Client] → [Express Route] → [Auth Guard] → [Controller] → [Database]
   (React)        (api.js)      (authRoutes.js)   (auth.js)    (authController.js)  (MongoDB)
```

---

## CHI TIẾT LUỒNG HOẠT ĐỘNG

### 1. FRONTEND - GIAO DIỆN NGƯỜI DÙNG

#### 1.1. Trang Cài Đặt Bác Sĩ
**File:** `client/src/pages/Doctor/cai-dat/CaiDat.jsx`

**Cấu trúc component:**
- Component sử dụng React hooks: `useState` để quản lý state
- State quản lý:
  - `passwordData`: Object chứa `currentPassword`, `newPassword`, `confirmPassword`
  - `passwordErrors`: Object chứa các lỗi validation
  - `showPassword`: Boolean để hiển thị/ẩn mật khẩu

**Code chi tiết:**

```javascript
// State management
const [passwordData, setPasswordData] = useState({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const [passwordErrors, setPasswordErrors] = useState({});
const [showPassword, setShowPassword] = useState(false);
```

#### 1.2. Validation phía Client (Bác sĩ)

**File:** `client/src/pages/Doctor/cai-dat/CaiDat.jsx` (dòng 234-259)

```javascript
const validatePassword = () => {
  const errors = {};

  // 1. Kiểm tra mật khẩu hiện tại
  if (!passwordData.currentPassword) {
    errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
  }

  // 2. Kiểm tra mật khẩu mới
  if (!passwordData.newPassword) {
    errors.newPassword = "Vui lòng nhập mật khẩu mới";
  } else if (passwordData.newPassword.length < 8) {
    errors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
  }

  // 3. Kiểm tra xác nhận mật khẩu
  if (!passwordData.confirmPassword) {
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
  } else if (passwordData.newPassword !== passwordData.confirmPassword) {
    errors.confirmPassword = "Mật khẩu xác nhận không khớp";
  }

  // 4. Kiểm tra mật khẩu mới phải khác mật khẩu cũ
  if (passwordData.currentPassword === passwordData.newPassword) {
    errors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
  }

  setPasswordErrors(errors);
  return Object.keys(errors).length === 0;
};
```

**Giải thích:**
1. **Validation mật khẩu hiện tại:** Kiểm tra không được để trống
2. **Validation mật khẩu mới:** 
   - Không được để trống
   - Phải có ít nhất 8 ký tự
3. **Validation xác nhận mật khẩu:**
   - Không được để trống
   - Phải khớp với mật khẩu mới
4. **Kiểm tra khác biệt:** Mật khẩu mới phải khác mật khẩu hiện tại

#### 1.3. Handler đổi mật khẩu (Bác sĩ)

**File:** `client/src/pages/Doctor/cai-dat/CaiDat.jsx` (dòng 261-308)

```javascript
const handleChangePassword = async () => {
  // 1. Validate trước khi gửi request
  if (!validatePassword()) {
    return; // Dừng nếu validation thất bại
  }

  try {
    // 2. Gọi API để đổi mật khẩu
    await changePassword(
      passwordData.currentPassword,
      passwordData.newPassword
    );

    // 3. Xử lý thành công
    showAlert("Mật khẩu đã được thay đổi thành công");
    
    // 4. Reset form
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
  } catch (error) {
    console.error("Error changing password:", error);

    // 5. Xử lý lỗi từ API
    if (error.status === 400 && error.response?.message) {
      const errorMessage = error.response.message;
      
      // 5.1. Lỗi mật khẩu hiện tại không đúng
      if (
        errorMessage.includes("Mật khẩu hiện tại không đúng") ||
        errorMessage.includes("mật khẩu hiện tại")
      ) {
        setPasswordErrors({
          currentPassword: "Mật khẩu hiện tại không đúng",
        });
      } 
      // 5.2. Lỗi mật khẩu mới phải khác mật khẩu cũ
      else if (errorMessage.includes("khác mật khẩu hiện tại")) {
        setPasswordErrors({
          newPassword: "Mật khẩu mới phải khác mật khẩu hiện tại",
        });
      } 
      // 5.3. Lỗi khác
      else {
        showAlert(errorMessage || "Có lỗi xảy ra khi đổi mật khẩu");
      }
    } else {
      // 5.4. Lỗi không xác định
      showAlert(
        error.response?.message ||
        error.message ||
        "Có lỗi xảy ra khi thay đổi mật khẩu"
      );
    }
  }
};
```

**Luồng xử lý:**
1. **Validation:** Kiểm tra dữ liệu trước khi gửi
2. **API Call:** Gọi hàm `changePassword` từ `api.js`
3. **Success:** Hiển thị thông báo và reset form
4. **Error Handling:** Xử lý các lỗi cụ thể và hiển thị thông báo phù hợp

#### 1.4. Trang Cài Đặt Bệnh Nhân
**File:** `client/src/pages/Patient/cai-dat/CaiDat.jsx`

**Cấu trúc tương tự như bác sĩ nhưng có một số khác biệt:**

**Validation (dòng 419-454):**

```javascript
const handleChangePassword = async () => {
  try {
    setIsChangingPassword(true);

    // Validate password fields
    const passwordErrors = {};

    // 1. Kiểm tra mật khẩu hiện tại
    if (!formData.currentPassword?.trim()) {
      passwordErrors.currentPassword = "Mật khẩu hiện tại là bắt buộc";
    }

    // 2. Kiểm tra mật khẩu mới
    if (!formData.newPassword?.trim()) {
      passwordErrors.newPassword = "Mật khẩu mới là bắt buộc";
    } else if (formData.newPassword.length < 8) {
      passwordErrors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
    }

    // 3. Kiểm tra xác nhận mật khẩu
    if (!formData.confirmPassword?.trim()) {
      passwordErrors.confirmPassword = "Xác nhận mật khẩu là bắt buộc";
    } else if (formData.confirmPassword !== formData.newPassword) {
      passwordErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    // 4. Kiểm tra mật khẩu mới phải khác mật khẩu cũ
    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      passwordErrors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
    }

    // 5. Dừng nếu có lỗi
    if (Object.keys(passwordErrors).length > 0) {
      setFieldErrors(passwordErrors);
      return;
    }

    // 6. Gọi API
    try {
      await changePassword(formData.currentPassword, formData.newPassword);

      // 7. Clear form on success
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      // 8. Clear errors
      setFieldErrors((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      // 9. Show success message
      setAlertMessage("Đổi mật khẩu thành công!");
    } catch (error) {
      // Error handling...
    } finally {
      setIsChangingPassword(false);
    }
  } catch (error) {
    // Error handling...
    setIsChangingPassword(false);
  }
};
```

**Điểm khác biệt so với bác sĩ:**
- Sử dụng `formData` thay vì `passwordData`
- Có state `isChangingPassword` để hiển thị trạng thái loading
- Sử dụng `trim()` để loại bỏ khoảng trắng
- Xử lý lỗi chi tiết hơn với `setFieldErrors`

---

### 2. API CLIENT LAYER

**File:** `client/src/lib/api.js` (dòng 156-192)

```javascript
export async function changePassword(currentPassword, newPassword) {
  try {
    // 1. Tạo HTTP request
    const r = await fetch(`${BASE}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Quan trọng: Gửi cookie session
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    // 2. Xử lý response không thành công
    if (!r.ok) {
      const errorText = await r.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || "Có lỗi xảy ra khi đổi mật khẩu" };
      }
      const error = new Error(
        errorData.message || "Có lỗi xảy ra khi đổi mật khẩu"
      );
      error.status = r.status;
      error.response = errorData;
      throw error;
    }

    // 3. Trả về JSON response
    return await r.json();
  } catch (error) {
    console.error("Error changing password:", error);
    throw error;
  }
}
```

**Giải thích:**
1. **HTTP Request:** 
   - Method: POST
   - Endpoint: `/api/auth/change-password`
   - Headers: `Content-Type: application/json`
   - `credentials: "include"`: Quan trọng - gửi cookie session để xác thực
   - Body: JSON chứa `currentPassword` và `newPassword`

2. **Error Handling:**
   - Kiểm tra `r.ok` để xác định response thành công
   - Parse error response từ server
   - Tạo Error object với status và response data
   - Throw error để component có thể catch và xử lý

3. **Success Response:**
   - Parse và trả về JSON response từ server

---

### 3. EXPRESS ROUTE

**File:** `server/routes/authRoutes.js` (dòng 37-38)

```javascript
// === Change password (yêu cầu đăng nhập) ===
router.post("/change-password", authGuard, changePassword);
```

**Giải thích:**
- **Route:** `POST /api/auth/change-password`
- **Middleware:** `authGuard` - Xác thực người dùng trước khi xử lý
- **Controller:** `changePassword` - Hàm xử lý logic đổi mật khẩu

**Luồng xử lý:**
1. Request đến route `/api/auth/change-password`
2. Middleware `authGuard` được gọi trước
3. Nếu `authGuard` thành công, `changePassword` controller được gọi
4. Nếu `authGuard` thất bại, trả về lỗi 401 Unauthorized

---

### 4. AUTHENTICATION MIDDLEWARE (authGuard)

**File:** `server/middleware/auth.js` (dòng 8-48)

```javascript
export async function authGuard(req, res, next) {
  // 1. Lấy session cookie từ request
  const cookie = req.cookies[COOKIE_NAME] || "";
  
  console.log("🔍 AuthGuard - Cookie present:", !!cookie);
  
  // 2. Kiểm tra cookie có tồn tại không
  if (!cookie) {
    console.log("❌ No session cookie found");
    return fail(res, 401, "UNAUTHORIZED", "No session cookie found");
  }
  
  try {
    // 3. Verify session cookie với Firebase Admin
    const decoded = await admin.auth().verifySessionCookie(cookie, true);
    console.log("🔍 AuthGuard - Decoded token:", { 
      uid: decoded.uid, 
      email: decoded.email, 
      app_user_id: decoded.app_user_id, 
      customClaims: decoded 
    });
    
    // 4. Lấy email từ Firebase nếu chưa có trong token
    if (!decoded.email && decoded.uid) {
      try {
        console.log("🔍 AuthGuard - Getting user from Firebase Admin for uid:", decoded.uid);
        const userRecord = await admin.auth().getUser(decoded.uid);
        decoded.email = userRecord.email;
        decoded.displayName = userRecord.displayName;
        console.log("🔍 AuthGuard - Retrieved email from Firebase Admin:", decoded.email);
      } catch (adminError) {
        console.error("❌ Failed to get user from Firebase Admin:", adminError);
      }
    }
    
    // 5. Đảm bảo app_user_id có sẵn (optional)
    if (!decoded.app_user_id && decoded.uid) {
      console.log("⚠️ No app_user_id found in decoded token, but continuing with uid");
      // Don't fail here, just log a warning
    }
    
    // 6. Gán user info vào request object
    console.log("🔍 AuthGuard - Final user object:", { 
      uid: decoded.uid, 
      email: decoded.email, 
      app_user_id: decoded.app_user_id 
    });
    req.user = decoded;
    
    // 7. Gọi next() để chuyển sang controller
    next();
  } catch (e) {
    console.error("❌ authGuard error:", e);
    return fail(res, 401, "UNAUTHORIZED", e.message || String(e));
  }
}
```

**Giải thích chi tiết:**

1. **Lấy Cookie:**
   - Lấy session cookie từ `req.cookies[COOKIE_NAME]`
   - `COOKIE_NAME` là tên cookie session (được định nghĩa trong constants)

2. **Kiểm tra Cookie:**
   - Nếu không có cookie, trả về lỗi 401 Unauthorized
   - Dừng xử lý, không chuyển sang controller

3. **Verify Session Cookie:**
   - Sử dụng Firebase Admin SDK để verify session cookie
   - `verifySessionCookie(cookie, true)`: Verify và check revoked status
   - Trả về decoded token chứa thông tin người dùng

4. **Lấy Thông Tin Người Dùng:**
   - Nếu token không chứa email, lấy từ Firebase Admin
   - Đảm bảo có đầy đủ thông tin: `uid`, `email`, `app_user_id`

5. **Gán vào Request:**
   - Gán `decoded` vào `req.user`
   - Controller có thể truy cập thông tin người dùng qua `req.user`

6. **Chuyển Sang Controller:**
   - Gọi `next()` để chuyển sang controller `changePassword`
   - Nếu có lỗi, trả về lỗi 401 và dừng xử lý

**Thông tin trong `req.user`:**
- `uid`: Firebase User ID
- `email`: Email người dùng
- `app_user_id`: MongoDB User ID (ObjectId)
- `displayName`: Tên hiển thị
- Các custom claims khác từ token

---

### 5. CONTROLLER - changePassword

**File:** `server/controllers/authController.js` (dòng 1394-1484)

```javascript
/**
 * POST /api/auth/change-password
 * body: { currentPassword, newPassword }
 *
 * Đổi mật khẩu khi đã đăng nhập vào tài khoản.
 * Không cần OTP - chỉ cần nhập đúng mật khẩu hiện tại.
 * Yêu cầu: người dùng phải đã đăng nhập (authGuard).
 */
export async function changePassword(req, res) {
  try {
    // ========== BƯỚC 1: LẤY VÀ VALIDATE INPUT ==========
    const { currentPassword, newPassword } = req.body || {};
    
    // 1.1. Kiểm tra các trường bắt buộc
    if (!currentPassword || !newPassword) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Thiếu mật khẩu hiện tại hoặc mật khẩu mới"
      );
    }

    // 1.2. Validate độ dài mật khẩu mới
    if (newPassword.length < 8) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mật khẩu mới phải có ít nhất 8 ký tự"
      );
    }

    // ========== BƯỚC 2: LẤY THÔNG TIN NGƯỜI DÙNG ==========
    // 2.1. Lấy user ID từ req.user (đã được authGuard xác thực)
    const userId = req.user?.app_user_id;
    if (!userId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Không tìm thấy thông tin người dùng"
      );
    }

    // 2.2. Tìm user trong database và lấy passwordHash
    // Lưu ý: passwordHash mặc định không được select (select: false trong schema)
    // Nên phải dùng .select("+passwordHash") để lấy ra
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) {
      return fail(
        res,
        404,
        ERROR_CODES.USER_NOT_FOUND,
        "Người dùng không tồn tại"
      );
    }

    // ========== BƯỚC 3: XÁC THỰC MẬT KHẨU HIỆN TẠI ==========
    // 3.1. So sánh mật khẩu hiện tại với passwordHash trong database
    const isCurrentPasswordValid = await verifyPassword(
      user.passwordHash,
      currentPassword
    );
    
    // 3.2. Kiểm tra kết quả
    if (!isCurrentPasswordValid) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mật khẩu hiện tại không đúng"
      );
    }

    // ========== BƯỚC 4: KIỂM TRA MẬT KHẨU MỚI ==========
    // 4.1. Kiểm tra mật khẩu mới có khác mật khẩu cũ không
    const isSamePassword = await verifyPassword(user.passwordHash, newPassword);
    if (isSamePassword) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mật khẩu mới phải khác mật khẩu hiện tại"
      );
    }

    // ========== BƯỚC 5: HASH VÀ LƯU MẬT KHẨU MỚI ==========
    // 5.1. Hash mật khẩu mới bằng Argon2
    const hashedNewPassword = await hashPassword(newPassword);
    
    // 5.2. Cập nhật passwordHash trong database
    user.passwordHash = hashedNewPassword;
    await user.save();

    // ========== BƯỚC 6: TRẢ VỀ KẾT QUẢ ==========
    return ok(res, {
      ok: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (e) {
    console.error("changePassword error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}
```

**Giải thích từng bước:**

#### Bước 1: Lấy và Validate Input
- **Lấy dữ liệu:** Từ `req.body`, lấy `currentPassword` và `newPassword`
- **Kiểm tra bắt buộc:** Đảm bảo cả hai trường đều có giá trị
- **Validate độ dài:** Mật khẩu mới phải có ít nhất 8 ký tự

#### Bước 2: Lấy Thông Tin Người Dùng
- **Lấy User ID:** Từ `req.user.app_user_id` (đã được authGuard set)
- **Tìm User:** Query database với `User.findById(userId).select("+passwordHash")`
  - `.select("+passwordHash")`: Quan trọng - vì `passwordHash` có `select: false` trong schema
  - Nếu không dùng `.select("+passwordHash")`, field này sẽ không được trả về

#### Bước 3: Xác Thực Mật Khẩu Hiện Tại
- **Verify Password:** Sử dụng `verifyPassword(user.passwordHash, currentPassword)`
- **Kiểm tra kết quả:** Nếu không đúng, trả về lỗi 400

#### Bước 4: Kiểm Tra Mật Khẩu Mới
- **So sánh với mật khẩu cũ:** Đảm bảo mật khẩu mới khác mật khẩu hiện tại
- **Verify:** Sử dụng `verifyPassword` để so sánh
- **Nếu giống:** Trả về lỗi 400

#### Bước 5: Hash và Lưu Mật Khẩu Mới
- **Hash Password:** Sử dụng `hashPassword(newPassword)` để hash bằng Argon2
- **Cập nhật Database:** Gán `user.passwordHash = hashedNewPassword` và save

#### Bước 6: Trả Về Kết Quả
- **Success Response:** Trả về `{ ok: true, message: "Đổi mật khẩu thành công" }`
- **Error Handling:** Nếu có lỗi, trả về lỗi 500 với thông báo lỗi

---

### 6. PASSWORD HASHING & VERIFICATION

**File:** `server/helpers/auth.js`

#### 6.1. Hash Password

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

**Giải thích:**
- **Thuật toán:** Argon2 (thuật toán hash mật khẩu hiện đại và an toàn)
- **Input:** Plain text password
- **Output:** Hashed password string (bắt đầu với `$argon2`)
- **Error Handling:** Throw error nếu hash thất bại

**Tại sao dùng Argon2?**
- Argon2 là winner của Password Hashing Competition (PHC)
- Chống lại các cuộc tấn công: brute-force, rainbow table, GPU-based attacks
- Có thể tùy chỉnh memory cost, time cost, parallelism
- An toàn hơn bcrypt trong nhiều trường hợp

#### 6.2. Verify Password

```javascript
export async function verifyPassword(hash, plain) {
  if (!hash || !plain) return false;
  try {
    // 1. Kiểm tra nếu hash là Argon2
    if (hash.startsWith("$argon2")) {
      return await argon2.verify(hash, plain);
    }
    // 2. Kiểm tra nếu hash là bcrypt (backward compatibility)
    if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
      return await bcrypt.compare(plain, hash);
    }
    // 3. Không hỗ trợ format hash khác
    return false;
  } catch {
    return false;
  }
}
```

**Giải thích:**
- **Hỗ trợ nhiều thuật toán:** Argon2 và bcrypt (backward compatibility)
- **Argon2:** Hash bắt đầu với `$argon2`
- **Bcrypt:** Hash bắt đầu với `$2a$`, `$2b$`, hoặc `$2y$`
- **So sánh:** Sử dụng hàm verify của từng thuật toán
- **Error Handling:** Trả về `false` nếu có lỗi

**Tại sao hỗ trợ cả Argon2 và bcrypt?**
- **Backward Compatibility:** Mật khẩu cũ có thể được hash bằng bcrypt
- **Migration:** Cho phép hệ thống chuyển đổi từ bcrypt sang Argon2 dần dần
- **Flexibility:** Người dùng cũ vẫn có thể đăng nhập và đổi mật khẩu

---

### 7. DATABASE MODEL

#### 7.1. User Model

**File:** `server/models/user.model.js`

```javascript
const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    firebaseUID: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: {
      type: String,
      select: false, // Quan trọng: Không trả về mặc định
      required: function () {
        return this.authProvider === "local";
      },
    },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin", "manager"],
      default: "patient",
    },
    status: {
      type: String,
      enum: ["active", "blocked", "pending", "rejected", "banned", "suspended"],
      default: "active",
    },
    // ... các field khác
  },
  { timestamps: true, versionKey: false, collection: "Users" }
);
```

**Giải thích:**
- **passwordHash:**
  - `select: false`: Mặc định không trả về khi query (bảo mật)
  - `required: function() { return this.authProvider === "local"; }`: Chỉ bắt buộc với local auth
  - Lưu trữ hash của mật khẩu (không lưu plain text)

- **role:** 
  - Enum: `["patient", "doctor", "admin", "manager"]`
  - Chức năng đổi mật khẩu hoạt động cho tất cả các role

- **status:**
  - Enum: `["active", "blocked", "pending", "rejected", "banned", "suspended"]`
  - Không có kiểm tra status trong changePassword (có thể thêm nếu cần)

**Lưu ý quan trọng:**
- Khi query user, phải dùng `.select("+passwordHash")` để lấy `passwordHash`
- Nếu không, field này sẽ không có trong result
- Điều này đảm bảo bảo mật - không vô tình expose password hash

---

## LUỒNG HOẠT ĐỘNG HOÀN CHỈNH

### Sequence Diagram

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │    │  React   │    │  API.js  │    │  Route   │    │ AuthGuard│    │Controller│
│ (Browser)│    │ Component│    │          │    │          │    │          │    │          │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │                │               │               │               │
     │ 1. Nhập mật   │                │               │               │               │
     │    khẩu       │                │               │               │               │
     │──────────────>│                │               │               │               │
     │               │                │               │               │               │
     │ 2. Click "Đổi │                │               │               │               │
     │    mật khẩu"  │                │               │               │               │
     │──────────────>│                │               │               │               │
     │               │                │               │               │               │
     │               │ 3. Validate    │               │               │               │
     │               │    (client)    │               │               │               │
     │               │<───────────────┼               │               │               │
     │               │                │               │               │               │
     │               │ 4. Gọi API     │               │               │               │
     │               │    changePassword│             │               │               │
     │               │───────────────>│               │               │               │
     │               │                │               │               │               │
     │               │                │ 5. POST /api/ │               │               │
     │               │                │    auth/change│               │               │
     │               │                │    -password  │               │               │
     │               │                │──────────────>│               │               │
     │               │                │               │               │               │
     │               │                │               │ 6. Verify     │               │
     │               │                │               │    session    │               │
     │               │                │               │    cookie     │               │
     │               │                │               │──────────────>│               │
     │               │                │               │               │               │
     │               │                │               │ 7. Verify với │               │
     │               │                │               │    Firebase   │               │
     │               │                │               │    Admin      │               │
     │               │                │               │<──────────────┼               │
     │               │                │               │               │               │
     │               │                │               │ 8. Set req.user│              │
     │               │                │               │    và next()  │               │
     │               │                │               │──────────────>│               │
     │               │                │               │               │               │
     │               │                │               │               │ 9. Lấy input  │
     │               │                │               │               │    và validate│
     │               │                │               │               │<──────────────┼
     │               │                │               │               │               │
     │               │                │               │               │ 10. Query User│
     │               │                │               │               │    từ MongoDB │
     │               │                │               │               │<──────────────┼
     │               │                │               │               │               │
     │               │                │               │               │ 11. Verify    │
     │               │                │               │               │    current    │
     │               │                │               │               │    password   │
     │               │                │               │               │<──────────────┼
     │               │                │               │               │               │
     │               │                │               │               │ 12. Hash new  │
     │               │                │               │               │    password   │
     │               │                │               │               │<──────────────┼
     │               │                │               │               │               │
     │               │                │               │               │ 13. Save to   │
     │               │                │               │               │    database   │
     │               │                │               │               │<──────────────┼
     │               │                │               │               │               │
     │               │                │               │               │ 14. Return    │
     │               │                │               │               │    success    │
     │               │                │               │               │──────────────>│
     │               │                │               │               │               │
     │               │                │               │ 15. Response  │               │
     │               │                │               │    JSON       │               │
     │               │                │               │<──────────────┘               │
     │               │                │               │               │               │
     │               │                │ 16. Return    │               │               │
     │               │                │    JSON       │               │               │
     │               │                │<──────────────┘               │               │
     │               │                │               │               │               │
     │               │ 17. Show      │               │               │               │
     │               │    success    │               │               │               │
     │               │    message    │               │               │               │
     │               │<──────────────┘               │               │               │
     │               │                │               │               │               │
     │ 18. Hiển thị  │                │               │               │               │
     │    thông báo  │                │               │               │               │
     │<──────────────┘                │               │               │               │
     │               │                │               │               │               │
```

### Flow Chart

```
START
  │
  ├─> User nhập mật khẩu hiện tại và mật khẩu mới
  │
  ├─> Click "Đổi mật khẩu"
  │
  ├─> [Frontend] Validate input (client-side)
  │   ├─> Kiểm tra không để trống
  │   ├─> Kiểm tra độ dài mật khẩu mới >= 8
  │   ├─> Kiểm tra xác nhận mật khẩu khớp
  │   └─> Kiểm tra mật khẩu mới khác mật khẩu cũ
  │
  ├─> [API Client] Gọi changePassword(currentPassword, newPassword)
  │   └─> POST /api/auth/change-password
  │       └─> Headers: Content-Type: application/json
  │       └─> Body: { currentPassword, newPassword }
  │       └─> credentials: "include" (gửi cookie)
  │
  ├─> [Route] Nhận request tại /api/auth/change-password
  │
  ├─> [AuthGuard] Xác thực người dùng
  │   ├─> Lấy session cookie từ request
  │   ├─> Verify cookie với Firebase Admin
  │   ├─> Lấy thông tin user (uid, email, app_user_id)
  │   └─> Set req.user và gọi next()
  │
  ├─> [Controller] changePassword(req, res)
  │   ├─> Bước 1: Lấy và validate input
  │   │   ├─> Kiểm tra currentPassword và newPassword có giá trị
  │   │   └─> Kiểm tra newPassword.length >= 8
  │   │
  │   ├─> Bước 2: Lấy thông tin user
  │   │   ├─> Lấy userId từ req.user.app_user_id
  │   │   └─> Query User.findById(userId).select("+passwordHash")
  │   │
  │   ├─> Bước 3: Xác thực mật khẩu hiện tại
  │   │   ├─> verifyPassword(user.passwordHash, currentPassword)
  │   │   └─> Nếu không đúng → return error 400
  │   │
  │   ├─> Bước 4: Kiểm tra mật khẩu mới
  │   │   ├─> verifyPassword(user.passwordHash, newPassword)
  │   │   └─> Nếu giống mật khẩu cũ → return error 400
  │   │
  │   ├─> Bước 5: Hash và lưu mật khẩu mới
  │   │   ├─> hashPassword(newPassword) → hashedNewPassword
  │   │   ├─> user.passwordHash = hashedNewPassword
  │   │   └─> await user.save()
  │   │
  │   └─> Bước 6: Trả về kết quả
  │       └─> return ok(res, { ok: true, message: "Đổi mật khẩu thành công" })
  │
  ├─> [API Client] Nhận response
  │   ├─> Nếu success → return JSON response
  │   └─> Nếu error → throw Error với status và message
  │
  ├─> [Frontend] Xử lý response
  │   ├─> Nếu success → Hiển thị thông báo thành công và reset form
  │   └─> Nếu error → Hiển thị thông báo lỗi cụ thể
  │
  └─> END
```

---

## ĐIỂM KHÁC BIỆT GIỮA BÁC SĨ VÀ BỆNH NHÂN

### Giống nhau:
1. **Cùng API endpoint:** `/api/auth/change-password`
2. **Cùng controller:** `changePassword` trong `authController.js`
3. **Cùng validation logic:** Kiểm tra mật khẩu hiện tại, độ dài, xác nhận
4. **Cùng authentication:** Sử dụng `authGuard` middleware
5. **Cùng password hashing:** Sử dụng Argon2

### Khác nhau:

| Khía cạnh | Bác sĩ | Bệnh nhân |
|-----------|--------|-----------|
| **Component** | `Doctor/cai-dat/CaiDat.jsx` | `Patient/cai-dat/CaiDat.jsx` |
| **State management** | `passwordData`, `passwordErrors` | `formData`, `fieldErrors` |
| **Loading state** | Không có | `isChangingPassword` |
| **UI components** | Sử dụng `PasswordField` component | Sử dụng input trực tiếp |
| **Error handling** | Hiển thị lỗi trong `passwordErrors` | Hiển thị lỗi trong `fieldErrors` |
| **Validation** | Function `validatePassword()` | Inline validation trong `handleChangePassword` |

### Tại sao khác nhau?
- **Phát triển riêng biệt:** Hai component được phát triển độc lập
- **UI/UX khác nhau:** Mỗi role có thể có yêu cầu UI khác nhau
- **Refactoring:** Có thể refactor để dùng chung component trong tương lai

---

## XỬ LÝ LỖI

### 1. Lỗi Client-Side Validation

**Lỗi:** Mật khẩu không hợp lệ
- **Mật khẩu hiện tại trống:** `"Vui lòng nhập mật khẩu hiện tại"`
- **Mật khẩu mới trống:** `"Vui lòng nhập mật khẩu mới"`
- **Mật khẩu mới < 8 ký tự:** `"Mật khẩu mới phải có ít nhất 8 ký tự"`
- **Xác nhận mật khẩu không khớp:** `"Mật khẩu xác nhận không khớp"`
- **Mật khẩu mới giống mật khẩu cũ:** `"Mật khẩu mới phải khác mật khẩu hiện tại"`

**Xử lý:**
- Hiển thị lỗi trong form
- Không gửi request đến server
- Người dùng có thể sửa ngay

### 2. Lỗi Authentication

**Lỗi:** Không có session cookie hoặc cookie không hợp lệ
- **Status:** 401 Unauthorized
- **Message:** `"No session cookie found"` hoặc `"UNAUTHORIZED"`
- **Nguyên nhân:** 
  - Người dùng chưa đăng nhập
  - Session cookie đã hết hạn
  - Cookie bị giả mạo

**Xử lý:**
- Trả về lỗi 401 từ authGuard
- Frontend có thể redirect đến trang đăng nhập

### 3. Lỗi Server-Side Validation

**Lỗi:** Input không hợp lệ
- **Thiếu trường:** `"Thiếu mật khẩu hiện tại hoặc mật khẩu mới"`
- **Mật khẩu mới < 8 ký tự:** `"Mật khẩu mới phải có ít nhất 8 ký tự"`
- **Status:** 400 Bad Request

**Xử lý:**
- Trả về lỗi 400 với message cụ thể
- Frontend hiển thị lỗi cho người dùng

### 4. Lỗi Xác Thực Mật Khẩu

**Lỗi:** Mật khẩu hiện tại không đúng
- **Status:** 400 Bad Request
- **Message:** `"Mật khẩu hiện tại không đúng"`
- **Nguyên nhân:** 
  - Người dùng nhập sai mật khẩu hiện tại
  - Password hash không khớp

**Xử lý:**
- Trả về lỗi 400
- Frontend hiển thị lỗi ở field "Mật khẩu hiện tại"

### 5. Lỗi Mật Khẩu Mới

**Lỗi:** Mật khẩu mới giống mật khẩu cũ
- **Status:** 400 Bad Request
- **Message:** `"Mật khẩu mới phải khác mật khẩu hiện tại"`
- **Nguyên nhân:** Người dùng nhập mật khẩu mới giống mật khẩu cũ

**Xử lý:**
- Trả về lỗi 400
- Frontend hiển thị lỗi ở field "Mật khẩu mới"

### 6. Lỗi Database

**Lỗi:** Không tìm thấy user hoặc lỗi database
- **User không tồn tại:** `"Người dùng không tồn tại"` (404)
- **Lỗi database:** `"SERVER_ERROR"` (500)
- **Nguyên nhân:** 
  - User ID không tồn tại trong database
  - Lỗi kết nối database
  - Lỗi khi save user

**Xử lý:**
- Trả về lỗi 404 hoặc 500
- Frontend hiển thị thông báo lỗi chung

### 7. Lỗi Password Hashing

**Lỗi:** Không thể hash mật khẩu
- **Status:** 500 Server Error
- **Message:** `"Failed to hash password"`
- **Nguyên nhân:** Lỗi khi hash password bằng Argon2

**Xử lý:**
- Trả về lỗi 500
- Frontend hiển thị thông báo lỗi chung

---

## BẢO MẬT

### 1. Authentication
- **Session Cookie:** Sử dụng Firebase session cookie
- **AuthGuard:** Verify cookie trước khi xử lý request
- **User ID:** Lấy từ session cookie, không từ client

### 2. Password Storage
- **Hashing:** Sử dụng Argon2 (thuật toán an toàn)
- **Salt:** Argon2 tự động tạo salt
- **No Plain Text:** Không lưu mật khẩu plain text

### 3. Password Verification
- **Constant Time:** Argon2 và bcrypt đều sử dụng constant-time comparison
- **No Timing Attack:** Không bị tấn công timing attack

### 4. Input Validation
- **Client-Side:** Validate input trước khi gửi
- **Server-Side:** Validate input lại trên server
- **Length Check:** Kiểm tra độ dài mật khẩu

### 5. Error Messages
- **Generic Errors:** Không tiết lộ thông tin nhạy cảm
- **User-Friendly:** Thông báo lỗi dễ hiểu cho người dùng

### 6. Database
- **Select False:** `passwordHash` không được trả về mặc định
- **Explicit Select:** Phải dùng `.select("+passwordHash")` để lấy

---

## TESTING

### Test Cases

#### 1. Test Thành Công
- **Input:** Mật khẩu hiện tại đúng, mật khẩu mới hợp lệ
- **Expected:** Đổi mật khẩu thành công, trả về `{ ok: true, message: "Đổi mật khẩu thành công" }`

#### 2. Test Mật Khẩu Hiện Tại Sai
- **Input:** Mật khẩu hiện tại sai, mật khẩu mới hợp lệ
- **Expected:** Trả về lỗi 400 với message `"Mật khẩu hiện tại không đúng"`

#### 3. Test Mật Khẩu Mới Ngắn
- **Input:** Mật khẩu mới < 8 ký tự
- **Expected:** Trả về lỗi 400 với message `"Mật khẩu mới phải có ít nhất 8 ký tự"`

#### 4. Test Mật Khẩu Mới Giống Mật Khẩu Cũ
- **Input:** Mật khẩu mới giống mật khẩu hiện tại
- **Expected:** Trả về lỗi 400 với message `"Mật khẩu mới phải khác mật khẩu hiện tại"`

#### 5. Test Chưa Đăng Nhập
- **Input:** Request không có session cookie
- **Expected:** Trả về lỗi 401 với message `"No session cookie found"`

#### 6. Test User Không Tồn Tại
- **Input:** User ID không tồn tại trong database
- **Expected:** Trả về lỗi 404 với message `"Người dùng không tồn tại"`

---

## TỐI ƯU HÓA VÀ CẢI TIẾN

### 1. Rate Limiting
- **Hiện tại:** Chưa có rate limiting
- **Cải tiến:** Thêm rate limiting để chống brute-force attack
- **Ví dụ:** Giới hạn 5 lần đổi mật khẩu trong 1 giờ

### 2. Password Strength
- **Hiện tại:** Chỉ kiểm tra độ dài >= 8 ký tự
- **Cải tiến:** Thêm kiểm tra độ mạnh mật khẩu (chữ hoa, chữ thường, số, ký tự đặc biệt)

### 3. Password History
- **Hiện tại:** Không lưu lịch sử mật khẩu
- **Cải tiến:** Lưu lịch sử mật khẩu và không cho phép dùng lại mật khẩu cũ

### 4. Logging
- **Hiện tại:** Chỉ log lỗi
- **Cải tiến:** Log tất cả các lần đổi mật khẩu (thành công và thất bại)

### 5. Notification
- **Hiện tại:** Không gửi email thông báo
- **Cải tiến:** Gửi email thông báo khi đổi mật khẩu thành công

### 6. Two-Factor Authentication
- **Hiện tại:** Chưa có 2FA
- **Cải tiến:** Thêm 2FA khi đổi mật khẩu (OTP qua email/SMS)

### 7. Session Invalidation
- **Hiện tại:** Không invalidate session sau khi đổi mật khẩu
- **Cải tiến:** Invalidate tất cả session cũ sau khi đổi mật khẩu (trừ session hiện tại)

---

## KẾT LUẬN

Chức năng đổi mật khẩu là một phần quan trọng của hệ thống bảo mật, cho phép người dùng (bác sĩ và bệnh nhân) thay đổi mật khẩu khi đã đăng nhập. Luồng hoạt động được thiết kế an toàn với:

1. **Authentication:** Sử dụng session cookie và authGuard
2. **Validation:** Validate input cả client-side và server-side
3. **Password Hashing:** Sử dụng Argon2 (thuật toán an toàn)
4. **Error Handling:** Xử lý lỗi chi tiết và user-friendly
5. **Security:** Bảo vệ chống lại các cuộc tấn công phổ biến

Luồng hoạt động đơn giản nhưng hiệu quả, đảm bảo người dùng có thể đổi mật khẩu một cách an toàn và dễ dàng.

---

## TÀI LIỆU THAM KHẢO

1. **Argon2:** https://github.com/ranisalt/node-argon2
2. **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup
3. **Express.js:** https://expressjs.com/
4. **Mongoose:** https://mongoosejs.com/
5. **React:** https://reactjs.org/

---

**Tác giả:** AI Assistant
**Ngày tạo:** 2024
**Phiên bản:** 1.0

