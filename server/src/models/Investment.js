import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["land", "shares", "sacco", "money_market", "business", "other"], default: "other" },
    amountInvested: { type: Number, required: true, min: 1 },
    dateInvested: { type: Date, default: Date.now },
    currentValue: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "sold"], default: "active" },
    returns: [{ date: { type: Date, default: Date.now }, amount: Number, note: String }],
    note: String,
  },
  { timestamps: true }
);

export default mongoose.model("Investment", schema);