import mongoose from "mongoose";

const contributionTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // "Welfare"
    code: { type: String, required: true, unique: true, lowercase: true }, // "welfare"
    amount: { type: Number, default: 0 },          // default/expected amount
    frequency: {
      type: String,
      enum: ["monthly", "one_time", "rotational", "ad_hoc"],
      default: "ad_hoc",
    },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },   // built-in types can't be deleted
  },
  { timestamps: true }
);

export default mongoose.model("ContributionType", contributionTypeSchema);