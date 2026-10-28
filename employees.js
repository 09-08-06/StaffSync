import { Router } from "express";
import User from "../models/User.js";
import { protect, allowRoles } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    if (["admin", "manager"].includes(req.user.role)) {
      const users = await User.find().select("-password").sort({ name: 1 });
      return res.json(users);
    }
    res.json([{
      _id: req.user._id, name: req.user.name, email: req.user.email,
      role: req.user.role, department: req.user.department,
      designation: req.user.designation, phone: req.user.phone
    }]);
  } catch (error) { next(error); }
});

router.patch("/:id", allowRoles("admin"), async (req, res, next) => {
  try {
    const allowed = ["name", "department", "designation", "phone", "role"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ message: "Employee not found" });
    res.json(user);
  } catch (error) { next(error); }
});

export default router;
