# Kiến trúc Utils, Services và Hooks

## 📁 Cấu trúc thư mục

```
client/src/
├── utils/          # Pure functions - Không gọi API, không có state
├── hooks/          # React hooks - Có thể gọi API, quản lý state
└── services/       # API calls - Gọi API thuần, không có React state
```

## 🔍 Phân biệt Utils vs Services vs Hooks

### 1. **Utils** (`/utils`)

**Đặc điểm:**

- ✅ Pure functions (không có side effects)
- ✅ Không gọi API
- ✅ Không có state
- ✅ Dễ test
- ✅ Có thể dùng ở bất kỳ đâu (React component, Node.js, etc.)

**Ví dụ:**

```javascript
// appointmentUtils.jsx
export function filterByStatus(appointments, status) {
  return appointments.filter((apt) => apt.status === status);
}

export function formatDateTime(dateString) {
  // Format date để hiển thị
  return { date: "...", time: "..." };
}
```

**Chức năng chính:**

- Format dữ liệu (date, time, text)
- Transform dữ liệu (object → object khác)
- Filter/Sort dữ liệu
- Validation
- Tính toán (statistics, calculations)

---

### 2. **Services** (`/services`)

**Đặc điểm:**

- ✅ Gọi API trực tiếp (fetch, axios)
- ✅ Không có React state
- ✅ Không phải React hooks
- ✅ Có thể dùng trong hooks hoặc components
- ✅ Xử lý logic API (error handling, data transformation)

**Ví dụ:**

```javascript
// payService.js
export async function createPayOSPayment(paymentData) {
  const resp = await fetch(`${API_BASE}/api/payments/payos/create-payment`, {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
  return resp.json();
}
```

**Chức năng chính:**

- Gọi API endpoints
- Xử lý request/response
- Error handling cho API calls
- Transform data trước/sau khi gọi API

---

### 3. **Hooks** (`/hooks`)

**Đặc điểm:**

- ✅ React hooks (useState, useEffect, etc.)
- ✅ Có thể gọi API (thông qua services hoặc trực tiếp)
- ✅ Quản lý state (loading, error, data)
- ✅ Chỉ dùng trong React components
- ✅ Có lifecycle (mount, update, unmount)

**Ví dụ:**

```javascript
// useAppointments.js
export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Gọi API
    api
      .get("/api/patients/me/appointments")
      .then((res) => setAppointments(res.data));
  }, []);

  return { appointments, loading };
}
```

**Chức năng chính:**

- Fetch data từ API
- Quản lý loading state
- Quản lý error state
- Cung cấp data cho components
- Có thể có refresh function

---

## 📊 So sánh

| Đặc điểm     | Utils   | Services   | Hooks                               |
| ------------ | ------- | ---------- | ----------------------------------- |
| Gọi API      | ❌      | ✅         | ✅                                  |
| React state  | ❌      | ❌         | ✅                                  |
| Side effects | ❌      | ✅         | ✅                                  |
| Dùng ở đâu   | Mọi nơi | Mọi nơi    | Chỉ React components                |
| Test         | Dễ      | Trung bình | Khó hơn (cần React Testing Library) |

---

## 🎯 Khi nào dùng gì?

### Dùng **Utils** khi:

- Cần format/transform data
- Cần filter/sort data
- Cần validation
- Cần tính toán
- Logic không phụ thuộc vào API

### Dùng **Services** khi:

- Cần gọi API
- Logic API call có thể tái sử dụng
- Cần xử lý error cho API
- Không cần React state

### Dùng **Hooks** khi:

- Cần fetch data trong React component
- Cần quản lý loading/error state
- Cần lifecycle (fetch khi mount)
- Cần reactive updates (khi data thay đổi)

---

## 🔄 Luồng dữ liệu

```
Component
  ↓
Hook (useAppointments)
  ↓
Service (api.get) hoặc gọi API trực tiếp
  ↓
API Response
  ↓
Utils (transform data)
  ↓
Component (hiển thị)
```

**Ví dụ cụ thể:**

```javascript
// Component
function MyAppointments() {
  // Hook: Fetch data + quản lý state
  const { appointments, loading } = useAppointments();

  // Utils: Filter data
  const upcomingAppointments = filterByStatus(appointments, "pending");

  // Utils: Format để hiển thị
  const formattedAppointments = upcomingAppointments.map((apt) => ({
    ...apt,
    date: formatDateTime(apt.scheduledStart).date,
  }));

  return <div>{/* Hiển thị */}</div>;
}
```

---

## 📝 Best Practices

### 1. **Utils**

- ✅ Pure functions (input → output)
- ✅ Không mutate input
- ✅ Dễ test (không cần mock)
- ✅ Có thể dùng lại

### 2. **Services**

- ✅ Một service = một domain (payService, userService)
- ✅ Xử lý error ở service level
- ✅ Return data đã được transform
- ✅ Có thể dùng trong hooks hoặc components

### 3. **Hooks**

- ✅ Một hook = một resource (useAppointments, useUserProfile)
- ✅ Quản lý state (loading, error, data)
- ✅ Có thể call services hoặc API trực tiếp
- ✅ Có thể có refresh function

---

## 🚀 Ví dụ Refactor

### Trước (Logic trộn lẫn trong component):

```javascript
function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // API call trong component
    fetch("/api/appointments")
      .then((res) => res.json())
      .then((data) => {
        // Filter trong component
        const filtered = data.filter((apt) => apt.status === "pending");
        // Format trong component
        const formatted = filtered.map((apt) => ({
          ...apt,
          date: new Date(apt.date).toLocaleDateString(),
        }));
        setAppointments(formatted);
      });
  }, []);

  return <div>{/* ... */}</div>;
}
```

### Sau (Tách ra Utils, Services, Hooks):

```javascript
// utils/appointmentUtils.jsx
export function filterByStatus(appointments, status) {
  return appointments.filter((apt) => apt.status === status);
}

export function formatAppointmentDate(appointment) {
  return {
    ...appointment,
    date: new Date(appointment.date).toLocaleDateString(),
  };
}

// hooks/useAppointments.js
export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/appointments")
      .then((res) => setAppointments(res.data))
      .finally(() => setLoading(false));
  }, []);

  return { appointments, loading };
}

// Component
function MyAppointments() {
  const { appointments, loading } = useAppointments();
  const pendingAppointments = filterByStatus(appointments, "pending");
  const formatted = pendingAppointments.map(formatAppointmentDate);

  return <div>{/* ... */}</div>;
}
```

---

## ✅ Kết luận

- **Utils**: Pure functions, không có side effects
- **Services**: API calls, không có React state
- **Hooks**: React hooks, có state, fetch data

Tách biệt rõ ràng giúp:

- ✅ Code dễ maintain
- ✅ Dễ test
- ✅ Dễ tái sử dụng
- ✅ Dễ debug
