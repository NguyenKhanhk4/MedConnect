import mongoose from "mongoose";
const { Schema, model } = mongoose;

const TokenUsageSchema = new Schema(
  {
    prompt: { type: Number, default: 0, min: 0 },
    completion: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const AiConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", default: null },

    startedAt: { type: Date, required: true, default: () => new Date() },
    endedAt: { type: Date, default: null },

    lastIntent: {
      type: String,
      enum: ["help", "triage", "find_doctor", "guide_booking", "unknown"],
      default: "unknown",
    },

    model: { type: String, required: true, default: "gemini-2.0-flash" }, // hoặc "gpt-4.1-mini"
    locale: { type: String, required: true, default: "vi-VN" },
    channel: { type: String, required: true, default: "web" }, // "web" | "app" | "other"

    tokenUsage: { type: TokenUsageSchema, default: () => ({}) },

    metadata: {
      type: Schema.Types.Mixed, // ví dụ: { appVersion, device, ip }
      default: {},
    },
  },
  {
    collection: "Ai_conversations",
    strict: true,
    versionKey: false,
    timestamps: false, // đã có startedAt/endedAt
  }
);

// Indexes
AiConversationSchema.index({ userId: 1, startedAt: -1 });
AiConversationSchema.index({ patientId: 1, startedAt: -1 });
AiConversationSchema.index({ lastIntent: 1 });

export default model("AiConversation", AiConversationSchema);
