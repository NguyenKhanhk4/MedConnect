import mongoose from "mongoose";
const { Schema, model } = mongoose;

const TokenUsageSchema = new Schema(
  {
    prompt: { type: Number, default: 0, min: 0 },
    completion: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const AiMessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "AiConversation",
      required: true,
    },

    role: { type: String, enum: ["user", "assistant", "tool"], required: true },

    text: { type: String, required: true, trim: true },

    intents: {
      type: [String],
      default: [],
      // ví dụ: ["help","triage","find_doctor","guide_booking"]
    },

    entities: {
      type: Schema.Types.Mixed,
      default: {}, // ví dụ: { symptoms: ["đau đầu","sổ mũi"] }
    },

    suggestedSpecialties: {
      type: [String],
      default: [], // có thể lưu specialtyId hoặc tên chuyên khoa
    },

    usedTools: {
      type: [String],
      default: [], // ví dụ: ["searchFaqs","listDoctors","listSlots"]
    },

    severity: {
      type: String,
      enum: ["normal", "soon", "urgent", null],
      default: null,
    },

    latencyMs: { type: Number, default: null },

    tokenUsage: { type: TokenUsageSchema, default: () => ({}) },

    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  {
    collection: "Ai_messages",
    strict: true,
    versionKey: false,
    timestamps: false, // đã có createdAt
  }
);

// Indexes
AiMessageSchema.index({ conversationId: 1, createdAt: 1 });
AiMessageSchema.index({ intents: 1 });
AiMessageSchema.index({ suggestedSpecialties: 1 });

export default model("AiMessage", AiMessageSchema);
