import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dateKey: { type: String, required: true },
  checkIn: { type: Date, default: null },
  checkOut: { type: Date, default: null }
}, { timestamps: true });

attendanceSchema.index({ user: 1, dateKey: 1 }, { unique: true });
export default mongoose.model("Attendance", attendanceSchema);
