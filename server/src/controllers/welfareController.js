import WelfarePayout from "../models/WelfarePayout.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { fundBalance } from "../utils/welfare.js";

export const welfareSummary = asyncHandler(async (req, res) => {
  const payouts = await WelfarePayout.find().populate("member", "name memberNo").sort("-date");
  res.json({ ...(await fundBalance()), payouts });
});

export const createPayout = asyncHandler(async (req, res) => {
  const { member, reason, amount, date, note } = req.body;
  const { balance } = await fundBalance();
  if (amount > balance)
    throw new HttpError(400, `Welfare fund only has KES ${balance} available`);

  const p = await WelfarePayout.create({ member, reason, amount, date, note, approvedBy: req.user._id });
  res.status(201).json(p);
});