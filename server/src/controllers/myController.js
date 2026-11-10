import Contribution from "../models/Contribution.js";
import Loan from "../models/Loan.js";
import Fine from "../models/Fine.js";
import Repayment from "../models/Repayment.js";
import Settings from "../models/Settings.js";
import { asyncHandler } from "../middleware/errors.js";
import { getSavings } from "../utils/savings.js";
import { loanRequirements } from "../utils/rules.js";

export const mySavings = asyncHandler(async (req, res) => {
  const contributions = await Contribution.find({ member: req.user._id })
    .populate("type", "name code")
    .sort("-paidOn");

  const byType = {};
  for (const c of contributions) {
    byType[c.type.name] = (byType[c.type.name] || 0) + c.amount;
  }
  const savings = await getSavings(req.user._id);
  res.json({ savings, byType, contributions });
});

export const myLoans = asyncHandler(async (req, res) => {
  res.json(await Loan.find({ member: req.user._id }).sort("-createdAt"));
});

// Loans where I've been asked to be a guarantor
export const myGuarantees = asyncHandler(async (req, res) => {
  res.json(
    await Loan.find({ "guarantors.member": req.user._id })
      .populate("member", "name memberNo")
      .sort("-createdAt")
  );
});

export const myFines = asyncHandler(async (req, res) => {
  res.json(await Fine.find({ member: req.user._id }).sort("-dateIssued"));
});

// How much can I borrow? Drives the loan application form
export const myLoanEligibility = asyncHandler(async (req, res) => {
  const settings = await Settings.get();
  const savings = await getSavings(req.user._id);
  const amount = Number(req.query.amount) || savings;
  res.json({ savings, limit: savings * settings.loanMultiplier, ...loanRequirements({ amount, savings, settings }) });
});

// Everything needed for the printable statement
export const myStatement = asyncHandler(async (req, res) => {
  const [contributions, loans, repayments, fines] = await Promise.all([
    Contribution.find({ member: req.user._id }).populate("type", "name").sort("paidOn"),
    Loan.find({ member: req.user._id }).sort("createdAt"),
    Repayment.find({ member: req.user._id }).sort("paidOn"),
    Fine.find({ member: req.user._id }).sort("dateIssued"),
  ]);
  res.json({
    member: { name: req.user.name, memberNo: req.user.memberNo, joinDate: req.user.joinDate },
    savings: await getSavings(req.user._id),
    contributions, loans, repayments, fines,
  });
});