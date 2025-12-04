/* =======================================================
 * COLLECTION: Clinics
 * Database Model cho Phòng khám/Cơ sở y tế
 * 
 * Mục đích:
 * - Lưu trữ thông tin các cơ sở y tế (phòng khám, bệnh viện)
 * - Quản lý tọa độ địa lý để hiển thị trên bản đồ
 * - Hỗ trợ tìm kiếm địa lý với GeoJSON và 2dsphere index
 * ======================================================= */

// Import Mongoose để định nghĩa Schema và Model
import mongoose from "mongoose";
const { Schema, model } = mongoose;

/**
 * ClinicSchema - MongoDB Schema cho Collection Clinics
 * 
 * Schema này định nghĩa cấu trúc dữ liệu cho mỗi document trong collection Clinics
 * Bao gồm thông tin cơ bản, tọa độ địa lý (2 format), và metadata
 */
const ClinicSchema = new Schema(
  {
    // === THÔNG TIN CƠ BẢN ===
    
    /**
     * name: Tên cơ sở y tế
     * - required: Bắt buộc phải có
     * - trim: Tự động xóa khoảng trắng đầu/cuối
     * - Ví dụ: "MedConnect Clinic Quận 1"
     */
    name: { type: String, required: true, trim: true },
    
    /**
     * type: Loại cơ sở y tế
     * - enum: Chỉ chấp nhận 3 giá trị ["hospital", "clinic", "center"]
     * - default: "hospital" (mặc định là bệnh viện)
     * - hospital: Bệnh viện
     * - clinic: Phòng khám
     * - center: Trung tâm y tế
     */
    type: {
      type: String,
      enum: ["hospital", "clinic", "center"],
      default: "hospital",
    },
    
    /**
     * location: Tên vị trí/khu vực
     * - trim: Tự động xóa khoảng trắng đầu/cuối
     * - Ví dụ: "Quận 1", "Hải Châu", "Thủ Đức"
     * - Dùng để filter/group theo khu vực
     */
    location: { type: String, trim: true },
    
    /**
     * address: Địa chỉ đầy đủ
     * - Ví dụ: "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
     * - Dùng khi không có tọa độ, mở Google Maps bằng địa chỉ
     */
    address: String,
    
    // === TỌA ĐỘ ĐỊA LÝ (LEGACY FORMAT) ===
    
    /**
     * latitude: Vĩ độ (Legacy format)
     * - Type: Number (floating point)
     * - Range: -90 đến 90
     * - Ví dụ: 10.7769 (Sài Gòn)
     * - Note: Được giữ để tương thích với code cũ
     */
    latitude: Number,
    
    /**
     * longitude: Kinh độ (Legacy format)
     * - Type: Number (floating point)
     * - Range: -180 đến 180
     * - Ví dụ: 106.7009 (Sài Gòn)
     * - Note: Được giữ để tương thích với code cũ
     */
    longitude: Number,
    
    // === THÔNG TIN LIÊN HỆ ===
    
    /**
     * phone: Số điện thoại
     * - Type: String (vì có thể chứa ký tự đặc biệt như +84, dấu ngoặc)
     * - Ví dụ: "0123456789", "+84123456789", "(028) 1234 5678"
     */
    phone: String,
    
    // === THÔNG TIN BỔ SUNG ===
    
    /**
     * specialties: Danh sách chuyên khoa
     * - Type: Array of String
     * - trim: Tự động xóa khoảng trắng cho mỗi phần tử
     * - Ví dụ: ["Cardiology", "Pediatrics", "Neurology"]
     * - Dùng để filter cơ sở y tế theo chuyên khoa
     */
    specialties: [{ type: String, trim: true }],
    
    /**
     * doctorCount: Số lượng bác sĩ
     * - Type: Number (integer)
     * - default: 0
     * - Dùng để hiển thị thông tin cho user
     */
    doctorCount: { type: Number, default: 0 },
    
    /**
     * rating: Đánh giá trung bình
     * - Type: Number (floating point)
     * - default: 4.0
     * - min: 0 (tối thiểu 0 sao)
     * - max: 5 (tối đa 5 sao)
     * - Ví dụ: 4.5, 3.8, 5.0
     */
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    
    /**
     * reviewCount: Số lượng đánh giá
     * - Type: Number (integer)
     * - default: 0
     * - Dùng để hiển thị số lượng người đánh giá
     */
    reviewCount: { type: Number, default: 0 },
    
    /**
     * description: Mô tả cơ sở y tế
     * - Type: String (text)
     * - trim: Tự động xóa khoảng trắng đầu/cuối
     * - Ví dụ: "Phòng khám đa khoa với đội ngũ bác sĩ giàu kinh nghiệm..."
     */
    description: { type: String, trim: true },
    
    /**
     * image: URL hình ảnh đại diện
     * - Type: String (URL)
     * - trim: Tự động xóa khoảng trắng đầu/cuối
     * - Ví dụ: "https://example.com/images/clinic1.jpg"
     */
    image: { type: String, trim: true },
    
    // === TỌA ĐỘ ĐỊA LÝ (GEOJSON FORMAT) ===
    
    /**
     * geo: Tọa độ địa lý theo chuẩn GeoJSON
     * 
     * GeoJSON là chuẩn quốc tế để lưu trữ dữ liệu địa lý trong MongoDB
     * Cho phép sử dụng các query địa lý mạnh mẽ:
     * - $near: Tìm các điểm gần một vị trí
     * - $geoWithin: Tìm các điểm trong một vùng
     * - $geoIntersects: Tìm các điểm giao với một hình
     * 
     * Format: { type: "Point", coordinates: [lng, lat] }
     * 
     * QUAN TRỌNG: GeoJSON sử dụng [longitude, latitude], KHÔNG phải [latitude, longitude]
     */
    geo: {
      /**
       * type: Loại hình học GeoJSON
       * - enum: Chỉ chấp nhận "Point" (điểm)
       * - default: "Point"
       * - GeoJSON hỗ trợ nhiều loại: Point, LineString, Polygon, etc.
       * - Ở đây chỉ dùng Point vì cơ sở y tế là một điểm trên bản đồ
       */
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      
      /**
       * coordinates: Tọa độ [longitude, latitude]
       * 
       * Type: Array of 2 Numbers
       * Format: [lng, lat] - THEO CHUẨN GEOJSON
       * 
       * Ví dụ: [106.7009, 10.7769]
       *         ^        ^
       *         lng      lat
       * 
       * Validation:
       * - Phải là array
       * - Phải có đúng 2 phần tử
       * - Mỗi phần tử phải là number
       * - Nếu không hợp lệ, MongoDB sẽ reject document
       * 
       * Range hợp lệ:
       * - longitude: -180 đến 180
       * - latitude: -90 đến 90
       */
      coordinates: {
        type: [Number], // Array of Numbers
        validate: {
          validator: (v) =>
            // Cho phép null/undefined hoặc array hợp lệ
            !v ||
            (Array.isArray(v) &&          // Phải là array
              v.length === 2 &&            // Phải có đúng 2 phần tử
              v.every((n) => typeof n === "number")), // Mỗi phần tử phải là number
          message: "geo.coordinates must be [lng, lat]", // Message lỗi nếu validation fail
        },
      },
    },
  },
  // === SCHEMA OPTIONS ===
  {
    /**
     * timestamps: Tự động thêm createdAt và updatedAt
     * - createdAt: Thời điểm tạo document
     * - updatedAt: Thời điểm update document lần cuối
     * - MongoDB tự động quản lý 2 field này
     */
    timestamps: true,
    
    /**
     * versionKey: Tắt field __v (version key)
     * - MongoDB mặc định thêm field __v để track version
     * - Set false để không thêm field này (giảm dung lượng)
     */
    versionKey: false,
    
    /**
     * collection: Tên collection trong MongoDB
     * - Mặc định: "clinics" (lowercase, plural)
     * - Tùy chỉnh: "Clinics" (PascalCase)
     */
    collection: "Clinics",
  }
);

