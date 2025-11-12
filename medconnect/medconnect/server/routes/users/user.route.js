import express from "express";
import User from "../../models/user.model.js";
const userRouter = express.Router();

// ✅ GET all users
userRouter.get("/", async (req, res) => {
  try {
    console.log("Fetching all users");
    const users = await User.find();
    return res.status(200).json(users);
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

export default userRouter;
