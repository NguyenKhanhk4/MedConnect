/* =======================================================
 * COLLECTION: ServicePrices
 *  Bảng giá dịch vụ - Quản lý bởi Manager
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ServicePriceSchema = new Schema(
  {
    serviceName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Price must be an integer",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, versionKey: false, collection: "ServicePrices" }
);

// Index
ServicePriceSchema.index({ isActive: 1 });

export default model("ServicePrice", ServicePriceSchema);
