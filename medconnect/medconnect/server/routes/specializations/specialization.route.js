import express from "express";
import Specialization from "../../models/specialization.model.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    console.log("GET /api/specializations - fetching specializations");
    const list = await Specialization.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    console.error("❌ Error fetching specializations:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching specializations",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("GET /api/specializations/:id - fetching specialization:", id);

    const specialization = await Specialization.findById(id);

    if (!specialization) {
      return res.status(404).json({
        success: false,
        message: "Specialization not found",
      });
    }

    return res.status(200).json({ success: true, data: specialization });
  } catch (err) {
    console.error("❌ Error fetching specialization:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching specialization",
    });
  }
});

export default router;
