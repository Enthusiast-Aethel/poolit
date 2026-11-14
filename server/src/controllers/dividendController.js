import DividendRun from "../models/DividendRun.js";
import Repayment from "../models/Repayment.js";
import Fine from "../models/Fine.js";
import Expense from "../models/Expense.js";
import Investment from "../models/Investment.js";
import User from "../models/User.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { getSavingsByMember } from "../utils/savings.js";
import { allocate, computeDistributable } from "../utils/dividends.js";

const round = (n) => Math.round(n * 100) / 100;

// A suggested surplus for the year. The chairperson decides the final figure.
export const surplusPreview = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const [repayments, fines, investments, expenses] = await Promise.all([
    Repayment.find({ paidOn: { $gte: start, $lt: end } }).populate("loan", "principal totalPayable"),
    Fine.find({ status: "paid", paidOn: { $gte: start, $lt: end } }),
    Investment.find(),
    Expense.find({ date: { $gte: start, $lt: end } }),
  ]);

  // Interest portion of each repayment, pro-rata to the loan's total interest
  const interestIncome = round(
    repayments.reduce((s, r) => {
      const l = r.loan;
      if (!l?.totalPayable) return s;
      return s + r.amount * ((l.totalPayable - l.principal) / l.totalPayable);
    }, 0)
  );
  const finesCollected = fines.reduce((s, f) => s + f.amount, 0);
  const investmentReturns = investments
    .flatMap((i) => i.returns)
    .filter((r) => r.date >= start && r.date < end)
    .reduce((s, r) => s + r.amount, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);

  res.json({
    year, interestIncome, finesCollected, investmentReturns, expenses: expenseTotal,
    suggestedSurplus: round(interestIncome + finesCollected + investmentReturns - expenseTotal),
    note: "Interest is estimated pro-rata from repayments received in the year.",
  });
});

// Creates (or replaces) a DRAFT so the chairperson can review before finalizing
export const createRun = asyncHandler(async (req, res) => {
  const year = Number(req.body.year);
  const grossSurplus = Number(req.body.grossSurplus ?? req.body.distributableSurplus);
  const reservePercent = Number(req.body.reservePercent) || 0;
  const otherDeductions = Number(req.body.otherDeductions) || 0;
  if (!year) throw new HttpError(400, "Choose the year");
  if (!(grossSurplus > 0)) throw new HttpError(400, "Enter the surplus to be shared");
  if (reservePercent < 0 || reservePercent > 100) throw new HttpError(400, "Reserve must be between 0 and 100%");

  const { reserveAmount, distributable } = computeDistributable({ grossSurplus, reservePercent, otherDeductions });
  if (!(distributable > 0)) throw new HttpError(400, "Nothing is left to share after the reserve and deductions");

  if (await DividendRun.findOne({ year, status: "finalized" }))
    throw new HttpError(400, `Dividends for ${year} are already finalized`);
  await DividendRun.deleteMany({ year, status: "draft" });

  const active = new Set((await User.find({ isActive: true }).select("_id")).map((u) => String(u._id)));
  const rows = (await getSavingsByMember(year)).filter((r) => active.has(String(r._id)) && r.total > 0);
  const { totalSavings, allocations, unallocated } = allocate(rows, distributable);
  if (!totalSavings) throw new HttpError(400, "No savings recorded, nothing to distribute");

  const run = await DividendRun.create({
    year, grossSurplus, reservePercent, reserveAmount, otherDeductions,
    distributableSurplus: distributable, totalSavings, unallocated, allocations,
    note: req.body.note, createdBy: req.user._id,
  });
  res.status(201).json(run);
});

export const listRuns = asyncHandler(async (req, res) => {
  res.json(await DividendRun.find().select("-allocations").sort("-year"));
});

export const getRun = asyncHandler(async (req, res) => {
  const run = await DividendRun.findById(req.params.id).populate("allocations.member", "name memberNo");
  if (!run) throw new HttpError(404, "Run not found");
  res.json(run);
});

export const finalizeRun = asyncHandler(async (req, res) => {
  const run = await DividendRun.findById(req.params.id);
  if (!run || run.status !== "draft") throw new HttpError(400, "Only a draft can be finalized");
  run.status = "finalized";
  run.finalizedAt = new Date();
  await run.save();
  res.json(run);
});

export const deleteDraft = asyncHandler(async (req, res) => {
  const run = await DividendRun.findById(req.params.id);
  if (!run || run.status !== "draft") throw new HttpError(400, "Only drafts can be deleted");
  await run.deleteOne();
  res.json({ message: "Draft deleted" });
});

export const markPaid = asyncHandler(async (req, res) => {
  const run = await DividendRun.findById(req.params.id);
  if (!run || run.status !== "finalized") throw new HttpError(400, "Run must be finalized first");
  const a = run.allocations.find((x) => String(x.member) === req.params.memberId);
  if (!a) throw new HttpError(404, "Allocation not found");
  a.paid = !a.paid; // click again to undo a mistake
  a.paidOn = a.paid ? new Date() : undefined;
  await run.save();
  res.json(run);
});
