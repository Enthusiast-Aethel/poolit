import mongoose from "mongoose";
import Contribution from "../models/Contribution.js";
import ContributionType from "../models/ContributionType.js";

// "Savings" = total of monthly contributions
export async function getSavings(memberId) {
  const type = await ContributionType.findOne({ code: "monthly" });
  if (!type) return 0;
  const r = await Contribution.aggregate([
    { $match: { member: new mongoose.Types.ObjectId(memberId), type: type._id } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return r[0]?.total || 0;
}