/**
 * ======================================================================
 * CLINIC CONTROLLER
 * ======================================================================
 * 
 * Controller xử lý các API endpoints liên quan đến Clinics (Cơ sở y tế)
 * 
 * Chức năng chính:
 * - Lấy danh sách cơ sở y tế (có pagination, search, sort)
 * - Lấy chi tiết một cơ sở y tế theo ID
 * - Tạo mới cơ sở y tế
 * - Cập nhật thông tin cơ sở y tế
 * - Xóa cơ sở y tế
 * - Lấy danh sách locations duy nhất
 * 
 * Các API endpoints:
 * - GET    /api/clinics           - Lấy danh sách clinics
 * - GET    /api/clinics/:id       - Lấy chi tiết clinic
 * - POST   /api/clinics           - Tạo clinic mới (cần auth)
 * - PUT    /api/clinics/:id       - Cập nhật clinic (cần auth)
 * - DELETE /api/clinics/:id       - Xóa clinic (cần auth)
 * - GET    /api/clinics/locations - Lấy danh sách locations
 */

// Import Model
import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";

// Import utilities
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";

/**
 * ======================================================================
 * GET ALL CLINICS - Lấy danh sách cơ sở y tế
 * ======================================================================
 * 
 * Endpoint: GET /api/clinics
 * Access: Public (không cần authentication)
 * 
 * Query Parameters:
 * @param {number} page - Số trang (default: 1)
 * @param {number} limit - Số lượng items per page (default: 10)
 * @param {string} search - Từ khóa tìm kiếm (tìm trong name, address, phone)
 * @param {string} sortBy - Field để sort (default: "createdAt")
 * @param {string} sortOrder - Thứ tự sort: "asc" hoặc "desc" (default: "desc")
 * 
 * Response:
 * @returns {Object} {
 *   success: true,
 *   data: {
 *     clinics: [...],        // Array of clinic objects
 *     pagination: {
 *       page: 1,
 *       limit: 10,
 *       total: 50,           // Tổng số clinics
 *       pages: 5             // Tổng số pages
 *     }
 *   }
 * }
 * 
 * Ví dụ: GET /api/clinics?page=2&limit=20&search=Quận 1&sortBy=name&sortOrder=asc
 */
