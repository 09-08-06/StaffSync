import { Router } from "express";
import Leave from "../models/Leave.js";
import { protect, allowRoles } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const query = ["admin", "manager"].includes(req.user.role) ? {} : { user: req.user._id };
    res.json(await Leave.find(query).populate("user", "name email department").sort({ createdAt: -1 }));
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!startDate || !endDate || !reason?.trim()) return res.status(400).json({ message: "Dates and reason are required" });
    if (new Date(endDate) < new Date(startDate)) return res.status(400).json({ message: "End date must be on or after start date" });
    const leave = await Leave.create({ user: req.user._id, leaveType, startDate, endDate, reason });
    res.status(201).json(await leave.populate("user", "name email department"));
  } catch (error) { next(error); }
});

router.patch("/:id/status", allowRoles("admin", "manager"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected"].includes(status)) return res.status(400).json({ message: "Status must be Approved or Rejected" });
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true })
      .populate("user", "name email department");
    if (!leave) return res.status(404).json({ message: "Leave request not found" });
    res.json(leave);
  } catch (error) { next(error); }
});

export default router;