/**
 * INDEX: 2dsphere index cho trường geo
 * 
 * 2dsphere index là index đặc biệt của MongoDB cho dữ liệu địa lý
 * 
 * Công dụng:
 * - Tối ưu hóa các query địa lý (tìm kiếm gần, trong vùng, etc.)
 * - Hỗ trợ $near, $geoWithin, $geoIntersects
 * - Tính toán khoảng cách trên bề mặt cầu (Earth)
 * 
 * Cách hoạt động:
 * - MongoDB chia bản đồ thành các ô (cells)
 * - Index lưu trữ mapping từ cell ID đến documents
 * - Khi query, MongoDB chỉ cần tìm trong các cells liên quan
 * 
 * Performance:
 * - Tăng tốc query địa lý từ O(n) -> O(log n)
 * - Ví dụ: Tìm 10 phòng khám gần nhất trong 1 triệu documents
 *   + Không index: ~1-2 giây
 *   + Có index: ~10-50ms
 * 
 * Note: Index này chỉ áp dụng cho trường geo (GeoJSON format)
 */
ClinicSchema.index({ geo: "2dsphere" });

/**
 * Export Model
 * 
 * Tạo và export Mongoose Model từ Schema
 * - Model name: "Clinic"
 * - Collection: "Clinics" (defined in schema options)
 * - Schema: ClinicSchema
 * 
 * Model này cung cấp các methods để tương tác với database:
 * - Clinic.find() - Tìm nhiều documents
 * - Clinic.findById() - Tìm document theo ID
 * - Clinic.create() - Tạo document mới
 * - Clinic.updateOne() - Update một document
 * - Clinic.deleteOne() - Xóa một document
 * - etc.
 */
export default model("Clinic", ClinicSchema);
