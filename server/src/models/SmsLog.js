import mongoose from "mongoose";

// One row per text message the system tried to send
const schema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    message: { type: String, required: true },
    kind: { type: String, default: "broadcast" }, // template key, or "broadcast" / "test"
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["queued", "sent", "delivered", "failed", "not_sent"], default: "queued" },
    segments: { type: Number, default: 1 },
    providerId: { type: String, index: true },
    cost: String, // as reported by the provider, e.g. "KES 0.8000"
    error: String,
    dedupeKey: { type: String, index: true, sparse: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("SmsLog", schema);
