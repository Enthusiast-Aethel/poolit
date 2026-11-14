import WelfarePayout from "../models/WelfarePayout.js";
import Contribution from "../models/Contribution.js";
import ContributionType from "../models/ContributionType.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { fundBalance } from "../utils/welfare.js";
import { buildLedger } from "../utils/welfareLedger.js";
import { nextNo } from "../utils/nextNo.js";
import { notifyLater } from "../services/notify.js";

const n = (v) => Math.round(v).toLocaleString("en-KE");

const sum = (list) => list.reduce((s, x) => s + x.amount, 0);

async function assertFunds(amount) {
  const { balance } = await fundBalance();
  if (amount > balance)
    throw new HttpError(400, `The welfare fund only has KES ${Math.round(balance).toLocaleString("en-KE")} available`);
}
function markPaid(claim, user, paymentRef, paidOn) {
  claim.status = "paid";
  claim.paidOn = paidOn ? new Date(paidOn) : new Date();
  claim.paymentRef = paymentRef ? paymentRef.trim().toUpperCase() : undefined;
  claim.approvedBy = user._id;
}

export const welfareSummary = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const [settings, type, claims, fund] = await Promise.all([
    Settings.get(),
    ContributionType.findOne({ code: "welfare" }),
    WelfarePayout.find().populate("member", "name memberNo").sort("-date"),
    fundBalance(),
  ]);
  const levies = type ? await Contribution.find({ type: type._id }).select("amount paidOn").lean() : [];

  const paid = claims.filter((c) => c.status === "paid");
  const pending = claims.filter((c) => c.status === "pending");
  const inYear = (d) => d && new Date(d).getFullYear() === year;
  const paidYear = paid.filter((c) => inYear(c.paidOn || c.date));

  const now = new Date();
  const monthlyInflow = sum(
    levies.filter((l) => new Date(l.paidOn).getFullYear() === now.getFullYear() && new Date(l.paidOn).getMonth() === now.getMonth())
  );

  const byCategory = {};
  for (const c of paidYear) byCategory[c.category] = (byCategory[c.category] || 0) + c.amount;

  res.json({
    ...fund,
    year,
    floor: settings.welfare.reserveFloor,
    categories: settings.welfare.categories,
    pending: { count: pending.length, amount: sum(pending) },
    paidYtd: { count: paidYear.length, amount: sum(paidYear) },
    monthlyInflow,
    byCategory,
    ledger: buildLedger({ levies, payouts: paid.map((c) => ({ amount: c.amount, paidOn: c.paidOn, date: c.date })), year }),
    claims,
  });
});

// Record a claim. It waits for review unless payNow is set.
export const createClaim = asyncHandler(async (req, res) => {
  const { member, beneficiary, relationship, category = "other", reference, note, payNow, paymentRef, date, paidOn } = req.body;
  const amount = Number(req.body.amount);
  if (!(amount > 0)) throw new HttpError(400, "Enter the amount");
  if (!(await User.findById(member))) throw new HttpError(404, "Member not found");

  const settings = await Settings.get();
  const cat = settings.welfare.categories.find((c) => c.key === category);
  if (!cat) throw new HttpError(400, "Choose a valid category");
  if (cat.cap > 0 && amount > cat.cap)
    throw new HttpError(400, `The limit for ${cat.label} is KES ${cat.cap.toLocaleString("en-KE")}`);

  const claim = new WelfarePayout({
    claimNo: await nextNo(WelfarePayout, "CLM"),
    member, beneficiary, relationship, category, amount, reference, note, date,
  });
  if (payNow) {
    await assertFunds(amount);
    markPaid(claim, req.user, paymentRef, paidOn);
  }
  await claim.save();
  if (claim.status === "paid") notifyLater("welfarePaid", claim.member, { claimNo: claim.claimNo || "", amount: n(claim.amount) });
  res.status(201).json(claim);
});

export const payClaim = asyncHandler(async (req, res) => {
  const claim = await WelfarePayout.findById(req.params.id);
  if (!claim || claim.status !== "pending") throw new HttpError(400, "Only claims under review can be paid");
  await assertFunds(claim.amount);
  markPaid(claim, req.user, req.body.paymentRef, req.body.paidOn);
  await claim.save();
  notifyLater("welfarePaid", claim.member, { claimNo: claim.claimNo || "", amount: n(claim.amount) });
  res.json(claim);
});

export const rejectClaim = asyncHandler(async (req, res) => {
  const claim = await WelfarePayout.findById(req.params.id);
  if (!claim || claim.status !== "pending") throw new HttpError(400, "Only claims under review can be rejected");
  claim.status = "rejected";
  claim.rejectionReason = req.body.reason;
  await claim.save();
  notifyLater("welfareRejected", claim.member, { claimNo: claim.claimNo || "", reason: req.body.reason ? `Reason: ${req.body.reason}` : "" });
  res.json(claim);
});
