import { Router } from "express";
import Task from "../models/Task.js";
import { protect, allowRoles } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", async (_req, res, next) => {
  try {
    res.json(await Task.find().populate("assignee", "name").populate("createdBy", "name").sort({ createdAt: -1 }));
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    if (!req.body.title?.trim()) return res.status(400).json({ message: "Task title is required" });
    const task = await Task.create({
      title: req.body.title, description: req.body.description || "",
      status: req.body.status || "Todo", priority: req.body.priority || "Medium",
      assignee: req.body.assignee || null, dueDate: req.body.dueDate || null,
      createdBy: req.user._id
    });
    res.status(201).json(await task.populate(["assignee", "createdBy"]));
  } catch (error) { next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const allowed = ["title", "description", "status", "priority", "assignee", "dueDate"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate("assignee", "name").populate("createdBy", "name");
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (error) { next(error); }
});

router.delete("/:id", allowRoles("admin", "manager"), async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (error) { next(error); }
});

export default router;
