import Fine from "../models/Fine.js";
import Settings from "../models/Settings.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { calcFine } from "../utils/rules.js";
import { nextNo } from "../utils/nextNo.js";
import { notifyLater } from "../services/notify.js";

const REASON = { late_contribution: "late contribution", missed_meeting: "missed meeting", late_repayment: "late loan repayment", other: "other" };

const RULE_KEY = {
  late_contribution: "lateContribution",
  missed_meeting: "missedMeeting",
  late_repayment: "lateRepayment",
};

// If "amount" is omitted we calculate it from the chairperson's fine rules
export const issueFine = asyncHandler(async (req, res) => {
  const { member, reason, baseAmount, dueDate, note, dateIssued } = req.body;

  let final = Number(req.body.amount) || 0;
  if (!final) {
    const key = RULE_KEY[reason];
    if (!key) throw new HttpError(400, "Amount is required for this reason");
    const rule = (await Settings.get()).fines[key];
    if (rule.mode === "percentage" && !Number(baseAmount))
      throw new HttpError(400, "Enter the overdue amount the percentage applies to");
    final = calcFine({ rule, baseAmount: Number(baseAmount) || 0, dueDate });
    if (final <= 0) throw new HttpError(400, "Still inside the grace period, or no fine is set in Settings");
  }

  const fine = await Fine.create({
    member, reason, amount: final, note, dateIssued,
    fineNo: await nextNo(Fine, "FN"),
    issuedBy: req.user._id,
  });
  notifyLater("fineIssued", member, { amount: Math.round(final).toLocaleString("en-KE"), reason: REASON[reason] || "other" });
  res.status(201).json(fine);
});

export const listFines = asyncHandler(async (req, res) => {
  const filter = {};
  ["status", "member"].forEach((k) => req.query[k] && (filter[k] = req.query[k]));
  res.json(await Fine.find(filter).populate("member", "name memberNo").sort("-dateIssued"));
});

export const updateFine = asyncHandler(async (req, res) => {
  const { status, note } = req.body; // paid | waived | unpaid
  const fine = await Fine.findById(req.params.id);
  if (!fine) throw new HttpError(404, "Fine not found");
  if (status) {
    fine.status = status;
    fine.paidOn = status === "paid" ? new Date() : undefined;
  }
  if (note !== undefined) fine.note = note;
  await fine.save();
  res.json(fine);
});
