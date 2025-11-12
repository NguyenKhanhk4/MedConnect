/* =======================================================
 * Service: Education Level Price Management
 * PURPOSE: Quản lý giá theo trình độ học vấn - CRUD operations
 * ======================================================= */

import EducationLevelPrice from "../models/educationLevelPrice.model.js";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get all education level prices
 * @returns {Promise<Object>} Object với prices theo format { educationLevel: { online: {...}, offline: {...} } }
 */
export async function getAllEducationLevelPrices() {
  try {
    const prices = await EducationLevelPrice.find({ isActive: true })
      .populate("updatedBy", "fullName")
      .sort({ educationLevel: 1, mode: 1 })
      .lean();

    // Format response by education level
    const formattedPrices = {};
    const educationLevels = [
      "Bác sĩ",
      "Thạc sĩ",
      "Tiến sĩ",
      "Phó Giáo Sư",
      "Giáo Sư",
    ];

    educationLevels.forEach((level) => {
      formattedPrices[level] = {
        online: null,
        offline: null,
      };
    });

    prices.forEach((price) => {
      if (formattedPrices[price.educationLevel]) {
        formattedPrices[price.educationLevel][price.mode] = {
          id: price._id.toString(),
          weekdayPrice: price.weekdayPrice,
          weekendPrice: price.weekendPrice,
          currency: price.currency,
          updatedBy: price.updatedBy?.fullName || "System",
          updatedAt: price.updatedAt,
        };
      }
    });

    return {
      success: true,
      prices: formattedPrices,
      allPrices: prices,
    };
  } catch (error) {
    console.error("Error getting education level prices:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get single education level price
 * @param {String} educationLevel - Trình độ học vấn
 * @param {String} mode - "online" hoặc "offline"
 * @returns {Promise<Object|null>} Price object hoặc null
 */
export async function getEducationLevelPrice(educationLevel, mode) {
  try {
    const price = await EducationLevelPrice.findOne({
      educationLevel,
      mode,
      isActive: true,
    })
      .populate("updatedBy", "fullName")
      .lean();

    return price;
  } catch (error) {
    console.error("Error getting education level price:", error);
    return null;
  }
}

/**
 * Create or update education level price
 * @param {Object} priceData - { educationLevel, mode, weekdayPrice, weekendPrice, currency, updatedBy }
 * @returns {Promise<Object>} Created/updated price
 */
export async function upsertEducationLevelPrice(priceData) {
  try {
    const {
      educationLevel,
      mode,
      weekdayPrice,
      weekendPrice,
      currency = "VND",
      updatedBy,
    } = priceData;

    // Validate
    const validLevels = [
      "Bác sĩ",
      "Thạc sĩ",
      "Tiến sĩ",
      "Phó Giáo Sư",
      "Giáo Sư",
    ];
    if (!validLevels.includes(educationLevel)) {
      throw new Error("Trình độ học vấn không hợp lệ");
    }

    if (!["online", "offline"].includes(mode)) {
      throw new Error("Mode phải là 'online' hoặc 'offline'");
    }

    if (weekdayPrice < 0 || weekendPrice < 0) {
      throw new Error("Giá tiền phải lớn hơn hoặc bằng 0");
    }

    // Upsert
    const price = await EducationLevelPrice.findOneAndUpdate(
      { educationLevel, mode },
      {
        educationLevel,
        mode,
        weekdayPrice,
        weekendPrice,
        currency,
        isActive: true,
        updatedBy: updatedBy || null,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return {
      success: true,
      price,
    };
  } catch (error) {
    console.error("Error upserting education level price:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Delete education level price (soft delete)
 * @param {String} priceId - ID của price
 * @returns {Promise<Object>} Result
 */
export async function deleteEducationLevelPrice(priceId) {
  try {
    const price = await EducationLevelPrice.findByIdAndUpdate(
      priceId,
      { isActive: false },
      { new: true }
    );

    if (!price) {
      return {
        success: false,
        error: "Không tìm thấy giá",
      };
    }

    return {
      success: true,
      message: "Đã xóa giá thành công",
    };
  } catch (error) {
    console.error("Error deleting education level price:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Import prices from JSON file
 * @param {String} filePath - Đường dẫn đến file JSON (optional, default: config/educationLevelPrices.json)
 * @returns {Promise<Object>} Import result
 */
export async function importPricesFromFile(filePath = null) {
  try {
    const configPath =
      filePath || join(__dirname, "../config/educationLevelPrices.json");
    const configFile = readFileSync(configPath, "utf-8");
    const config = JSON.parse(configFile);
    const prices = config.prices || [];

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const priceData of prices) {
      try {
        const result = await upsertEducationLevelPrice(priceData);
        if (result.success) {
          // Check if it was created or updated
          const existing = await EducationLevelPrice.findOne({
            educationLevel: priceData.educationLevel,
            mode: priceData.mode,
          }).lean();

          if (
            existing &&
            existing.createdAt?.getTime() === existing.updatedAt?.getTime()
          ) {
            createdCount++;
          } else {
            updatedCount++;
          }
        } else {
          errorCount++;
          errors.push({
            educationLevel: priceData.educationLevel,
            mode: priceData.mode,
            error: result.error,
          });
        }
      } catch (error) {
        errorCount++;
        errors.push({
          educationLevel: priceData.educationLevel,
          mode: priceData.mode,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      created: createdCount,
      updated: updatedCount,
      errors: errorCount,
      errorDetails: errors,
    };
  } catch (error) {
    console.error("Error importing prices from file:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Export prices to JSON file
 * @param {String} filePath - Đường dẫn đến file JSON để export (optional, default: config/educationLevelPrices.json)
 * @returns {Promise<Object>} Export result
 */
export async function exportPricesToFile(filePath = null) {
  try {
    const result = await getAllEducationLevelPrices();
    if (!result.success) {
      return {
        success: false,
        error: "Không thể lấy danh sách giá",
      };
    }

    // Format for export
    const pricesArray = [];
    const educationLevels = [
      "Bác sĩ",
      "Thạc sĩ",
      "Tiến sĩ",
      "Phó Giáo Sư",
      "Giáo Sư",
    ];

    educationLevels.forEach((level) => {
      const onlinePrice = result.prices[level]?.online;
      const offlinePrice = result.prices[level]?.offline;

      if (onlinePrice) {
        pricesArray.push({
          educationLevel: level,
          mode: "online",
          weekdayPrice: onlinePrice.weekdayPrice,
          weekendPrice: onlinePrice.weekendPrice,
          currency: onlinePrice.currency || "VND",
          isActive: true,
        });
      }

      if (offlinePrice) {
        pricesArray.push({
          educationLevel: level,
          mode: "offline",
          weekdayPrice: offlinePrice.weekdayPrice,
          weekendPrice: offlinePrice.weekendPrice,
          currency: offlinePrice.currency || "VND",
          isActive: true,
        });
      }
    });

    const exportData = {
      prices: pricesArray,
      exportedAt: new Date().toISOString(),
    };

    const configPath =
      filePath || join(__dirname, "../config/educationLevelPrices.json");
    writeFileSync(configPath, JSON.stringify(exportData, null, 2), "utf-8");

    return {
      success: true,
      filePath: configPath,
      count: pricesArray.length,
      message: `Đã export ${pricesArray.length} giá vào file ${configPath}`,
    };
  } catch (error) {
    console.error("Error exporting prices to file:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Initialize prices from config file (if not exist in database)
 * @returns {Promise<Object>} Init result
 */
export async function initializePricesFromConfig() {
  try {
    const result = await importPricesFromFile();
    return result;
  } catch (error) {
    console.error("Error initializing prices from config:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
