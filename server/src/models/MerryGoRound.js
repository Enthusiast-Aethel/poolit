import mongoose from "mongoose";

// immutable = Mongoose refuses to change these after creation, so the draw order stays locked
const roundSchema = new mongoose.Schema({
  position: { type: Number, required: true, immutable: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  payout: { type: Number, required: true, immutable: true },
  status: { type: String, enum: ["pending", "paid"], default: "pending" },
  paidOn: Date,
});

const merrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    amountPerMember: { type: Number, required: true, immutable: true },
    rounds: [roundSchema],
    status: { type: String, enum: ["active", "completed"], default: "active" },
    drawnBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", immutable: true },
  },
  { timestamps: true }
);

export default mongoose.model("MerryGoRound", merrySchema);