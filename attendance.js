import { Router } from "express";
import Attendance from "../models/Attendance.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

router.get("/", async (req, res, next) => {
  try {
    const query = ["admin", "manager"].includes(req.user.role) ? {} : { user: req.user._id };
    const rows = await Attendance.find(query).populate("user", "name email department").sort({ dateKey: -1 }).limit(100);
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/check-in", async (req, res, next) => {
  try {
    const dateKey = todayKey();
    let row = await Attendance.findOne({ user: req.user._id, dateKey });
    if (row?.checkIn) return res.status(409).json({ message: "You have already checked in today" });
    if (!row) row = new Attendance({ user: req.user._id, dateKey });
    row.checkIn = new Date();
    await row.save();
    res.status(201).json(row);
  } catch (error) { next(error); }
});

router.post("/check-out", async (req, res, next) => {
  try {
    const row = await Attendance.findOne({ user: req.user._id, dateKey: todayKey() });
    if (!row?.checkIn) return res.status(400).json({ message: "Please check in first" });
    if (row.checkOut) return res.status(409).json({ message: "You have already checked out today" });
    row.checkOut = new Date();
    await row.save();
    res.json(row);
  } catch (error) { next(error); }
});

export default router;
