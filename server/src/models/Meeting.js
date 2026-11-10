import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["present", "absent", "apology"], default: "absent" },
  fined: { type: Boolean, default: false },
});

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    location: String,
    agenda: String,
    minutes: String,
    attendance: [attendanceSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);