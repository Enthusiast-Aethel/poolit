import crypto from "crypto";
import User from "../models/User.js";
import Loan from "../models/Loan.js";
import Fine from "../models/Fine.js";
import Settings from "../models/Settings.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { publicUser } from "./authController.js";
import { loadStats } from "../utils/stats.js";
import { standing } from "../utils/standing.js";
import { getEligibility } from "../utils/eligibility.js";

const mask = (v = "") => (v.length > 4 ? v.slice(0, 2) + "*".repeat(v.length - 4) + v.slice(-2) : v ? "****" : "");

// Light list for dropdowns (record payment, new loan, issue fine)
export const listMembers = asyncHandler(async (req, res) => {
  res.json(await User.find().select("name memberNo phone role isActive").sort("memberNo name"));
});

// Lightweight list so a member can pick guarantors (no personal data)
export const listGuarantorOptions = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true, _id: { $ne: req.user._id } }).select("name memberNo");
  res.json(users);
});

// Members register: one row per member with money totals
export const memberOverview = asyncHandler(async (req, res) => {
  const [users, settings, stats] = await Promise.all([
    User.find().sort("memberNo name"),
    Settings.get(),
    loadStats(),
  ]);

  const rows = users.map((u) => {
    const s = stats.get(u._id);
    const st = standing({
      paidByMonth: s.paidByMonth, joinDate: u.joinDate,
      dueDay: settings.contributionDueDay, monthlyAmount: stats.monthlyAmount,
    });
    return {
      ...publicUser(u),
      isActive: u.isActive,
      savings: s.savings,
      loanBalance: s.activeBalance,
      arrears: u.isActive ? st.arrears : 0,
      unpaidFines: s.unpaidFines,
      borrowingPower: Math.max(0, s.savings * settings.loanMultiplier - (s.activeBalance + s.committed)),
    };
  });
  res.json({ rows, loanMultiplier: settings.loanMultiplier, monthlyAmount: stats.monthlyAmount });
});

// Full profile for the side panel
export const getMember = asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id).select("+nationalId");
  if (!u) throw new HttpError(404, "Member not found");

  const [settings, stats, guaranteed] = await Promise.all([
    Settings.get(),
    loadStats(),
    Loan.find({ "guarantors.member": u._id, status: { $in: ["pending", "approved", "active"] } })
      .populate("member", "name memberNo"),
  ]);
  const s = stats.get(u._id);
  const st = standing({
    paidByMonth: s.paidByMonth, joinDate: u.joinDate,
    dueDay: settings.contributionDueDay, monthlyAmount: stats.monthlyAmount,
  });

  res.json({
    ...publicUser(u),
    isActive: u.isActive,
    nationalId: mask(u.nationalId),
    nextOfKin: u.nextOfKin || {},
    registrationPaid: u.registrationPaid,
    smsOptOut: !!u.smsOptOut,
    savings: s.savings,
    loanBalance: s.activeBalance,
    welfare: s.welfare,
    unpaidFines: s.unpaidFines,
    borrowingPower: Math.max(0, s.savings * settings.loanMultiplier - (s.activeBalance + s.committed)),
    standing: { ...st, monthlyAmount: stats.monthlyAmount },
    guarantees: guaranteed.map((l) => ({
      loanId: l._id, loanNo: l.loanNo, borrower: l.member, principal: l.principal, status: l.status,
    })),
  });
});

export const updateMember = asyncHandler(async (req, res) => {
  const m = await User.findById(req.params.id);
  if (!m) throw new HttpError(404, "Member not found");

  const { name, phone, email, role, isActive, memberNo, registrationPaid, nationalId, nextOfKin, smsOptOut } = req.body;
  const changes = { name, phone, role, isActive, memberNo, registrationPaid, smsOptOut };
  Object.entries(changes).forEach(([k, v]) => v !== undefined && m.set(k, v));
  if (email !== undefined) m.email = email || undefined;
  if (nationalId) m.nationalId = nationalId; // blank keeps the existing number
  if (nextOfKin) m.nextOfKin = nextOfKin;
  await m.save();

  res.json({ ...publicUser(m), isActive: m.isActive });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id).select("+password");
  if (!u) throw new HttpError(404, "Member not found");

  const generated = !req.body.password;
  const password = req.body.password || crypto.randomBytes(6).toString("base64url");
  if (password.length < 6) throw new HttpError(400, "Password must be at least 6 characters");

  u.password = password;
  await u.save();
  res.json({ message: "Password updated", ...(generated && { temporaryPassword: password }) });
});

// What this member could borrow right now (net of what they still owe)
export const memberEligibility = asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id).select("_id");
  if (!u) throw new HttpError(404, "Member not found");
  res.json(await getEligibility(u._id, req.query.amount));
});
