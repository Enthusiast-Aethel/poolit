import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // beneficiary
    reason: { type: String, enum: ["bereavement", "illness", "other"], required: true },
    amount: { type: Number, required: true, min: 1 },
    date: { type: Date, default: Date.now },
    note: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("WelfarePayout", schema);