export async function getAllClinics(req, res) {
  try {
    // === BƯỚC 1: LẤY QUERY PARAMETERS ===
    // Destructure và set default values từ req.query
    const {
      page = 1,              // Trang hiện tại (default: 1)
      limit = 10,            // Số items mỗi trang (default: 10)
      search = "",           // Từ khóa tìm kiếm (default: "")
      sortBy = "createdAt",  // Field để sort (default: "createdAt")
      sortOrder = "desc",    // Thứ tự sort (default: "desc")
    } = req.query;

    // === BƯỚC 2: XÂY DỰNG SEARCH QUERY ===
    /**
     * searchQuery: MongoDB query object để tìm kiếm
     * Sử dụng $or operator để tìm trong nhiều fields
     * $regex: Tìm kiếm partial match (như SQL LIKE)
     * options: "i" = case insensitive (không phân biệt hoa thường)
     */
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: "i" } },      // Tìm trong tên
        { address: { $regex: search, $options: "i" } },   // Tìm trong địa chỉ
        { phone: { $regex: search, $options: "i" } },     // Tìm trong số điện thoại
      ];
    }
    // Nếu không có search, searchQuery = {} (lấy tất cả)

    // === BƯỚC 3: XÂY DỰNG SORT QUERY ===
    /**
     * sortQuery: MongoDB sort object
     * -1 = descending (giảm dần: Z->A, 9->0, mới->cũ)
     * 1 = ascending (tăng dần: A->Z, 0->9, cũ->mới)
     * 
     * Ví dụ:
     * - { createdAt: -1 } -> Sắp xếp theo thời gian tạo, mới nhất trước
     * - { name: 1 } -> Sắp xếp theo tên, A->Z
     */
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // === BƯỚC 4: TÍNH TOÁN PAGINATION ===
    /**
     * skip: Số documents cần bỏ qua
     * Ví dụ:
     * - Page 1, limit 10: skip = (1-1) * 10 = 0 (lấy từ document 1-10)
     * - Page 2, limit 10: skip = (2-1) * 10 = 10 (lấy từ document 11-20)
     * - Page 3, limit 10: skip = (3-1) * 10 = 20 (lấy từ document 21-30)
     */
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // === BƯỚC 5: FETCH DỮ LIỆU TỪ DATABASE ===
    /**
     * Query MongoDB với chain methods:
     * 1. find(searchQuery) - Tìm documents match với searchQuery
     * 2. sort(sortQuery) - Sắp xếp kết quả
     * 3. skip(skip) - Bỏ qua N documents đầu (cho pagination)
     * 4. limit(limit) - Chỉ lấy N documents
     * 5. lean() - Trả về plain JS object thay vì Mongoose document
     *    (Tối ưu performance, giảm memory)
     * 
     * Ví dụ SQL tương đương:
     * SELECT * FROM clinics 
     * WHERE name LIKE '%search%' OR address LIKE '%search%' OR phone LIKE '%search%'
     * ORDER BY createdAt DESC
     * LIMIT 10 OFFSET 0
     */
    const clinics = await Clinic.find(searchQuery)
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // === BƯỚC 6: ĐẾM TỔNG SỐ DOCUMENTS ===
    /**
     * Đếm tổng số documents match với searchQuery
     * Cần để tính:
     * - Tổng số pages
     * - Hiển thị "Showing X of Y results"
     */
    const total = await Clinic.countDocuments(searchQuery);

    // === BƯỚC 7: FORMAT DỮ LIỆU RESPONSE ===
    /**
     * Format mỗi clinic object để:
     * - Có structure nhất quán
     * - Có default values cho các trường optional
     * - Chuyển _id thành id (dễ sử dụng ở client)
     * - Thêm coordinates từ geo.coordinates
     */
    const formattedClinics = clinics.map((clinic) => ({
      id: clinic._id,                                  // ID dạng string
      _id: clinic._id,                                 // Giữ lại _id (tương thích)
      name: clinic.name || "",                         // Tên (default: "")
      type: clinic.type || "hospital",                 // Loại (default: "hospital")
      location: clinic.location || "",                 // Vị trí (default: "")
      address: clinic.address || "",                   // Địa chỉ (default: "")
      phone: clinic.phone || "",                       // Số điện thoại (default: "")
      latitude: clinic.latitude,                       // Vĩ độ (legacy format)
      longitude: clinic.longitude,                     // Kinh độ (legacy format)
      coordinates: clinic.geo?.coordinates,            // Tọa độ GeoJSON [lng, lat]
      specialties: clinic.specialties || [],           // Chuyên khoa (default: [])
      doctorCount: clinic.doctorCount || 0,            // Số bác sĩ (default: 0)
      rating: clinic.rating || 4.0,                    // Đánh giá (default: 4.0)
      reviewCount: clinic.reviewCount || 0,            // Số đánh giá (default: 0)
      description: clinic.description || "",           // Mô tả (default: "")
      image: clinic.image || "",                       // Hình ảnh (default: "")
      createdAt: clinic.createdAt,                     // Thời gian tạo
      updatedAt: clinic.updatedAt,                     // Thời gian cập nhật
    }));

    // === BƯỚC 8: TRẢ VỀ RESPONSE THÀNH CÔNG ===
    /**
     * Response structure:
     * {
     *   success: true,
     *   data: {
     *     clinics: [...],
     *     pagination: { page, limit, total, pages }
     *   }
     * }
     */
    return ok(res, {
      clinics: formattedClinics,
      pagination: {
        page: parseInt(page),                          // Trang hiện tại
        limit: parseInt(limit),                        // Items per page
        total,                                          // Tổng số clinics
        pages: Math.ceil(total / parseInt(limit)),     // Tổng số pages (làm tròn lên)
      },
    });
  } catch (error) {
    // === XỬ LÝ LỖI ===
    // Log error để debug
    console.error("❌ /api/clinics error:", error);
    
    // Trả về response lỗi 500 (Internal Server Error)
    return fail(
      res,
      500,                           // HTTP status code
      ERROR_CODES.SERVER_ERROR,      // Error code
      error.message || String(error) // Error message
    );
  }
}

