import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["present", "absent", "apology"], default: "absent" },
  fined: { type: Boolean, default: false },
});

const agendaItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  discussion: String,
  resolution: String,
  status: { type: String, enum: ["open", "closed", "action_pending"], default: "open" },
});

const actionItemSchema = new mongoose.Schema({
  task: { type: String, required: true },
  assignee: String,
  dueDate: Date,
  status: { type: String, enum: ["open", "in_progress", "done"], default: "open" },
  notes: String,
});

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: String, // "09:30"
    location: String,
    presiding: String,
    agenda: String,
    minutes: String,
    attendance: [attendanceSchema],
    agendaItems: [agendaItemSchema],
    actionItems: [actionItemSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);
