import Specialization from "../models/specialization.model.js";
import Doctor from "../models/doctor.model.js";

export const getAllSpecializations = async (req, res) => {
  try {
    const specializations = await Specialization.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Fetch doctor count for each specialization
    const specializationsWithCount = await Promise.all(
      specializations.map(async (spec) => {
        const doctorCount = await Doctor.countDocuments({
          specializationIds: { $in: [spec._id] },
          isActive: true,
        });

        return {
          ...spec,
          doctorCount,
        };
      })
    );

    return res.json({ success: true, data: specializationsWithCount });
  } catch (err) {
    console.error("getAllSpecializations error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
