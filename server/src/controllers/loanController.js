import Loan from "../models/Loan.js";
import Repayment from "../models/Repayment.js";
import User from "../models/User.js";
import Settings from "../models/Settings.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { getEligibility } from "../utils/eligibility.js";
import { buildSchedule } from "../utils/loanSchedule.js";
import { summarizeLoan } from "../utils/loanSummary.js";
import { nextNo } from "../utils/nextNo.js";
import { notifyLater } from "../services/notify.js";

const n = (v) => Math.round(v).toLocaleString("en-KE");
const day = (d) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
const disbursedVars = (loan) => ({
  loanNo: loan.loanNo || "your loan", amount: n(loan.principal),
  instalment: n(loan.schedule[0]?.total || 0), date: loan.schedule[0] ? day(loan.schedule[0].dueDate) : "",
});

const round = (n) => Math.round(n * 100) / 100;
const isAdmin = (u) => u.role === "chairperson";

// Builds the repayment schedule and starts the loan
function activate(loan, startDate = new Date()) {
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
}

// Live preview for the application forms (nothing is saved)
export const previewLoan = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  const months = Number(req.body.termMonths);
  const method = req.body.interestMethod;
  if (!(amount > 0) || !(months >= 1) || !["flat", "reducing"].includes(method))
    throw new HttpError(400, "Enter an amount, a repayment period and an interest method");

  const settings = await Settings.get();
  const schedule = buildSchedule({
    principal: amount, annualRate: settings.interestRate, months, method, startDate: new Date(),
  });
  const totalPayable = round(schedule.reduce((s, i) => s + i.total, 0));
  res.json({
    rate: settings.interestRate,
    schedule,
    installment: schedule[0].total,
    totalInterest: round(totalPayable - amount),
    totalPayable,
    maturity: schedule[schedule.length - 1].dueDate,
  });
});

// MEMBER applies for themselves. The chairperson can record a loan for a member
// (guarantors are then taken as confirmed) and optionally disburse straight away.
export const applyLoan = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  const termMonths = Number(req.body.termMonths);
  const { interestMethod, purpose, guarantors = [], disburseNow } = req.body;
  const admin = isAdmin(req.user);
  const memberId = admin && req.body.member ? req.body.member : req.user._id;

  const borrower = await User.findById(memberId);
  if (!borrower || !borrower.isActive) throw new HttpError(400, "Borrower not found or not active");
  if (!(amount > 0)) throw new HttpError(400, "Enter the loan amount");
  if (!["flat", "reducing"].includes(interestMethod))
    throw new HttpError(400, "Interest method must be flat or reducing");

  const elig = await getEligibility(memberId, amount);
  if (!elig.allowed) throw new HttpError(400, elig.reason);

  if (!(termMonths >= 1) || termMonths > elig.maxTermMonths)
    throw new HttpError(400, `Maximum repayment period for this loan is ${elig.maxTermMonths} months`);

  const ids = [...new Set(guarantors.map(String))];
  if (ids.includes(String(memberId))) throw new HttpError(400, "A member cannot guarantee their own loan");
  if (ids.length < elig.guarantorsRequired)
    throw new HttpError(400, `This loan needs ${elig.guarantorsRequired} guarantors`);
  const valid = await User.countDocuments({ _id: { $in: ids }, isActive: true });
  if (valid !== ids.length) throw new HttpError(400, "One or more guarantors are not active members");

  const settings = await Settings.get();
  const loan = new Loan({
    loanNo: await nextNo(Loan, "LN"),
    member: memberId,
    principal: amount,
    interestRate: settings.interestRate,
    interestMethod,
    termMonths,
    purpose,
    guarantors: ids.map((member) => ({ member, status: admin ? "accepted" : "pending" })),
  });

  if (admin && disburseNow) {
    loan.status = "approved";
    loan.approvedBy = req.user._id;
    loan.approvedAt = new Date();
    activate(loan, req.body.disbursedOn ? new Date(req.body.disbursedOn) : new Date());
  }
  await loan.save();

  // ask each guarantor to agree (when the chairperson records it for them, it is already confirmed)
  if (!admin) ids.forEach((gid) => notifyLater("guaranteeRequest", gid, { borrower: borrower.name, amount: n(amount) }));
  if (loan.status === "active") notifyLater("loanDisbursed", memberId, () => disbursedVars(loan));
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
  notifyLater("loanApproved", loan.member, { loanNo: loan.loanNo || "", amount: n(loan.principal) });
  res.json(loan);
});

export const rejectLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id);
  if (!loan || !["pending", "approved"].includes(loan.status))
    throw new HttpError(400, "This loan cannot be rejected");
  loan.status = "rejected";
  loan.rejectionReason = req.body.reason;
  await loan.save();
  notifyLater("loanRejected", loan.member, { amount: n(loan.principal), reason: req.body.reason ? `Reason: ${req.body.reason}` : "" });
  res.json(loan);
});

export const disburseLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id);
  if (!loan || loan.status !== "approved") throw new HttpError(400, "Only approved loans can be disbursed");
  activate(loan, req.body.disbursedOn ? new Date(req.body.disbursedOn) : new Date());
  await loan.save();
  notifyLater("loanDisbursed", loan.member, () => disbursedVars(loan));
  res.json(loan);
});

// ADMIN: record a repayment, applied to the oldest unpaid instalments first
export const recordRepayment = asyncHandler(async (req, res) => {
  const { paidOn, reference } = req.body;
  const amount = Number(req.body.amount);
  const loan = await Loan.findById(req.params.id);
  if (!loan || loan.status !== "active") throw new HttpError(400, "Loan is not active");

  const balance = round(loan.totalPayable - loan.totalPaid);
  if (!(amount > 0) || amount > balance)
    throw new HttpError(400, `Amount must be between 1 and the balance (KES ${balance})`);

  const ref = reference ? reference.trim().toUpperCase() : undefined;
  if (ref && (await Repayment.findOne({ reference: ref })))
    throw new HttpError(400, "That reference has already been recorded");

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
    loan: loan._id, member: loan.member, amount, paidOn, reference: ref, recordedBy: req.user._id,
  });
  notifyLater("repaymentReceived", loan.member, { amount: n(amount), loanNo: loan.loanNo || "your loan", balance: n(loan.totalPayable - loan.totalPaid) });
  res.status(201).json({ repayment, loan });
});

// Loans register: every loan with derived status, next due date and balance
export const listLoans = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const loans = await Loan.find(filter)
    .populate("member", "name memberNo")
    .populate("guarantors.member", "name memberNo")
    .sort("-createdAt");

  res.json(
    loans.map((l) => {
      const { summary } = summarizeLoan(l);
      const o = l.toObject();
      delete o.schedule;
      return { ...o, summary };
    })
  );
});

// Chairperson, the borrower, or a guarantor on the loan
export const getLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id)
    .populate("member", "name memberNo phone")
    .populate("guarantors.member", "name memberNo phone")
    .populate("approvedBy", "name");
  if (!loan) throw new HttpError(404, "Loan not found");

  const uid = String(req.user._id);
  const allowed =
    isAdmin(req.user) ||
    String(loan.member._id) === uid ||
    loan.guarantors.some((g) => String(g.member._id) === uid);
  if (!allowed) throw new HttpError(403, "Not allowed");

  const { schedule, summary } = summarizeLoan(loan);
  const out = loan.toObject();
  out.schedule = schedule;
  const repayments = await Repayment.find({ loan: loan._id }).sort("-paidOn");
  res.json({ loan: out, summary, repayments });
});
