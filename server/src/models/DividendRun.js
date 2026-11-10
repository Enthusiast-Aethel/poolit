import mongoose from "mongoose";

const allocationSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  savings: Number,
  share: Number,      // fraction of total savings
  amount: Number,     // dividend in KES
  paid: { type: Boolean, default: false },
  paidOn: Date,
});

const schema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    distributableSurplus: { type: Number, required: true },
    totalSavings: Number,
    unallocated: { type: Number, default: 0 }, // rounding remainder
    allocations: [allocationSchema],
    status: { type: String, enum: ["draft", "finalized"], default: "draft" },
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    finalizedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("DividendRun", schema);