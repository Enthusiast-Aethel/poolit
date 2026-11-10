import mongoose from "mongoose";

const installmentSchema = new mongoose.Schema({
  no: Number,
  dueDate: Date,
  principal: Number,
  interest: Number,
  total: Number,
  paid: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "partial", "paid", "overdue"], default: "pending" },
});

const guarantorSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amountGuaranteed: Number,
  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
});

const loanSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    principal: { type: Number, required: true, min: 1 },
    interestRate: { type: Number, required: true },          // % p.a., copied from Settings at approval
    interestMethod: { type: String, enum: ["flat", "reducing"], required: true },
    termMonths: { type: Number, required: true, min: 1 },
    purpose: String,

    guarantors: [guarantorSchema],
    status: {
      type: String,
      enum: ["pending", "approved", "active", "cleared", "rejected"],
      default: "pending",
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    rejectionReason: String,
    disbursedOn: Date,

    schedule: [installmentSchema],
    totalPayable: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

loanSchema.virtual("balance").get(function () {
  return Math.round((this.totalPayable - this.totalPaid) * 100) / 100;
});

export default mongoose.model("Loan", loanSchema);