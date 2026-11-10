import Loan from "../models/Loan.js";
import Repayment from "../models/Repayment.js";
import User from "../models/User.js";
import Settings from "../models/Settings.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { getSavings } from "../utils/savings.js";
import { loanRequirements } from "../utils/rules.js";
import { buildSchedule } from "../utils/loanSchedule.js";

const round = (n) => Math.round(n * 100) / 100;

// MEMBER: apply for a loan
export const applyLoan = asyncHandler(async (req, res) => {
  const { amount, termMonths, interestMethod, purpose, guarantors = [] } = req.body;

  if (!["flat", "reducing"].includes(interestMethod))
    throw new HttpError(400, "Interest method must be flat or reducing");

  const settings = await Settings.get();
  const savings = await getSavings(req.user._id);
  const reqs = loanRequirements({ amount, savings, settings });
  if (!reqs.allowed) throw new HttpError(400, reqs.reason);

  if (termMonths < 1 || termMonths > reqs.maxTermMonths)
    throw new HttpError(400, `Maximum repayment period for this loan is ${reqs.maxTermMonths} months`);

  const ids = [...new Set(guarantors.map(String))];
  if (ids.includes(String(req.user._id))) throw new HttpError(400, "You cannot guarantee your own loan");
  if (ids.length < reqs.guarantorsRequired)
    throw new HttpError(400, `This loan needs ${reqs.guarantorsRequired} guarantors`);

  const valid = await User.countDocuments({ _id: { $in: ids }, isActive: true });
  if (valid !== ids.length) throw new HttpError(400, "One or more guarantors are not active members");

  const loan = await Loan.create({
    member: req.user._id,
    principal: amount,
    interestRate: settings.interestRate,
    interestMethod,
    termMonths,
    purpose,
    guarantors: ids.map((member) => ({ member })),
  });
  res.status(201).json(loan);
});

// MEMBER: accept or decline a guarantee request
export const respondGuarantee = asyncHandler(async (req, res) => {
  const { status } = req.body; // accepted | declined
  if (!["accepted", "declined"].includes(status)) throw new HttpError(400, "Invalid response");

  const loan = await Loan.findById(req.params.id);
  if (!loan || loan.status !== "pending") throw new HttpError(404, "Loan not open for guarantees");

  const g = loan.guarantors.find((x) => String(x.member) === String(req.user._id));
  if (!g) throw new HttpError(403, "You are not a guarantor on this loan");

  g.status = status;
  await loan.save();
  res.json(loan);
});

// ADMIN: approve / reject / disburse
export const approveLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id);
  if (!loan || loan.status !== "pending") throw new HttpError(400, "Only pending loans can be approved");

  if (loan.guarantors.some((g) => g.status !== "accepted"))
    throw new HttpError(400, "All guarantors must accept first");

  loan.status = "approved";
  loan.approvedBy = req.user._id;
  loan.approvedAt = new Date();
  await loan.save();
  res.json(loan);
});

export const rejectLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id);
  if (!loan || !["pending", "approved"].includes(loan.status))
    throw new HttpError(400, "This loan cannot be rejected");
  loan.status = "rejected";
  loan.rejectionReason = req.body.reason;
  await loan.save();
  res.json(loan);
});

export const disburseLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id);
  if (!loan || loan.status !== "approved") throw new HttpError(400, "Only approved loans can be disbursed");

  const startDate = req.body.disbursedOn ? new Date(req.body.disbursedOn) : new Date();
  loan.schedule = buildSchedule({
    principal: loan.principal,
    annualRate: loan.interestRate,
    months: loan.termMonths,
    method: loan.interestMethod,
    startDate,
  });
  loan.totalPayable = round(loan.schedule.reduce((s, i) => s + i.total, 0));
  loan.disbursedOn = startDate;
  loan.status = "active";
  await loan.save();
  res.json(loan);
});

// ADMIN: record a repayment, applied to the oldest unpaid instalments first
export const recordRepayment = asyncHandler(async (req, res) => {
  const { amount, paidOn, reference } = req.body;
  const loan = await Loan.findById(req.params.id);
  if (!loan || loan.status !== "active") throw new HttpError(400, "Loan is not active");

  const balance = round(loan.totalPayable - loan.totalPaid);
  if (!(amount > 0) || amount > balance)
    throw new HttpError(400, `Amount must be between 1 and the balance (KES ${balance})`);

  let remaining = amount;
  for (const inst of loan.schedule) {
    if (remaining <= 0) break;
    const due = round(inst.total - inst.paid);
    if (due <= 0) continue;
    const pay = Math.min(remaining, due);
    inst.paid = round(inst.paid + pay);
    inst.status = inst.paid >= inst.total ? "paid" : "partial";
    remaining = round(remaining - pay);
  }

  loan.totalPaid = round(loan.totalPaid + amount);
  if (loan.totalPaid >= loan.totalPayable) loan.status = "cleared";
  await loan.save();

  const repayment = await Repayment.create({
    loan: loan._id, member: loan.member, amount, paidOn, reference, recordedBy: req.user._id,
  });
  res.status(201).json({ repayment, loan });
});

export const listLoans = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(await Loan.find(filter).populate("member", "name memberNo").sort("-createdAt"));
});

// Chairperson, the borrower, or a guarantor on the loan
export const getLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id)
    .populate("member", "name memberNo")
    .populate("guarantors.member", "name memberNo");
  if (!loan) throw new HttpError(404, "Loan not found");

  const uid = String(req.user._id);
  const allowed =
    req.user.role === "chairperson" ||
    String(loan.member._id) === uid ||
    loan.guarantors.some((g) => String(g.member._id) === uid);
  if (!allowed) throw new HttpError(403, "Not allowed");

  const repayments = await Repayment.find({ loan: loan._id }).sort("-paidOn");
  res.json({ loan, repayments });
});