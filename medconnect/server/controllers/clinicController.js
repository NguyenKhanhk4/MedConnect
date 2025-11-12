import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";

/**
 * Get all clinics with pagination and search
 */
export async function getAllClinics(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

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
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

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

    // Format response - only include fields that exist in the model
    const formattedClinics = clinics.map((clinic) => ({
      id: clinic._id,
      _id: clinic._id,
      name: clinic.name || "",
      address: clinic.address || "",
      phone: clinic.phone || "",
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      coordinates: clinic.geo?.coordinates,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
    }));

    return ok(res, {
      clinics: formattedClinics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ /api/clinics error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Get clinic by ID
 */
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

/**
 * Create new clinic
 */
export async function createClinic(req, res) {
  try {
    const {
      name,
      type,
      location,
      address,
      phone,
      latitude,
      longitude,
      specialties,
      doctorCount,
      rating,
      reviewCount,
      description,
      image,
    } = req.body;

    // Build geo coordinates if provided
    let geo = null;
    if (latitude && longitude) {
      geo = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    const clinic = new Clinic({
      name,
      type: type || "hospital",
      location,
      address,
      phone,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      geo,
      specialties: specialties || [],
      doctorCount: doctorCount || 0,
      rating: rating || 4.0,
      reviewCount: reviewCount || 0,
      description: description || "",
      image: image || "",
    });

    await clinic.save();

    const formattedClinic = {
      id: clinic._id,
      name: clinic.name,
      type: clinic.type,
      location: clinic.location,
      address: clinic.address,
      phone: clinic.phone,
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      coordinates: clinic.geo?.coordinates,
      specialties: clinic.specialties,
      doctorCount: clinic.doctorCount,
      rating: clinic.rating,
      reviewCount: clinic.reviewCount,
      description: clinic.description,
      image: clinic.image,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
    };

    return ok(res, { clinic: formattedClinic }, 201);
  } catch (error) {
    console.error("❌ /api/clinics POST error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Update clinic
 */
export async function updateClinic(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      location,
      address,
      phone,
      latitude,
      longitude,
      specialties,
      doctorCount,
      rating,
      reviewCount,
      description,
      image,
    } = req.body;

    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Clinic not found");
    }

    // Update fields
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

    // Update geo coordinates if provided
    if (latitude && longitude) {
      clinic.geo = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    await clinic.save();

    const formattedClinic = {
      id: clinic._id,
      name: clinic.name,
      type: clinic.type,
      location: clinic.location,
      address: clinic.address,
      phone: clinic.phone,
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      coordinates: clinic.geo?.coordinates,
      specialties: clinic.specialties,
      doctorCount: clinic.doctorCount,
      rating: clinic.rating,
      reviewCount: clinic.reviewCount,
      description: clinic.description,
      image: clinic.image,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
    };

    return ok(res, { clinic: formattedClinic });
  } catch (error) {
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
 * Get unique locations from clinics (extracted from clinic names)
 * This endpoint extracts location names from clinic names like:
 * "MedConnect Clinic Quận 1" -> "Quận 1"
 * "MedConnect Clinic Hải Châu" -> "Hải Châu"
 */
export async function getUniqueLocations(req, res) {
  try {
    // Get all clinics
    const clinics = await Clinic.find({}).select("name address").lean();

    // Extract locations from clinic names
    const locationSet = new Set();

    clinics.forEach((clinic) => {
      if (clinic.name) {
        // Extract location from clinic name
        // Pattern: "MedConnect Clinic [Location]" -> extract "[Location]"
        const match = clinic.name.match(/MedConnect Clinic (.+)/i);
        if (match && match[1]) {
          locationSet.add(match[1].trim());
        }

        // Also check for "Quận X" patterns in name
        const quanMatch = clinic.name.match(/Quận\s*(\d+)/i);
        if (quanMatch) {
          locationSet.add(`Quận ${quanMatch[1]}`);
        }

        // Check for common district names
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

      // Also check address field
      if (clinic.address) {
        const quanMatch = clinic.address.match(/Quận\s*(\d+)/i);
        if (quanMatch) {
          locationSet.add(`Quận ${quanMatch[1]}`);
        }

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

    // Convert Set to sorted array and filter out unwanted locations
    const locations = Array.from(locationSet)
      .filter((loc) => loc.toLowerCase() !== "hai bà trưng")
      .filter((loc) => loc.toLowerCase() !== "hai ba trung")
      .sort();

    return ok(res, { locations });
  } catch (error) {
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
 * Delete clinic
 */
export async function deleteClinic(req, res) {
  try {
    const { id } = req.params;

    const clinic = await Clinic.findByIdAndDelete(id);
    if (!clinic) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Clinic not found");
    }

    return ok(res, { message: "Clinic deleted successfully" });
  } catch (error) {
    console.error("❌ /api/clinics/:id DELETE error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}
