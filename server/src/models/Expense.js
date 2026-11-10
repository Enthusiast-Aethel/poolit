import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true }, // admin, stationery, transport...
    description: String,
    amount: { type: Number, required: true, min: 1 },
    date: { type: Date, default: Date.now },
    reference: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Expense", schema);