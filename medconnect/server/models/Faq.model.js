import mongoose from "mongoose";
const { Schema, model } = mongoose;

const FaqSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] }, // ví dụ: ["booking","online","payment"]
    updatedAt: { type: Date, required: true, default: () => new Date() },

    // mở rộng: gán anchor/links UI
    links: {
      type: [
        {
          label: { type: String, required: true },
          href: { type: String, required: true },
        },
      ],
      default: [],
      _id: false,
    },
  },
  {
    collection: "Faqs",
    strict: true,
    versionKey: false,
    timestamps: false,
  }
);

// Indexes
FaqSchema.index({ tags: 1 });
FaqSchema.index({ question: "text", answer: "text", slug: "text" });

export default model("Faq", FaqSchema);
