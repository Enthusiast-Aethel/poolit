import Contribution from "../models/Contribution.js";
import ContributionType from "../models/ContributionType.js";
import WelfarePayout from "../models/WelfarePayout.js";

export async function fundBalance() {
  const type = await ContributionType.findOne({ code: "welfare" });
  const [inn, out] = await Promise.all([
    type
      ? Contribution.aggregate([{ $match: { type: type._id } }, { $group: { _id: null, t: { $sum: "$amount" } } }])
      : [],
    WelfarePayout.aggregate([{ $group: { _id: null, t: { $sum: "$amount" } } }]),
  ]);
  const totalIn = inn[0]?.t || 0;
  const totalOut = out[0]?.t || 0;
  return { totalIn, totalOut, balance: totalIn - totalOut };
}