/**
 * ======================================================================
 * GET CLINIC BY ID - Lấy chi tiết một cơ sở y tế theo ID
 * ======================================================================
 * 
 * Endpoint: GET /api/clinics/:id
 * Access: Public (không cần authentication)
 * 
 * URL Parameters:
 * @param {string} id - MongoDB ObjectId của clinic
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   data: {
 *     clinic: {
 *       id: "507f1f77bcf86cd799439011",
 *       name: "MedConnect Clinic Quận 1",
 *       address: "123 Đường ABC, Quận 1, TP.HCM",
 *       latitude: 10.7769,
 *       longitude: 106.7009,
 *       coordinates: [106.7009, 10.7769],  // [lng, lat] for map
 *       ...
 *     }
 *   }
 * }
 * 
 * Response Error (404):
 * {
 *   success: false,
 *   error: {
 *     code: "NOT_FOUND",
 *     message: "Clinic not found"
 *   }
 * }
 * 
 * Use case:
 * - Hiển thị trang chi tiết clinic
 * - Hiển thị bản đồ với vị trí clinic (ClinicMapPage)
 * - Hiển thị popup thông tin clinic
 * 
 * Ví dụ: GET /api/clinics/507f1f77bcf86cd799439011
 */
export async function getClinicById(req, res) {
  try {
    // === BƯỚC 1: LẤY ID TỪ URL PARAMS ===
    const { id } = req.params;

    // === BƯỚC 2: TÌM CLINIC TRONG DATABASE ===
    /**
     * Clinic.findById(id) - Tìm document theo MongoDB ObjectId
     * .lean() - Trả về plain JS object (tối ưu performance)
     * 
     * MongoDB sử dụng index trên _id nên query này rất nhanh O(1)
     */
    const clinic = await Clinic.findById(id).lean();
    
    // === BƯỚC 3: KIỂM TRA CLINIC CÓ TỒN TẠI KHÔNG ===
    if (!clinic) {
      // Trả về lỗi 404 nếu không tìm thấy
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Clinic not found");
    }

    // === BƯỚC 4: FORMAT DỮ LIỆU RESPONSE ===
    /**
     * Format clinic object với:
     * - Structure nhất quán
     * - Default values cho các trường optional
     * - Cả 2 format tọa độ: latitude/longitude và coordinates
     * 
     * QUAN TRỌNG: Cần cả 2 format tọa độ vì:
     * - latitude/longitude: Dễ hiểu, tương thích code cũ
     * - coordinates [lng, lat]: GeoJSON format cho Leaflet map
     */
    const formattedClinic = {
      id: clinic._id,                              // ID string
      name: clinic.name,                           // Tên clinic
      type: clinic.type || "hospital",             // Loại (default: "hospital")
      location: clinic.location || "Không xác định", // Vị trí (default: "Không xác định")
      address: clinic.address,                     // Địa chỉ đầy đủ
      phone: clinic.phone,                         // Số điện thoại
      
      // === TỌA ĐỘ ĐỊA LÝ ===
      latitude: clinic.latitude,                   // Vĩ độ (legacy format)
      longitude: clinic.longitude,                 // Kinh độ (legacy format)
      coordinates: clinic.geo?.coordinates,        // [lng, lat] (GeoJSON format)
      // Client sẽ ưu tiên dùng coordinates nếu có, fallback sang latitude/longitude
      
      // === THÔNG TIN BỔ SUNG ===
      specialties: clinic.specialties || [],       // Chuyên khoa
      doctorCount: clinic.doctorCount || 0,        // Số bác sĩ
      rating: clinic.rating || 4.0,                // Đánh giá
      reviewCount: clinic.reviewCount || 0,        // Số đánh giá
      description: clinic.description || "",       // Mô tả
      image: clinic.image || "",                   // Hình ảnh
      
      // === TIMESTAMPS ===
      createdAt: clinic.createdAt,                 // Thời gian tạo
      updatedAt: clinic.updatedAt,                 // Thời gian cập nhật
    };

    // === BƯỚC 5: TRẢ VỀ RESPONSE THÀNH CÔNG ===
    return ok(res, { clinic: formattedClinic });
  } catch (error) {
    // === XỬ LÝ LỖI ===
    // Log error để debug
    console.error("❌ /api/clinics/:id error:", error);
    
    // Trả về response lỗi 500 (Internal Server Error)
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * ======================================================================
 * CREATE CLINIC - Tạo mới một cơ sở y tế
 * ======================================================================
 * 
 * Endpoint: POST /api/clinics
 * Access: Protected (cần authentication với authGuard middleware)
 * 
 * Request Body:
 * {
 *   name*: "MedConnect Clinic Quận 1",  // required
 *   type: "hospital",                    // optional, default: "hospital"
 *   location: "Quận 1",                  // optional
 *   address: "123 Đường ABC...",        // optional
 *   phone: "0123456789",                 // optional
 *   latitude: 10.7769,                   // optional (number hoặc string)
 *   longitude: 106.7009,                 // optional (number hoặc string)
 *   specialties: ["Cardiology", "..."],  // optional, default: []
 *   doctorCount: 10,                     // optional, default: 0
 *   rating: 4.5,                         // optional, default: 4.0
 *   reviewCount: 100,                    // optional, default: 0
 *   description: "Mô tả...",            // optional, default: ""
 *   image: "https://...",               // optional, default: ""
 * }
 * 
 * Response Success (201):
 * {
 *   success: true,
 *   data: {
 *     clinic: { ... }  // Clinic object đã tạo
 *   }
 * }
 * 
 * Note:
 * - Tự động tạo geo object (GeoJSON) từ latitude/longitude
 * - Tự động thêm createdAt và updatedAt (timestamps)
 * - Validation theo ClinicSchema
 */
export async function createClinic(req, res) {
  try {
    // === BƯỚC 1: LẤY DỮ LIỆU TỪ REQUEST BODY ===
    const {
      name,          // Tên clinic (required)
      type,          // Loại: "hospital", "clinic", "center"
      location,      // Vị trí: "Quận 1", "Hải Châu", etc.
      address,       // Địa chỉ đầy đủ
      phone,         // Số điện thoại
      latitude,      // Vĩ độ (có thể là string hoặc number)
      longitude,     // Kinh độ (có thể là string hoặc number)
      specialties,   // Array chuyên khoa
      doctorCount,   // Số bác sĩ
      rating,        // Đánh giá
      reviewCount,   // Số đánh giá
      description,   // Mô tả
      image,         // URL hình ảnh
    } = req.body;

    // === BƯỚC 2: XÂY DỰNG GEO OBJECT (GEOJSON) ===
    /**
     * Chuyển đổi latitude/longitude thành GeoJSON format
     * 
     * GeoJSON format: { type: "Point", coordinates: [lng, lat] }
     * 
     * QUAN TRỌNG: 
     * - GeoJSON sử dụng [longitude, latitude], KHÔNG phải [latitude, longitude]
     * - Phải parseFloat() vì latitude/longitude có thể là string từ form
     * - Chỉ tạo geo nếu có cả latitude VÀ longitude
     */
    let geo = null;
    if (latitude && longitude) {
      geo = {
        type: "Point",
        // Chuyển đổi: (lat, lng) -> [lng, lat] (GeoJSON format)
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    // === BƯỚC 3: TẠO CLINIC DOCUMENT MỚI ===
    /**
     * new Clinic({ ... }) tạo Mongoose document mới
     * 
     * Document này chưa được lưu vào database
     * Validation sẽ được thực hiện khi gọi .save()
     */
    const clinic = new Clinic({
      name,                                      // Required field
      type: type || "hospital",                  // Default: "hospital"
      location,                                  // Optional
      address,                                   // Optional
      phone,                                     // Optional
      
      // === TỌA ĐỘ ĐỊA LÝ ===
      // Lưu cả 2 format để tương thích:
      latitude: latitude ? parseFloat(latitude) : null,     // Legacy format
      longitude: longitude ? parseFloat(longitude) : null,  // Legacy format
      geo,                                       // GeoJSON format (có 2dsphere index)
      
      // === THÔNG TIN BỔ SUNG ===
      specialties: specialties || [],            // Default: []
      doctorCount: doctorCount || 0,             // Default: 0
      rating: rating || 4.0,                     // Default: 4.0
      reviewCount: reviewCount || 0,             // Default: 0
      description: description || "",            // Default: ""
      image: image || "",                        // Default: ""
    });

    // === BƯỚC 4: LƯU VÀO DATABASE ===
    /**
     * .save() - Lưu document vào MongoDB collection "Clinics"
     * 
     * Quá trình:
     * 1. Chạy validation theo ClinicSchema
     * 2. Chạy middleware (pre-save hooks nếu có)
     * 3. Insert document vào database
     * 4. Tự động add timestamps (createdAt, updatedAt)
     * 5. Generate _id nếu chưa có
     * 
     * Nếu validation fail -> throw error -> catch block xử lý
     */
    await clinic.save();

    // === BƯỚC 5: FORMAT DỮ LIỆU RESPONSE ===
    /**
     * Format clinic object đã tạo
     * Tương tự như getClinicById
     */
    const formattedClinic = {
      id: clinic._id,
      name: clinic.name,
      type: clinic.type,
      location: clinic.location,
      address: clinic.address,
      phone: clinic.phone,
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      coordinates: clinic.geo?.coordinates,      // [lng, lat] cho map
      specialties: clinic.specialties,
      doctorCount: clinic.doctorCount,
      rating: clinic.rating,
      reviewCount: clinic.reviewCount,
      description: clinic.description,
      image: clinic.image,
      createdAt: clinic.createdAt,               // Auto-generated
      updatedAt: clinic.updatedAt,               // Auto-generated
    };

    // === BƯỚC 6: TRẢ VỀ RESPONSE THÀNH CÔNG ===
    /**
     * Status code 201 = Created (resource đã được tạo thành công)
     * Khác với 200 OK (dùng cho GET, PUT)
     */
    return ok(res, { clinic: formattedClinic }, 201);
  } catch (error) {
    // === XỬ LÝ LỖI ===
    // Log error để debug
    console.error("❌ /api/clinics POST error:", error);
    
    // Trả về response lỗi 500 (Internal Server Error)
    // Note: Nếu validation fail, error.message sẽ chứa thông tin validation
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * ======================================================================
 * UPDATE CLINIC - Cập nhật thông tin cơ sở y tế
 * ======================================================================
 * 
 * Endpoint: PUT /api/clinics/:id
 * Access: Protected (cần authentication với authGuard middleware)
 * 
 * URL Parameters:
 * @param {string} id - MongoDB ObjectId của clinic cần update
 * 
 * Request Body: (Tất cả đều optional, chỉ gửi những field cần update)
 * {
 *   name: "Tên mới",
 *   type: "clinic",
 *   location: "Quận 2",
 *   address: "456 Đường XYZ...",
 *   phone: "0987654321",
 *   latitude: 10.8231,
 *   longitude: 106.6297,
 *   specialties: ["Neurology"],
 *   doctorCount: 15,
 *   rating: 4.8,
 *   reviewCount: 150,
 *   description: "Mô tả mới...",
 *   image: "https://..."
 * }
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   data: {
 *     clinic: { ... }  // Clinic object đã update
 *   }
 * }
 * 
 * Response Error (404):
 * {
 *   success: false,
 *   error: {
 *     code: "NOT_FOUND",
 *     message: "Clinic not found"
 *   }
 * }
 * 
 * Note:
 * - Chỉ update những field được gửi trong request body
 * - Tự động update geo object nếu có latitude và longitude
 * - Tự động update updatedAt timestamp
 */
export async function updateClinic(req, res) {
  try {
    // === BƯỚC 1: LẤY ID TỪ URL PARAMS ===
    const { id } = req.params;
    
    // === BƯỚC 2: LẤY DỮ LIỆU CẦN UPDATE TỪ REQUEST BODY ===
    const {
      name,          // Tên mới (optional)
      type,          // Loại mới (optional)
      location,      // Vị trí mới (optional)
      address,       // Địa chỉ mới (optional)
      phone,         // Số điện thoại mới (optional)
      latitude,      // Vĩ độ mới (optional)
      longitude,     // Kinh độ mới (optional)
      specialties,   // Chuyên khoa mới (optional)
      doctorCount,   // Số bác sĩ mới (optional)
      rating,        // Đánh giá mới (optional)
      reviewCount,   // Số đánh giá mới (optional)
      description,   // Mô tả mới (optional)
      image,         // Hình ảnh mới (optional)
    } = req.body;

    // === BƯỚC 3: TÌM CLINIC TRONG DATABASE ===
    /**
     * findById() KHÔNG dùng .lean() vì cần Mongoose document để update
     * Mongoose document có methods như .save(), và có validation
     */
    const clinic = await Clinic.findById(id);
    
    // === BƯỚC 4: KIỂM TRA CLINIC CÓ TỒN TẠI KHÔNG ===
    if (!clinic) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Clinic not found");
    }

    // === BƯỚC 5: UPDATE CÁC FIELDS ===
    /**
     * Chỉ update những field có trong request body
     * Sử dụng if check để không ghi đè với undefined
     * 
     * Note: doctorCount, rating, reviewCount dùng !== undefined
     * vì giá trị 0 cũng là giá trị hợp lệ (0 == false)
     */
    if (name) clinic.name = name;
    if (type) clinic.type = type;
    if (location) clinic.location = location;
    if (address) clinic.address = address;
    if (phone) clinic.phone = phone;
    if (latitude) clinic.latitude = parseFloat(latitude);
    if (longitude) clinic.longitude = parseFloat(longitude);
    if (specialties) clinic.specialties = specialties;
    if (doctorCount !== undefined) clinic.doctorCount = doctorCount;
    if (rating !== undefined) clinic.rating = rating;
    if (reviewCount !== undefined) clinic.reviewCount = reviewCount;
    if (description) clinic.description = description;
    if (image) clinic.image = image;

    // === BƯỚC 6: UPDATE GEO COORDINATES ===
    /**
     * Nếu có cả latitude và longitude trong request
     * -> Update geo object (GeoJSON format)
     * 
     * Chuyển đổi: (lat, lng) -> [lng, lat] (GeoJSON format)
     */
    if (latitude && longitude) {
      clinic.geo = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    // === BƯỚC 7: LƯU VÀO DATABASE ===
    /**
     * .save() - Lưu changes vào database
     * 
     * Quá trình:
     * 1. Chạy validation theo ClinicSchema
     * 2. Chạy pre-save hooks nếu có
     * 3. Update document trong database
     * 4. Tự động update updatedAt timestamp
     * 
     * Mongoose chỉ update những fields đã thay đổi (dirty fields)
     */
    await clinic.save();

    // === BƯỚC 8: FORMAT DỮ LIỆU RESPONSE ===
    const formattedClinic = {
      id: clinic._id,
      name: clinic.name,
      type: clinic.type,
      location: clinic.location,
      address: clinic.address,
      phone: clinic.phone,
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      coordinates: clinic.geo?.coordinates,    // [lng, lat] cho map
      specialties: clinic.specialties,
      doctorCount: clinic.doctorCount,
      rating: clinic.rating,
      reviewCount: clinic.reviewCount,
      description: clinic.description,
      image: clinic.image,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,             // Đã được update tự động
    };

    // === BƯỚC 9: TRẢ VỀ RESPONSE THÀNH CÔNG ===
    return ok(res, { clinic: formattedClinic });
  } catch (error) {
    // === XỬ LÝ LỖI ===
    console.error("❌ /api/clinics/:id PUT error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * ======================================================================
 * GET UNIQUE LOCATIONS - Lấy danh sách các vị trí duy nhất
 * ======================================================================
 * 
 * Endpoint: GET /api/clinics/locations
 * Access: Public (không cần authentication)
 * 
 * Chức năng:
 * - Extract location names từ tên clinic và địa chỉ
 * - Ví dụ: "MedConnect Clinic Quận 1" -> "Quận 1"
 * - Ví dụ: "MedConnect Clinic Hải Châu" -> "Hải Châu"
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     locations: ["Quận 1", "Quận 2", "Hải Châu", "Thủ Đức", ...]
 *   }
 * }
 * 
 * Use case:
 * - Filter dropdown trong trang danh sách clinics
 * - Autocomplete location input
 * - Statistics by location
 */
export async function getUniqueLocations(req, res) {
  try {
    // === BƯỚC 1: LẤY TẤT CẢ CLINICS ===
    /**
     * .find({}) - Lấy tất cả documents
     * .select("name address") - Chỉ lấy 2 fields cần thiết (optimize performance)
     * .lean() - Trả về plain JS object
     */
    const clinics = await Clinic.find({}).select("name address").lean();

    // === BƯỚC 2: EXTRACT LOCATIONS ===
    /**
     * Sử dụng Set để tự động loại bỏ duplicates
     * Set chỉ lưu các giá trị duy nhất
     */
    const locationSet = new Set();

    // === BƯỚC 3: DUYỆT QUA TỪNG CLINIC VÀ EXTRACT LOCATION ===
    clinics.forEach((clinic) => {
      // === 3.1: EXTRACT TỪ TÊN CLINIC ===
      if (clinic.name) {
        // Pattern 1: "MedConnect Clinic [Location]"
        /**
         * Regex: /MedConnect Clinic (.+)/i
         * - (.+): Capture group - match bất kỳ ký tự nào (1 hoặc nhiều)
         * - i: Case insensitive
         * - match[0]: Toàn bộ chuỗi match
         * - match[1]: Capture group (location name)
         * 
         * Ví dụ:
         * - "MedConnect Clinic Quận 1" -> match[1] = "Quận 1"
         * - "MedConnect Clinic Hải Châu" -> match[1] = "Hải Châu"
         */
        const match = clinic.name.match(/MedConnect Clinic (.+)/i);
        if (match && match[1]) {
          locationSet.add(match[1].trim()); // trim() để loại bỏ khoảng trắng thừa
        }

        // Pattern 2: "Quận X" (X là số)
        /**
         * Regex: /Quận\s*(\d+)/i
         * - \s*: Match 0 hoặc nhiều whitespace
         * - (\d+): Capture group - match 1 hoặc nhiều số
         * - i: Case insensitive
         * 
         * Ví dụ:
         * - "... Quận 1 ..." -> quanMatch[1] = "1"
         * - "... Quận  10 ..." -> quanMatch[1] = "10"
         */
        const quanMatch = clinic.name.match(/Quận\s*(\d+)/i);
        if (quanMatch) {
          locationSet.add(`Quận ${quanMatch[1]}`);
        }

        // Pattern 3: Common district names
        /**
         * Danh sách các quận/huyện phổ biến
         * Hardcoded list để đảm bảo có format nhất quán
         */
        const commonDistricts = [
          "Hải Châu",
          "Thủ Đức",
          "Ninh Kiều",
          "Quận 1",
          "Quận 2",
          "Quận 3",
          "Quận 7",
          "Quận 10",
        ];

        commonDistricts.forEach((district) => {
          if (clinic.name.includes(district)) {
            locationSet.add(district);
          }
        });
      }

      // === 3.2: EXTRACT TỪ ĐỊA CHỈ ===
      /**
       * Tương tự như extract từ tên, nhưng áp dụng cho address field
       * Vì một số clinic có địa chỉ nhưng tên không theo format chuẩn
       */
      if (clinic.address) {
        // Pattern: "Quận X"
        const quanMatch = clinic.address.match(/Quận\s*(\d+)/i);
        if (quanMatch) {
          locationSet.add(`Quận ${quanMatch[1]}`);
        }

        // Common districts
        const commonDistricts = [
          "Hải Châu",
          "Thủ Đức",
          "Ninh Kiều",
          "Quận 1",
          "Quận 2",
          "Quận 3",
          "Quận 7",
          "Quận 10",
        ];

        commonDistricts.forEach((district) => {
          if (clinic.address.includes(district)) {
            locationSet.add(district);
          }
        });
      }
    });

    // === BƯỚC 4: CHUYỂN SET THÀNH ARRAY VÀ LỌC ===
    /**
     * Chuyển Set -> Array để có thể:
     * - Filter (loại bỏ locations không mong muốn)
     * - Sort (sắp xếp alphabetically)
     * 
     * Filter ra:
     * - "hai bà trưng" / "hai ba trung" (có thể là typo hoặc không mong muốn)
     */
    const locations = Array.from(locationSet)
      .filter((loc) => loc.toLowerCase() !== "hai bà trưng")
      .filter((loc) => loc.toLowerCase() !== "hai ba trung")
      .sort(); // Sort alphabetically (A->Z)

    // === BƯỚC 5: TRẢ VỀ RESPONSE ===
    return ok(res, { locations });
  } catch (error) {
    // === XỬ LÝ LỖI ===
    console.error("❌ /api/clinics/locations error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * ======================================================================
 * DELETE CLINIC - Xóa một cơ sở y tế
 * ======================================================================
 * 
 * Endpoint: DELETE /api/clinics/:id
 * Access: Protected (cần authentication với authGuard middleware)
 * 
 * URL Parameters:
 * @param {string} id - MongoDB ObjectId của clinic cần xóa
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   data: {
 *     message: "Clinic deleted successfully"
 *   }
 * }
 * 
 * Response Error (404):
 * {
 *   success: false,
 *   error: {
 *     code: "NOT_FOUND",
 *     message: "Clinic not found"
 *   }
 * }
 * 
 * Note:
 * - Xóa vĩnh viễn, không thể khôi phục
 * - Không xóa cascade (không tự động xóa các document liên quan)
 * - Cần cân nhắc thêm soft delete (thêm field isDeleted thay vì xóa hẳn)
 */
export async function deleteClinic(req, res) {
  try {
    // === BƯỚC 1: LẤY ID TỪ URL PARAMS ===
    const { id } = req.params;

    // === BƯỚC 2: TÌM VÀ XÓA CLINIC ===
    /**
     * findByIdAndDelete(id) - Tìm và xóa document trong 1 operation
     * 
     * Trả về:
     * - Document đã bị xóa (nếu tìm thấy)
     * - null (nếu không tìm thấy)
     * 
     * Atomic operation: Đảm bảo thread-safe
     */
    const clinic = await Clinic.findByIdAndDelete(id);
    
    // === BƯỚC 3: KIỂM TRA CLINIC CÓ TỒN TẠI KHÔNG ===
    if (!clinic) {
      // Trả về lỗi 404 nếu không tìm thấy
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Clinic not found");
    }

    // === BƯỚC 4: TRẢ VỀ RESPONSE THÀNH CÔNG ===
    return ok(res, { message: "Clinic deleted successfully" });
  } catch (error) {
    // === XỬ LÝ LỖI ===
    console.error("❌ /api/clinics/:id DELETE error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}
