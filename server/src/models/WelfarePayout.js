import mongoose from "mongoose";

// A welfare claim: recorded, then paid out of the fund (or rejected)
const schema = new mongoose.Schema(
  {
    claimNo: { type: String, unique: true, sparse: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // claimant
    beneficiary: String,
    relationship: String,
    category: { type: String, default: "other" },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["pending", "paid", "rejected"], default: "pending" },
    date: { type: Date, default: Date.now },
    paidOn: Date,
    reference: String, // hospital / death certificate reference
    paymentRef: String, // M-Pesa or bank reference for the payout
    note: String,
    rejectionReason: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("WelfarePayout", schema);
