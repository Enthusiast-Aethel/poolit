import Expense from "../models/Expense.js";
import Investment from "../models/Investment.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";

export const listExpenses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.year) {
    const y = Number(req.query.year);
    filter.date = { $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) };
  }
  const expenses = await Expense.find(filter).sort("-date");
  res.json({ total: expenses.reduce((s, e) => s + e.amount, 0), expenses });
});

export const createExpense = asyncHandler(async (req, res) => {
  const { category, description, amount, date, reference } = req.body;
  res.status(201).json(
    await Expense.create({ category, description, amount, date, reference, recordedBy: req.user._id })
  );
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await Expense.findByIdAndDelete(req.params.id);
  res.json({ message: "Expense deleted" });
});

export const listInvestments = asyncHandler(async (req, res) => {
  const items = await Investment.find().sort("-dateInvested");
  res.json({
    totalInvested: items.reduce((s, i) => s + i.amountInvested, 0),
    totalValue: items.reduce((s, i) => s + i.currentValue, 0),
    investments: items,
  });
});

export const createInvestment = asyncHandler(async (req, res) => {
  const { name, type, amountInvested, dateInvested, currentValue, note } = req.body;
  res.status(201).json(
    await Investment.create({
      name, type, amountInvested, dateInvested, note,
      currentValue: currentValue ?? amountInvested,
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
  inv.returns.push({ date: req.body.date, amount: req.body.amount, note: req.body.note });
  await inv.save();
  res.status(201).json(inv);
});