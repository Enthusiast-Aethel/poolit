import Fine from "../models/Fine.js";
import Settings from "../models/Settings.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { calcFine } from "../utils/rules.js";

const RULE_KEY = {
  late_contribution: "lateContribution",
  missed_meeting: "missedMeeting",
  late_repayment: "lateRepayment",
};

// If "amount" is omitted we calculate it from the chairperson's fine rules
export const issueFine = asyncHandler(async (req, res) => {
  const { member, reason, amount, baseAmount, dueDate, note } = req.body;

  let final = amount;
  if (!final) {
    const key = RULE_KEY[reason];
    if (!key) throw new HttpError(400, "Amount is required for this reason");
    const settings = await Settings.get();
    final = calcFine({ rule: settings.fines[key], baseAmount, dueDate });
    if (final <= 0) throw new HttpError(400, "Still inside the grace period, no fine due");
  }

  const fine = await Fine.create({ member, reason, amount: final, note, issuedBy: req.user._id });
  res.status(201).json(fine);
});

export const listFines = asyncHandler(async (req, res) => {
  const filter = {};
  ["status", "member"].forEach((k) => req.query[k] && (filter[k] = req.query[k]));
  res.json(await Fine.find(filter).populate("member", "name memberNo").sort("-dateIssued"));
});

export const updateFine = asyncHandler(async (req, res) => {
  const { status } = req.body; // paid | waived | unpaid
  const fine = await Fine.findByIdAndUpdate(
    req.params.id,
    { status, paidOn: status === "paid" ? new Date() : undefined },
    { new: true, runValidators: true }
  );
  if (!fine) throw new HttpError(404, "Fine not found");
  res.json(fine);
});