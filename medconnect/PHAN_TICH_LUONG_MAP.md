# PHÂN TÍCH LUỒNG HOẠT ĐỘNG TÍNH NĂNG MAP

## MỤC LỤC
1. [Tổng quan](#tổng-quan)
2. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
3. [Luồng hoạt động chi tiết](#luồng-hoạt-động-chi-tiết)
4. [Phân tích từng Component](#phân-tích-từng-component)
5. [API Endpoints](#api-endpoints)
6. [Database Model](#database-model)
7. [Các trường hợp sử dụng](#các-trường-hợp-sử-dụng)
8. [Xử lý lỗi và Edge Cases](#xử-lý-lỗi-và-edge-cases)
9. [Tối ưu hóa và Best Practices](#tối-ưu-hóa-và-best-practices)

---

## TỔNG QUAN

### Mô tả tính năng
Tính năng Map (Bản đồ) cho phép người dùng:
- Xem vị trí của các cơ sở y tế trên bản đồ tương tác
- Xem chi tiết thông tin cơ sở y tế (tên, địa chỉ, số điện thoại)
- Mở Google Maps để chỉ đường đến cơ sở y tế
- Tích hợp bản đồ vào các trang đặt lịch để hiển thị vị trí phòng khám

### Công nghệ sử dụng
- **Frontend**: React, React Leaflet (thư viện bản đồ)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB với GeoJSON để lưu trữ tọa độ
- **Map Provider**: OpenStreetMap (TileLayer)
- **External Service**: Google Maps API (chỉ đường)

---

## KIẾN TRÚC HỆ THỐNG

### Cấu trúc thư mục
```
client/src/
├── pages/
│   └── Map/
│       ├── ClinicMapPage.jsx        # Trang hiển thị bản đồ cơ sở y tế
│       └── ClinicMapPage.css        # Style cho trang map
└── components/
    └── ClinicMap/
        ├── ClinicMap.jsx            # Component bản đồ chính
        └── ClinicMap.css            # Style cho component map

server/
├── models/
│   └── clinic.model.js              # Model Clinic với GeoJSON
├── controllers/
│   └── clinicController.js          # Controller xử lý API clinic
└── routes/
    └── clinicRoutes.js              # Routes cho clinic API
```

### Luồng dữ liệu
```
User Request → Frontend Component → API Call → Backend Controller → Database → Response → Frontend Display
```

---

## LUỒNG HOẠT ĐỘNG CHI TIẾT

### 1. Luồng truy cập trang Map từ danh sách cơ sở y tế

#### Bước 1: Người dùng click vào cơ sở y tế
**File**: `client/src/pages/Home/co-so-y-te/CoSoYTe.jsx`

```javascript
const handleFacilityClick = (facility) => {
  // Navigate to map page with clinic ID
  navigate(`/ban-do-co-so-y-te?id=${facility.id || facility._id}`);
};
```

**Giải thích**:
- Khi người dùng click vào card cơ sở y tế, hàm `handleFacilityClick` được gọi
- Hàm này sử dụng `navigate` từ React Router để điều hướng đến `/ban-do-co-so-y-te`
- ID của cơ sở y tế được truyền qua query parameter `id`

#### Bước 2: ClinicMapPage nhận ID và fetch dữ liệu
**File**: `client/src/pages/Map/ClinicMapPage.jsx`

```javascript
const ClinicMapPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clinicId = searchParams.get("id");
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClinic = async () => {
      if (!clinicId) {
        setError("Không tìm thấy ID cơ sở y tế");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/api/clinics/${clinicId}`);
        
        if (response?.success && response?.data?.clinic) {
          setClinic(response.data.clinic);
        } else {
          setError("Không tìm thấy thông tin cơ sở y tế");
        }
      } catch (err) {
        console.error("Error fetching clinic:", err);
        setError("Có lỗi khi tải thông tin cơ sở y tế");
      } finally {
        setLoading(false);
      }
    };

    fetchClinic();
  }, [clinicId]);
```

**Giải thích**:
- Component sử dụng `useSearchParams()` để lấy query parameter `id` từ URL
- `useEffect` hook được gọi khi component mount hoặc `clinicId` thay đổi
- Nếu không có `clinicId`, set error và dừng loading
- Gọi API `GET /api/clinics/${clinicId}` để lấy thông tin cơ sở y tế
- Nếu thành công, lưu dữ liệu vào state `clinic`
- Nếu thất bại, set error message

#### Bước 3: Backend xử lý request
**File**: `server/controllers/clinicController.js`

```javascript
export async function getClinicById(req, res) {
  try {
    const { id } = req.params;

    const clinic = await Clinic.findById(id).lean();
    if (!clinic) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Clinic not found");
    }

    const formattedClinic = {
      id: clinic._id,
      name: clinic.name,
      type: clinic.type || "hospital",
      location: clinic.location || "Không xác định",
      address: clinic.address,
      phone: clinic.phone,
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      coordinates: clinic.geo?.coordinates,
      specialties: clinic.specialties || [],
      doctorCount: clinic.doctorCount || 0,
      rating: clinic.rating || 4.0,
      reviewCount: clinic.reviewCount || 0,
      description: clinic.description || "",
      image: clinic.image || "",
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
    };

    return ok(res, { clinic: formattedClinic });
  } catch (error) {
    console.error("❌ /api/clinics/:id error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}
```

**Giải thích**:
- Controller nhận `id` từ request params
- Sử dụng `Clinic.findById(id).lean()` để tìm clinic trong database
- `.lean()` trả về plain JavaScript object thay vì Mongoose document (tối ưu performance)
- Nếu không tìm thấy, trả về lỗi 404
- Format lại dữ liệu để đảm bảo có đầy đủ các trường cần thiết
- Trả về response với status 200 và dữ liệu clinic đã format

#### Bước 4: Database query
**File**: `server/models/clinic.model.js`

```javascript
const ClinicSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["hospital", "clinic", "center"],
      default: "hospital",
    },
    location: { type: String, trim: true },
    address: String,
    latitude: Number,
    longitude: Number,
    phone: String,
    specialties: [{ type: String, trim: true }],
    doctorCount: { type: Number, default: 0 },
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    geo: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        validate: {
          validator: (v) =>
            !v ||
            (Array.isArray(v) &&
              v.length === 2 &&
              v.every((n) => typeof n === "number")),
          message: "geo.coordinates must be [lng, lat]",
        },
      },
    },
  },
  { timestamps: true, versionKey: false, collection: "Clinics" }
);

