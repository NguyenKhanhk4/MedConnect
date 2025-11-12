/**
 * COLLECTION: doctor_schedule_rules
 * PURPOSE: Generate doctor_time_slots cho N ngày tới (slot 20’, trung tính).
 */
import mongoose from "mongoose";
const { Schema, model } = mongoose;

const DayBlockSchema = new Schema(
  {
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]\d|2[0-3]):([0-5]\d)$/, // "HH:mm"
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]\d|2[0-3]):([0-5]\d)$/,
    },
  },
  { _id: false }
);

const DoctorScheduleRuleSchema = new Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    // 0=CN, 1=Thứ 2, ..., 6=Thứ 7
    weekday: { type: Number, min: 0, max: 6, required: true, index: true },

    // Nhiều block trong 1 ngày (ví dụ: 07:00–11:40 và 13:00–17:00)
    blocks: { type: [DayBlockSchema], required: true, default: [] },

    // Slot length (mặc định 20’)
    slotBlockMinutes: { type: Number, default: 20, min: 5 },

    // (tuỳ chọn) thời lượng khám thực tế để hiển thị/tính phí
    consultMinutes: { type: Number, default: 20, min: 5 },

    effectiveFrom: { type: Date, required: true, default: () => new Date() },
    effectiveTo: { type: Date },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false, collection: "Doctor_schedule_rules" }
);

// Validate
DoctorScheduleRuleSchema.pre("validate", function (next) {
  if (!this.blocks || this.blocks.length === 0) {
    this.invalidate("blocks", "At least one block is required");
  } else {
    for (const b of this.blocks) {
      if (b.startTime >= b.endTime) {
        this.invalidate(
          "blocks",
          "block.endTime must be after block.startTime"
        );
        break;
      }
    }
  }
  if (this.effectiveTo && this.effectiveFrom > this.effectiveTo) {
    this.invalidate("effectiveTo", "effectiveTo must be after effectiveFrom");
  }
  if (this.consultMinutes > this.slotBlockMinutes) {
    this.invalidate(
      "consultMinutes",
      "consultMinutes must be <= slotBlockMinutes"
    );
  }
  next();
});

DoctorScheduleRuleSchema.index({ doctorId: 1, weekday: 1, isActive: 1 });

// Helper: sinh slot từ blocks
DoctorScheduleRuleSchema.statics.generateSlotsForDate = function ({
  date, // JS Date (00:00)
  blocks,
  slotBlockMinutes,
}) {
  const toMin = (s) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  const toDateTime = (d, minutes) => {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  const out = [];
  for (const blk of blocks) {
    const start = toMin(blk.startTime);
    const end = toMin(blk.endTime);
    for (let t = start; t + slotBlockMinutes <= end; t += slotBlockMinutes) {
      out.push({
        startAt: toDateTime(date, t),
        endAt: toDateTime(date, t + slotBlockMinutes),
      });
    }
  }
  return out;
};

export default model("DoctorScheduleRule", DoctorScheduleRuleSchema);
