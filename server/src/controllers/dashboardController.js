import User from "../models/User.js";
import Loan from "../models/Loan.js";
import Fine from "../models/Fine.js";
import Expense from "../models/Expense.js";
import Investment from "../models/Investment.js";
import { asyncHandler } from "../middleware/errors.js";
import { getSavingsByMember } from "../utils/savings.js";
import { fundBalance } from "../utils/welfare.js";

export const dashboard = asyncHandler(async (req, res) => {
  const year = new Date().getFullYear();
  const [members, savingsRows, activeLoans, unpaidFines, expenses, investments, welfare] = await Promise.all([
    User.countDocuments({ isActive: true }),
    getSavingsByMember(year),
    Loan.find({ status: "active" }),
    Fine.find({ status: "unpaid" }),
    Expense.find({ date: { $gte: new Date(year, 0, 1) } }),
    Investment.find({ status: "active" }),
    fundBalance(),
  ]);

  res.json({
    members,
    totalSavings: savingsRows.reduce((s, r) => s + r.total, 0),
    activeLoans: activeLoans.length,
    loansOutstanding: activeLoans.reduce((s, l) => s + (l.totalPayable - l.totalPaid), 0),
    pendingLoanRequests: await Loan.countDocuments({ status: "pending" }),
    unpaidFines: unpaidFines.reduce((s, f) => s + f.amount, 0),
    expensesThisYear: expenses.reduce((s, e) => s + e.amount, 0),
    investmentsValue: investments.reduce((s, i) => s + i.currentValue, 0),
    welfareBalance: welfare.balance,
  });
});