import Expense from "../models/Expense.js";
import Investment from "../models/Investment.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { nextNo } from "../utils/nextNo.js";

const yearRange = (y) => ({ $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) });

export const listExpenses = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const expenses = await Expense.find({ date: yearRange(year) }).sort("-date");
  const byCategory = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  res.json({ year, total: expenses.reduce((s, e) => s + e.amount, 0), byCategory, expenses });
});

export const createExpense = asyncHandler(async (req, res) => {
  const { category, payee, description, date, reference } = req.body;
  const amount = Number(req.body.amount);
  if (!category?.trim()) throw new HttpError(400, "Choose or type a category");
  if (!(amount > 0)) throw new HttpError(400, "Enter the amount");
  res.status(201).json(
    await Expense.create({
      voucherNo: await nextNo(Expense, "EXP"),
      category: category.trim(), payee, description, amount, date, reference, recordedBy: req.user._id,
    })
  );
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await Expense.findByIdAndDelete(req.params.id);
  res.json({ message: "Expense deleted" });
});

export const listInvestments = asyncHandler(async (req, res) => {
  const items = await Investment.find().sort("-dateInvested");
  const year = new Date().getFullYear();
  const returnsIn = (i, from, to) => i.returns.filter((r) => new Date(r.date) >= from && new Date(r.date) < to).reduce((s, r) => s + r.amount, 0);
  const from = new Date(year, 0, 1), to = new Date(year + 1, 0, 1);

  const live = items.filter((i) => i.status === "active");
  res.json({
    totalInvested: live.reduce((s, i) => s + i.amountInvested, 0),
    totalValue: live.reduce((s, i) => s + i.currentValue, 0),
    returnsYtd: items.reduce((s, i) => s + returnsIn(i, from, to), 0),
    returnsTotal: items.reduce((s, i) => s + i.returns.reduce((a, r) => a + r.amount, 0), 0),
    investments: items,
  });
});

export const createInvestment = asyncHandler(async (req, res) => {
  const { name, type, dateInvested, expectedYield, horizon, note } = req.body;
  const amountInvested = Number(req.body.amountInvested);
  if (!name?.trim()) throw new HttpError(400, "Give the investment a name");
  if (!(amountInvested > 0)) throw new HttpError(400, "Enter the amount invested");
  res.status(201).json(
    await Investment.create({
      name: name.trim(), type, amountInvested, dateInvested, expectedYield: expectedYield || undefined, horizon, note,
      currentValue: Number(req.body.currentValue) || amountInvested,
    })
  );
});

export const updateInvestment = asyncHandler(async (req, res) => {
  const { currentValue, status, note } = req.body;
  const inv = await Investment.findByIdAndUpdate(
    req.params.id, { currentValue, status, note }, { new: true, runValidators: true }
  );
  if (!inv) throw new HttpError(404, "Investment not found");
  res.json(inv);
});

// Record income earned (interest, rent, dividend received...)
export const addReturn = asyncHandler(async (req, res) => {
  const inv = await Investment.findById(req.params.id);
  if (!inv) throw new HttpError(404, "Investment not found");
  const amount = Number(req.body.amount);
  if (!(amount > 0)) throw new HttpError(400, "Enter the amount received");
  inv.returns.push({ date: req.body.date, amount, note: req.body.note });
  await inv.save();
  res.status(201).json(inv);
});
