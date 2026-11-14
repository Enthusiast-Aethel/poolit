import mongoose from "mongoose";

const fineSchema = new mongoose.Schema(
  {
    fineNo: { type: String, unique: true, sparse: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: {
      type: String,
      enum: ["late_contribution", "missed_meeting", "late_repayment", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 1 },
    dateIssued: { type: Date, default: Date.now },
    status: { type: String, enum: ["unpaid", "paid", "waived"], default: "unpaid" },
    paidOn: Date,
    note: String,
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Fine", fineSchema);
