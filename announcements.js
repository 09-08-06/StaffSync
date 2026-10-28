import { Router } from "express";
import Announcement from "../models/Announcement.js";
import { protect, allowRoles } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", async (_req, res, next) => {
  try {
    res.json(await Announcement.find().populate("author", "name role").sort({ createdAt: -1 }));
  } catch (error) { next(error); }
});

router.post("/", allowRoles("admin", "manager"), async (req, res, next) => {
  try {
    const { title, message } = req.body;
    if (!title?.trim() || !message?.trim()) return res.status(400).json({ message: "Title and message are required" });
    const announcement = await Announcement.create({ title, message, author: req.user._id });
    res.status(201).json(await announcement.populate("author", "name role"));
  } catch (error) { next(error); }
});

router.delete("/:id", allowRoles("admin"), async (req, res, next) => {
  try {
    const result = await Announcement.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: "Announcement not found" });
    res.json({ message: "Announcement deleted" });
  } catch (error) { next(error); }
});

export default router;