// 2dsphere index cho GeoJSON
ClinicSchema.index({ geo: "2dsphere" });
```

**Giải thích**:
- Schema định nghĩa cấu trúc dữ liệu clinic
- Trường `geo` sử dụng GeoJSON format với type "Point"
- `coordinates` là array `[longitude, latitude]` (theo chuẩn GeoJSON)
- Có validation để đảm bảo coordinates là array 2 phần tử số
- Index `2dsphere` được tạo cho trường `geo` để hỗ trợ các query địa lý
- MongoDB sử dụng index này để tối ưu các truy vấn địa lý (tìm kiếm gần, tính khoảng cách)

#### Bước 5: Hiển thị dữ liệu và bản đồ
**File**: `client/src/pages/Map/ClinicMapPage.jsx`

```javascript
return (
  <div className="clinic-map-page">
    <div className="container">
      <NavigationBreadcrumb
        items={[
          {
            label: "Trang chủ",
            path: "/",
            icon: <HomeOutlined />,
          },
          {
            label: "Cơ sở y tế",
            path: "/co-so-y-te",
          },
          {
            label: clinic.name,
          },
        ]}
      />

      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/co-so-y-te")}
          style={{ marginBottom: "16px" }}
        >
          Quay lại danh sách
        </Button>

        <Card>
          <div style={{ marginBottom: "24px" }}>
            <Title level={2} style={{ marginBottom: "8px" }}>
              {clinic.name}
            </Title>
            {clinic.address && (
              <Space style={{ marginBottom: "8px" }}>
                <EnvironmentOutlined style={{ color: "#45c3d2" }} />
                <Text>{clinic.address}</Text>
              </Space>
            )}
            {clinic.phone && (
              <div style={{ marginBottom: "8px" }}>
                <Text strong>Điện thoại: </Text>
                <Text>{clinic.phone}</Text>
              </div>
            )}
            {clinic.description && (
              <Paragraph style={{ marginTop: "16px", color: "#666" }}>
                {clinic.description}
              </Paragraph>
            )}
          </div>

          <div style={{ marginTop: "24px" }}>
            <ClinicMap clinic={clinic} onGetDirections={handleGetDirections} />
          </div>
        </Card>
      </div>
    </div>
  </div>
);
```

**Giải thích**:
- Component render breadcrumb navigation
- Hiển thị thông tin cơ sở y tế: tên, địa chỉ, số điện thoại, mô tả
- Render component `ClinicMap` và truyền props `clinic` và `onGetDirections`
- Button "Quay lại danh sách" để quay về trang danh sách cơ sở y tế

---

### 2. Luồng hiển thị bản đồ trong ClinicMap Component

#### Bước 1: Component nhận props và xử lý coordinates
**File**: `client/src/components/ClinicMap/ClinicMap.jsx`

```javascript
const ClinicMap = ({ clinic, onGetDirections }) => {
  // Early return if no clinic data
  if (!clinic) {
    return (
      <div className="clinic-map-container">
        <div className="clinic-map-placeholder">
          <EnvironmentOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
          <p>Không có thông tin phòng khám</p>
        </div>
      </div>
    );
  }

  // Get coordinates from clinic
  // Priority: geo.coordinates > latitude/longitude
  const getCoordinates = () => {
    if (clinic?.geo?.coordinates && Array.isArray(clinic.geo.coordinates) && clinic.geo.coordinates.length === 2) {
      // geo.coordinates is [lng, lat], Leaflet needs [lat, lng]
      const [lng, lat] = clinic.geo.coordinates;
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    if (clinic?.latitude && clinic?.longitude) {
      const lat = parseFloat(clinic.latitude);
      const lng = parseFloat(clinic.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return null;
  };

  const coordinates = getCoordinates();
  const hasValidCoordinates = coordinates !== null;
```

**Giải thích**:
- Component kiểm tra nếu không có `clinic`, hiển thị placeholder
- Hàm `getCoordinates()` xác định tọa độ từ dữ liệu clinic:
  - **Ưu tiên 1**: Sử dụng `geo.coordinates` (GeoJSON format `[lng, lat]`)
  - **Ưu tiên 2**: Sử dụng `latitude` và `longitude` riêng lẻ
- Chuyển đổi từ GeoJSON format `[lng, lat]` sang Leaflet format `[lat, lng]`
- Validate tọa độ phải là số hợp lệ (không phải NaN)
- Nếu không có tọa độ hợp lệ, trả về `null`

#### Bước 2: Cấu hình Leaflet Marker Icon
**File**: `client/src/components/ClinicMap/ClinicMap.jsx`

```javascript
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix for default marker icon
const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
```

**Giải thích**:
- Import các file ảnh marker từ thư viện Leaflet
- Tạo custom icon configuration để fix lỗi hiển thị marker mặc định
- `iconSize`: Kích thước icon (width, height)
- `iconAnchor`: Điểm neo của icon (điểm này sẽ đặt tại tọa độ marker)
- `popupAnchor`: Vị trí popup so với marker
- `tooltipAnchor`: Vị trí tooltip so với marker
- `shadowSize`: Kích thước shadow

#### Bước 3: Render MapContainer với TileLayer và Marker
**File**: `client/src/components/ClinicMap/ClinicMap.jsx`

```javascript
{hasValidCoordinates ? (
  <MapContainer
    key={`map-${coordinates[0]}-${coordinates[1]}`}
    center={coordinates}
    zoom={15}
    scrollWheelZoom={true}
    style={{ height: "100%", width: "100%", zIndex: 0 }}
    className="clinic-map"
  >
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
    />
    <Marker position={coordinates} icon={icon}>
      <Popup>
        <div>
          <strong>{clinic?.name || "Phòng khám"}</strong>
          {clinic?.address && (
            <div style={{ marginTop: 4, fontSize: "12px" }}>
              {clinic.address}
            </div>
          )}
          <Button
            type="link"
            size="small"
            icon={<ArrowRightOutlined />}
            onClick={handleGetDirections}
            style={{ padding: 0, marginTop: 8 }}
          >
            Chỉ đường
          </Button>
        </div>
      </Popup>
    </Marker>
  </MapContainer>
) : (
  <div className="clinic-map-placeholder">
    <EnvironmentOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
    <p>Không có thông tin tọa độ phòng khám</p>
    {clinic?.address && (
      <Button
        type="primary"
        icon={<ArrowRightOutlined />}
        onClick={handleGetDirections}
        style={{ marginTop: 16 }}
      >
        Mở chỉ đường với địa chỉ: {clinic.address}
      </Button>
    )}
  </div>
)}
```

**Giải thích**:
- **MapContainer**: Component chính của React Leaflet, tạo bản đồ
  - `key`: Đảm bảo component re-render khi coordinates thay đổi
  - `center`: Tọa độ trung tâm của bản đồ
  - `zoom`: Mức độ zoom (15 = mức zoom chi tiết)
  - `scrollWheelZoom`: Cho phép zoom bằng scroll wheel
  - `style`: Style cho container bản đồ
  
- **TileLayer**: Layer hiển thị bản đồ từ OpenStreetMap
  - `url`: URL template để lấy tiles từ OpenStreetMap
  - `{s}`: Subdomain (a, b, c) để load balance
  - `{z}`: Zoom level
  - `{x}`, `{y}`: Tile coordinates
  - `attribution`: Credit cho OpenStreetMap (bắt buộc theo license)
  
- **Marker**: Marker đánh dấu vị trí cơ sở y tế
  - `position`: Tọa độ của marker
  - `icon`: Custom icon đã cấu hình
  
- **Popup**: Popup hiển thị khi click vào marker
  - Hiển thị tên và địa chỉ cơ sở y tế
  - Button "Chỉ đường" để mở Google Maps

- **Fallback**: Nếu không có tọa độ, hiển thị placeholder với button mở Google Maps bằng địa chỉ

#### Bước 4: Xử lý sự kiện "Chỉ đường"
**File**: `client/src/pages/Map/ClinicMapPage.jsx`

```javascript
const handleGetDirections = (clinicData) => {
  if (clinicData?.latitude && clinicData?.longitude) {
    // Open Google Maps with coordinates
    const url = `https://www.google.com/maps/dir/?api=1&destination=${clinicData.latitude},${clinicData.longitude}`;
    window.open(url, "_blank");
  } else if (clinicData?.address) {
    // Open Google Maps with address
    const address = encodeURIComponent(clinicData.address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
    window.open(url, "_blank");
  }
};
```

**Giải thích**:
- Hàm `handleGetDirections` được gọi khi người dùng click button "Chỉ đường"
- **Ưu tiên 1**: Nếu có tọa độ (latitude, longitude), sử dụng tọa độ để mở Google Maps
- **Ưu tiên 2**: Nếu không có tọa độ nhưng có địa chỉ, sử dụng địa chỉ
- `encodeURIComponent`: Encode địa chỉ để an toàn trong URL
- Google Maps URL format: `https://www.google.com/maps/dir/?api=1&destination={coordinates|address}`
- `window.open(url, "_blank")`: Mở Google Maps trong tab mới

---

### 3. Luồng tích hợp Map vào trang đặt lịch

#### Bước 1: Sử dụng ClinicMap trong trang đặt lịch
**File**: `client/src/pages/Appointment/chon-thoi-gian/ChonThoiGian.jsx`

```javascript
import ClinicMap from "../../../components/ClinicMap/ClinicMap";

// Trong component render
{defaultClinic && (
  <Form.Item>
    <ClinicMap
      clinic={defaultClinic}
      onGetDirections={(clinic) => {
        const address = encodeURIComponent(
          clinic?.address || ""
        );
        const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
        window.open(url, "_blank");
      }}
    />
  </Form.Item>
)}
```

**Giải thích**:
- Import component `ClinicMap` vào trang đặt lịch
- Chỉ hiển thị khi có `defaultClinic` (clinic đã chọn)
- Truyền `defaultClinic` và callback `onGetDirections` vào component
- Callback xử lý mở Google Maps với địa chỉ của clinic

---

## PHÂN TÍCH TỪNG COMPONENT

### 1. ClinicMapPage Component

#### Props và State
```javascript
// Không có props (được render từ route)
const [clinic, setClinic] = useState(null);      // Dữ liệu clinic
const [loading, setLoading] = useState(true);    // Trạng thái loading
const [error, setError] = useState(null);        // Thông báo lỗi
```

#### Lifecycle
1. **Mount**: Component mount → `useEffect` chạy → Fetch clinic data
2. **Update**: Khi `clinicId` thay đổi → `useEffect` chạy lại → Fetch lại data
3. **Unmount**: Cleanup (không có cleanup trong trường hợp này)

#### Xử lý lỗi
- **Không có clinicId**: Hiển thị error message và button quay lại
- **API error**: Hiển thị error message và button quay lại
- **Clinic not found**: Hiển thị error message và button quay lại

#### Loading States
- **Loading**: Hiển thị Spin component với message "Đang tải thông tin cơ sở y tế..."
- **Success**: Hiển thị thông tin clinic và bản đồ
- **Error**: Hiển thị error message

---

### 2. ClinicMap Component

#### Props
```javascript
{
  clinic: {
    name: string,
    address: string,
    phone: string,
    latitude: number,
    longitude: number,
    geo: {
      coordinates: [number, number] // [lng, lat]
    }
  },
  onGetDirections: (clinic) => void
}
```

#### Logic xử lý tọa độ
```javascript
const getCoordinates = () => {
  // Priority 1: geo.coordinates (GeoJSON format)
  if (clinic?.geo?.coordinates && Array.isArray(clinic.geo.coordinates) && clinic.geo.coordinates.length === 2) {
    const [lng, lat] = clinic.geo.coordinates;
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      return [lat, lng]; // Convert [lng, lat] to [lat, lng] for Leaflet
    }
  }
  
  // Priority 2: latitude/longitude fields
  if (clinic?.latitude && clinic?.longitude) {
    const lat = parseFloat(clinic.latitude);
    const lng = parseFloat(clinic.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
  }
  
  return null; // No valid coordinates
};
```

**Giải thích chi tiết**:
- **Priority 1**: Sử dụng `geo.coordinates` (GeoJSON format) vì đây là chuẩn và có index 2dsphere
- **Priority 2**: Fallback sang `latitude` và `longitude` riêng lẻ (legacy format)
- **Validation**: Kiểm tra type, array length, và không phải NaN
- **Conversion**: GeoJSON sử dụng `[lng, lat]`, Leaflet cần `[lat, lng]`, nên phải đảo thứ tự

#### Render Logic
```javascript
// Case 1: No clinic data
if (!clinic) {
  return <Placeholder />;
}

// Case 2: Has valid coordinates
if (hasValidCoordinates) {
  return <MapContainer with Marker />;
}

// Case 3: No coordinates but has address
return <Placeholder with Get Directions Button />;
```

---

## API ENDPOINTS

### 1. GET /api/clinics/:id

#### Request
```http
GET /api/clinics/507f1f77bcf86cd799439011
```

#### Response (Success)
```json
{
  "success": true,
  "data": {
    "clinic": {
      "id": "507f1f77bcf86cd799439011",
      "name": "MedConnect Clinic Quận 1",
      "type": "hospital",
      "location": "Quận 1",
      "address": "123 Đường ABC, Quận 1, TP.HCM",
      "phone": "0123456789",
      "latitude": 10.7769,
      "longitude": 106.7009,
      "coordinates": [106.7009, 10.7769],
      "specialties": ["Cardiology", "Pediatrics"],
      "doctorCount": 10,
      "rating": 4.5,
      "reviewCount": 100,
      "description": "Phòng khám đa khoa",
      "image": "https://example.com/image.jpg",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Response (Error - Not Found)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Clinic not found"
  }
}
```

#### Response (Error - Server Error)
```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Internal server error"
  }
}
```

#### Code Flow
```javascript
// 1. Route handler
router.get("/:id", getClinicById);

// 2. Controller
export async function getClinicById(req, res) {
  const { id } = req.params;
  const clinic = await Clinic.findById(id).lean();
  if (!clinic) {
    return fail(res, 404, ERROR_CODES.NOT_FOUND, "Clinic not found");
  }
  const formattedClinic = formatClinic(clinic);
  return ok(res, { clinic: formattedClinic });
}

// 3. Database query
Clinic.findById(id).lean()
  // Mongoose query:
  // - Finds document by _id
  // - Returns plain JavaScript object (not Mongoose document)
  // - Uses index on _id for fast lookup
```

---

### 2. GET /api/clinics (Get All Clinics)

#### Request
```http
GET /api/clinics?page=1&limit=10&search=Quận 1
```

#### Response
```json
{
  "success": true,
  "data": {
    "clinics": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "MedConnect Clinic Quận 1",
        "address": "123 Đường ABC, Quận 1, TP.HCM",
        "latitude": 10.7769,
        "longitude": 106.7009,
        "coordinates": [106.7009, 10.7769],
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

#### Code Flow
```javascript
export async function getAllClinics(req, res) {
  const { page = 1, limit = 10, search = "" } = req.query;
  
  // Build search query
  const searchQuery = {};
  if (search) {
    searchQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { address: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }
  
  // Build sort query
  const sortQuery = { createdAt: -1 };
  
  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Fetch clinics
  const clinics = await Clinic.find(searchQuery)
    .sort(sortQuery)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
  
  // Get total count
  const total = await Clinic.countDocuments(searchQuery);
  
  // Format response
  const formattedClinics = clinics.map(formatClinic);
  
  return ok(res, {
    clinics: formattedClinics,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}
```

---

## DATABASE MODEL

### Clinic Schema

```javascript
const ClinicSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["hospital", "clinic", "center"],
      default: "hospital",
    },
    location: { type: String, trim: true },
    address: String,
    latitude: Number,
    longitude: Number,
    phone: String,
    specialties: [{ type: String, trim: true }],
    doctorCount: { type: Number, default: 0 },
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    geo: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        validate: {
          validator: (v) =>
            !v ||
            (Array.isArray(v) &&
              v.length === 2 &&
              v.every((n) => typeof n === "number")),
          message: "geo.coordinates must be [lng, lat]",
        },
      },
    },
  },
  { timestamps: true, versionKey: false, collection: "Clinics" }
);

// 2dsphere index cho GeoJSON
ClinicSchema.index({ geo: "2dsphere" });
```

### Giải thích các trường quan trọng

#### 1. geo (GeoJSON)
- **Type**: GeoJSON Point
- **Coordinates**: `[longitude, latitude]` (theo chuẩn GeoJSON)
- **Index**: `2dsphere` index để hỗ trợ các query địa lý:
  - Tìm kiếm các điểm gần một tọa độ
  - Tính khoảng cách giữa các điểm
  - Tìm kiếm trong một vùng (bounding box)

#### 2. latitude/longitude (Legacy)
- **Type**: Number
- **Purpose**: Lưu trữ tọa độ riêng lẻ (legacy format)
- **Note**: Vẫn được giữ để tương thích với code cũ

#### 3. Validation
- **Coordinates validation**: Đảm bảo coordinates là array 2 phần tử số
- **Rating validation**: Đảm bảo rating trong khoảng 0-5
- **Type validation**: Đảm bảo type là một trong các giá trị enum

### Database Indexes

```javascript
// Index trên _id (tự động tạo bởi MongoDB)
{ _id: 1 }

// Index trên geo (2dsphere) - cho các query địa lý
{ geo: "2dsphere" }

// Có thể thêm các index khác:
// - Index trên name để tìm kiếm nhanh
// - Index trên location để filter theo location
// - Index trên type để filter theo type
```

---

## CÁC TRƯỜNG HỢP SỬ DỤNG

### 1. Xem bản đồ cơ sở y tế từ danh sách

**User Story**: Người dùng muốn xem vị trí của cơ sở y tế trên bản đồ

**Flow**:
1. Người dùng vào trang "Cơ sở y tế"
2. Click vào card cơ sở y tế
3. Điều hướng đến trang bản đồ với ID clinic
4. Trang bản đồ fetch dữ liệu clinic
5. Hiển thị thông tin clinic và bản đồ
6. Người dùng có thể xem vị trí trên bản đồ
7. Người dùng có thể click "Chỉ đường" để mở Google Maps

**Code Flow**:
```
CoSoYTe.jsx (handleFacilityClick)
  → navigate(`/ban-do-co-so-y-te?id=${clinicId}`)
  → ClinicMapPage.jsx (useEffect)
    → api.get(`/api/clinics/${clinicId}`)
    → clinicController.getClinicById
      → Clinic.findById(id)
      → Response với clinic data
    → setClinic(clinicData)
    → Render ClinicMap component
      → getCoordinates()
      → Render MapContainer với Marker
```

---

### 2. Xem bản đồ trong trang đặt lịch

**User Story**: Người dùng muốn xem vị trí phòng khám khi đặt lịch

**Flow**:
1. Người dùng chọn bác sĩ và phòng khám
2. Trang đặt lịch hiển thị component ClinicMap
3. Component hiển thị bản đồ với vị trí phòng khám
4. Người dùng có thể xem vị trí và mở chỉ đường

**Code Flow**:
```
ChonThoiGian.jsx
  → defaultClinic được set khi chọn clinic
  → Render ClinicMap component
    → ClinicMap.jsx
      → getCoordinates() từ defaultClinic
      → Render MapContainer với Marker
```

---

### 3. Mở chỉ đường trên Google Maps

**User Story**: Người dùng muốn mở Google Maps để chỉ đường đến cơ sở y tế

**Flow**:
1. Người dùng click button "Chỉ đường"
2. Hàm `handleGetDirections` được gọi
3. Kiểm tra có tọa độ không:
   - Có tọa độ: Mở Google Maps với tọa độ
   - Không có tọa độ: Mở Google Maps với địa chỉ
4. Google Maps mở trong tab mới

**Code Flow**:
```
ClinicMap.jsx (Button onClick)
  → handleGetDirections()
  → onGetDirections(clinic) callback
    → ClinicMapPage.jsx (handleGetDirections)
      → Check coordinates
        → If has coordinates: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        → Else if has address: `https://www.google.com/maps/dir/?api=1&destination=${address}`
      → window.open(url, "_blank")
```

---

## XỬ LÝ LỖI VÀ EDGE CASES

### 1. Không có clinicId trong URL

**Scenario**: Người dùng truy cập `/ban-do-co-so-y-te` mà không có query parameter `id`

**Xử lý**:
```javascript
if (!clinicId) {
  setError("Không tìm thấy ID cơ sở y tế");
  setLoading(false);
  return;
}
```

**UI**: Hiển thị error message và button "Quay lại danh sách"

---

### 2. Clinic không tồn tại

**Scenario**: ClinicId hợp lệ nhưng không tìm thấy clinic trong database

**Xử lý Backend**:
```javascript
const clinic = await Clinic.findById(id).lean();
if (!clinic) {
  return fail(res, 404, ERROR_CODES.NOT_FOUND, "Clinic not found");
}
```

**Xử lý Frontend**:
```javascript
if (response?.success && response?.data?.clinic) {
  setClinic(response.data.clinic);
} else {
  setError("Không tìm thấy thông tin cơ sở y tế");
}
```

**UI**: Hiển thị error message và button "Quay lại danh sách"

---

### 3. Không có tọa độ (coordinates)

**Scenario**: Clinic có địa chỉ nhưng không có tọa độ (latitude/longitude)

**Xử lý**:
```javascript
const coordinates = getCoordinates();
const hasValidCoordinates = coordinates !== null;

// Nếu không có tọa độ
if (!hasValidCoordinates) {
  return (
    <div className="clinic-map-placeholder">
      <EnvironmentOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
      <p>Không có thông tin tọa độ phòng khám</p>
      {clinic?.address && (
        <Button onClick={handleGetDirections}>
          Mở chỉ đường với địa chỉ: {clinic.address}
        </Button>
      )}
    </div>
  );
}
```

**UI**: Hiển thị placeholder với icon và button "Mở chỉ đường với địa chỉ"

---

### 4. Tọa độ không hợp lệ (NaN, null, undefined)

**Scenario**: Clinic có tọa độ nhưng không hợp lệ (NaN, null, undefined)

**Xử lý**:
```javascript
const getCoordinates = () => {
  if (clinic?.geo?.coordinates && Array.isArray(clinic.geo.coordinates) && clinic.geo.coordinates.length === 2) {
    const [lng, lat] = clinic.geo.coordinates;
    // Validate: Kiểm tra type và không phải NaN
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
  }
  // Fallback to latitude/longitude
  if (clinic?.latitude && clinic?.longitude) {
    const lat = parseFloat(clinic.latitude);
    const lng = parseFloat(clinic.longitude);
    // Validate: Kiểm tra không phải NaN
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
  }
  return null;
};
```

**UI**: Xử lý giống trường hợp "Không có tọa độ"

---

### 5. API Error (Network, Server Error)

**Scenario**: Lỗi khi gọi API (network error, server error, timeout)

**Xử lý**:
```javascript
try {
  setLoading(true);
  const response = await api.get(`/api/clinics/${clinicId}`);
  // ...
} catch (err) {
  console.error("Error fetching clinic:", err);
  setError("Có lỗi khi tải thông tin cơ sở y tế");
} finally {
  setLoading(false);
}
```

**UI**: Hiển thị error message và button "Quay lại danh sách"

---

### 6. Leaflet Map không load được tiles

**Scenario**: OpenStreetMap tiles không load được (network issue, CORS, etc.)

**Xử lý**: Leaflet tự động xử lý lỗi và hiển thị thông báo lỗi mặc định

**UI**: Leaflet hiển thị thông báo "Failed to load tiles" hoặc bản đồ trống

---

### 7. Google Maps không mở được

**Scenario**: Browser block popup, hoặc Google Maps service down

**Xử lý**: 
- `window.open()` có thể bị block bởi browser
- Không có xử lý lỗi cụ thể (dựa vào browser để xử lý)

**UI**: Browser hiển thị thông báo "Pop-up blocked" hoặc không có gì xảy ra

---

## TỐI ƯU HÓA VÀ BEST PRACTICES

### 1. Performance Optimization

#### a. Sử dụng `.lean()` trong Mongoose query
```javascript
const clinic = await Clinic.findById(id).lean();
```
**Lý do**: 
- `.lean()` trả về plain JavaScript object thay vì Mongoose document
- Giảm memory usage và tăng performance
- Phù hợp khi chỉ cần đọc dữ liệu, không cần modify

#### b. Key prop trong MapContainer
```javascript
<MapContainer
  key={`map-${coordinates[0]}-${coordinates[1]}`}
  center={coordinates}
  ...
>
```
**Lý do**: 
- Đảm bảo component re-render khi coordinates thay đổi
- Tránh lỗi bản đồ không cập nhật khi coordinates thay đổi

#### c. Lazy loading Leaflet
```javascript
// Leaflet chỉ load khi cần
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
```
**Lý do**: 
- Giảm bundle size ban đầu
- Chỉ load khi component được render

---

### 2. Code Quality

#### a. Early return pattern
```javascript
if (!clinic) {
  return <Placeholder />;
}
```
**Lý do**: 
- Giảm nesting và tăng readability
- Dễ maintain và debug

#### b. Validation và type checking
```javascript
if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
  return [lat, lng];
}
```
**Lý do**: 
- Đảm bảo data integrity
- Tránh lỗi runtime

#### c. Error handling
```javascript
try {
  // API call
} catch (err) {
  console.error("Error fetching clinic:", err);
  setError("Có lỗi khi tải thông tin cơ sở y tế");
} finally {
  setLoading(false);
}
```
**Lý do**: 
- Xử lý lỗi một cách graceful
- User experience tốt hơn

---

### 3. User Experience

#### a. Loading state
```javascript
if (loading) {
  return (
    <div>
      <Spin size="large" />
      <div>Đang tải thông tin cơ sở y tế...</div>
    </div>
  );
}
```
**Lý do**: 
- Người dùng biết hệ thống đang xử lý
- Tránh cảm giác "frozen"

#### b. Error state với action
```javascript
if (error || !clinic) {
  return (
    <Card>
      <Text type="danger">{error}</Text>
      <Button onClick={() => navigate("/co-so-y-te")}>
        Quay lại danh sách
      </Button>
    </Card>
  );
}
```
**Lý do**: 
- Người dùng biết có lỗi xảy ra
- Có action để quay lại (không bị stuck)

#### c. Fallback khi không có tọa độ
```javascript
if (!hasValidCoordinates) {
  return (
    <Placeholder>
      <Button onClick={handleGetDirections}>
        Mở chỉ đường với địa chỉ: {clinic.address}
      </Button>
    </Placeholder>
  );
}
```
**Lý do**: 
- Vẫn có thể sử dụng tính năng "Chỉ đường" dù không có tọa độ
- User experience tốt hơn

---

### 4. Security

#### a. Input validation
```javascript
const clinicId = searchParams.get("id");
// MongoDB sẽ validate ObjectId format
```
**Lý do**: 
- Tránh injection attacks
- Đảm bảo data integrity

#### b. URL encoding
```javascript
const address = encodeURIComponent(clinicData.address);
const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
```
**Lý do**: 
- Tránh XSS attacks
- Đảm bảo URL hợp lệ

---

### 5. Maintainability

#### a. Separation of concerns
- **ClinicMapPage**: Xử lý data fetching và routing
- **ClinicMap**: Xử lý hiển thị bản đồ
- **clinicController**: Xử lý business logic
- **clinic.model**: Định nghĩa data structure

#### b. Reusable component
```javascript
<ClinicMap clinic={clinic} onGetDirections={handleGetDirections} />
```
**Lý do**: 
- Component có thể tái sử dụng ở nhiều nơi
- Dễ maintain và test

#### c. Constants và configuration
```javascript
// Map configuration
const MAP_CONFIG = {
  zoom: 15,
  scrollWheelZoom: true,
  tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};
```
**Lý do**: 
- Dễ thay đổi configuration
- Tránh magic numbers

---

## TỔNG KẾT

### Luồng hoạt động chính
1. **User click clinic** → Navigate to map page với clinicId
2. **ClinicMapPage mount** → Fetch clinic data từ API
3. **Backend query** → Find clinic by ID trong database
4. **Response** → Return clinic data với coordinates
5. **ClinicMap render** → Extract coordinates và render map
6. **Leaflet render** → Hiển thị bản đồ với marker
7. **User click "Chỉ đường"** → Mở Google Maps

### Các điểm quan trọng
- **Coordinates format**: GeoJSON `[lng, lat]` → Leaflet `[lat, lng]`
- **Fallback mechanism**: `geo.coordinates` → `latitude/longitude` → `address`
- **Error handling**: Xử lý các trường hợp lỗi một cách graceful
- **Performance**: Sử dụng `.lean()`, key prop, lazy loading
- **User experience**: Loading state, error state, fallback UI

### Các tính năng chính
- ✅ Hiển thị bản đồ với marker
- ✅ Hiển thị thông tin clinic
- ✅ Mở Google Maps để chỉ đường
- ✅ Fallback khi không có tọa độ
- ✅ Error handling
- ✅ Responsive design
- ✅ Reusable component

---

## TÀI LIỆU THAM KHẢO

- [React Leaflet Documentation](https://react-leaflet.js.org/)
- [Leaflet Documentation](https://leafletjs.com/)
- [MongoDB Geospatial Queries](https://www.mongodb.com/docs/manual/geospatial-queries/)
- [GeoJSON Specification](https://geojson.org/)
- [Google Maps URL Parameters](https://developers.google.com/maps/documentation/urls/get-started)

---