import mongoose from "mongoose";

const contributionSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: mongoose.Schema.Types.ObjectId, ref: "ContributionType", required: true },
    amount: { type: Number, required: true, min: 1 },
    year: { type: Number, required: true },
    month: { type: Number, min: 1, max: 12 },  // 1-12, drives the 12-month matrix
    paidOn: { type: Date, default: Date.now },
    reference: { type: String, trim: true },   // e.g. M-Pesa code
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

contributionSchema.index({ member: 1, type: 1, year: 1, month: 1 });

export default mongoose.model("Contribution", contributionSchema);