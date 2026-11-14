import Contribution from "../models/Contribution.js";
import ContributionType from "../models/ContributionType.js";
import Loan from "../models/Loan.js";
import Fine from "../models/Fine.js";
import Repayment from "../models/Repayment.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";
import WelfarePayout from "../models/WelfarePayout.js";
import Meeting from "../models/Meeting.js";
import DividendRun from "../models/DividendRun.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { getSavings } from "../utils/savings.js";
import { getEligibility } from "../utils/eligibility.js";
import { standing } from "../utils/standing.js";
import { summarizeLoan } from "../utils/loanSummary.js";
import { nextNo } from "../utils/nextNo.js";

const sum = (list, f = (x) => x.amount) => list.reduce((s, x) => s + f(x), 0);
const mask = (v = "") => (v.length > 4 ? v.slice(0, 2) + "*".repeat(v.length - 4) + v.slice(-2) : v ? "****" : "");
const yearRange = (y) => ({ $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) });

export const mySavings = asyncHandler(async (req, res) => {
  const [contributions, settings, monthlyType] = await Promise.all([
    Contribution.find({ member: req.user._id }).populate("type", "name code").sort("-paidOn"),
    Settings.get(),
    ContributionType.findOne({ code: "monthly" }),
  ]);

  const byType = {};
  const paidByMonth = {};
  const year = new Date().getFullYear();
  for (const c of contributions) {
    byType[c.type.name] = (byType[c.type.name] || 0) + c.amount;
    if (c.type.code === "monthly" && c.year === year && c.month) {
      paidByMonth[c.month] = (paidByMonth[c.month] || 0) + c.amount;
    }
  }

  const monthlyAmount = monthlyType?.amount || 0;
  res.json({
    savings: await getSavings(req.user._id),
    byType,
    contributions,
    monthlyAmount,
    dueDay: settings.contributionDueDay,
    standing: standing({
      paidByMonth, joinDate: req.user.joinDate, dueDay: settings.contributionDueDay, monthlyAmount,
    }),
  });
});

// My loans with derived status, next due date and the schedule
export const myLoans = asyncHandler(async (req, res) => {
  const loans = await Loan.find({ member: req.user._id })
    .populate("guarantors.member", "name memberNo")
    .sort("-createdAt");
  res.json(
    loans.map((l) => {
      const { schedule, summary } = summarizeLoan(l);
      const o = l.toObject();
      o.schedule = schedule;
      return { ...o, summary };
    })
  );
});

// Loans where I've been asked to be a guarantor, with my own answer
export const myGuarantees = asyncHandler(async (req, res) => {
  const uid = String(req.user._id);
  const loans = await Loan.find({ "guarantors.member": req.user._id }).populate("member", "name memberNo").sort("-createdAt");
  res.json(
    loans.map((l) => {
      const { summary } = summarizeLoan(l);
      return {
        _id: l._id, loanNo: l.loanNo, borrower: l.member, principal: l.principal, termMonths: l.termMonths,
        interestMethod: l.interestMethod, status: l.status, displayStatus: summary.displayStatus,
        balance: summary.balance, daysPastDue: summary.daysPastDue,
        myStatus: l.guarantors.find((g) => String(g.member) === uid)?.status,
        createdAt: l.createdAt,
      };
    })
  );
});

export const myFines = asyncHandler(async (req, res) => {
  res.json(await Fine.find({ member: req.user._id }).sort("-dateIssued"));
});

// How much can I borrow right now? Net of what I still owe. Drives the loan application form.
export const myLoanEligibility = asyncHandler(async (req, res) => {
  res.json(await getEligibility(req.user._id, req.query.amount));
});

// My welfare: what I have put in, my claims, and the categories I can claim under
export const myWelfare = asyncHandler(async (req, res) => {
  const [type, settings, claims] = await Promise.all([
    ContributionType.findOne({ code: "welfare" }),
    Settings.get(),
    WelfarePayout.find({ member: req.user._id }).sort("-date"),
  ]);
  const mine = type ? await Contribution.find({ member: req.user._id, type: type._id }) : [];
  res.json({
    myContributions: sum(mine),
    claims,
    categories: settings.welfare.categories,
  });
});

// A member asks for welfare support. It goes to the chairperson as a claim under review.
export const submitWelfareClaim = asyncHandler(async (req, res) => {
  const { category = "other", beneficiary, relationship, note } = req.body;
  const amount = Number(req.body.amount);
  if (!(amount > 0)) throw new HttpError(400, "Enter the amount you are asking for");

  const settings = await Settings.get();
  const cat = settings.welfare.categories.find((c) => c.key === category);
  if (!cat) throw new HttpError(400, "Choose a valid category");
  if (cat.cap > 0 && amount > cat.cap)
    throw new HttpError(400, `The limit for ${cat.label} is KES ${cat.cap.toLocaleString("en-KE")}`);

  const claim = await WelfarePayout.create({
    claimNo: await nextNo(WelfarePayout, "CLM"),
    member: req.user._id, category, amount, beneficiary, relationship, note,
  });
  res.status(201).json(claim);
});

// My attendance at meetings whose roll has been called
export const myAttendance = asyncHandler(async (req, res) => {
  const meetings = await Meeting.find({ "attendance.member": req.user._id, date: { $lte: new Date() } }).sort("-date");
  const uid = String(req.user._id);
  res.json(
    meetings
      .filter((m) => m.attendance.some((a) => a.status !== "absent"))
      .map((m) => {
        const mine = m.attendance.find((a) => String(a.member) === uid);
        return { id: m._id, title: m.title, date: m.date, status: mine?.status, fined: !!mine?.fined };
      })
  );
});

export const myDividends = asyncHandler(async (req, res) => {
  const runs = await DividendRun.find({ status: "finalized", "allocations.member": req.user._id }).sort("-year");
  res.json(
    runs.map((r) => {
      const a = r.allocations.find((x) => String(x.member) === String(req.user._id));
      return { year: r.year, savings: a.savings, share: a.share, amount: a.amount, paid: a.paid, paidOn: a.paidOn };
    })
  );
});

// Everything the printable statement needs, for one calendar year
export const myStatement = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const uid = req.user._id;

  const [me, settings, contributions, loans, repayments, fines, runs, savings, elig, unpaid] = await Promise.all([
    User.findById(uid).select("+nationalId"),
    Settings.get(),
    Contribution.find({ member: uid, paidOn: yearRange(year) }).populate("type", "name code").sort("paidOn"),
    Loan.find({ member: uid, status: { $ne: "rejected" } }).sort("createdAt"),
    Repayment.find({ member: uid, paidOn: yearRange(year) }).populate("loan", "loanNo").sort("paidOn"),
    Fine.find({ member: uid, dateIssued: yearRange(year) }).sort("dateIssued"),
    DividendRun.find({ status: "finalized", year, "allocations.member": uid }),
    getSavings(uid),
    getEligibility(uid, 0),
    Fine.find({ member: uid, status: "unpaid" }),
  ]);

  const dividend = runs[0]?.allocations.find((a) => String(a.member) === String(uid));
  res.json({
    year,
    generatedAt: new Date(),
    chama: {
      name: settings.chamaName, registrationNumber: settings.registrationNumber,
      address: settings.address, contactPhone: settings.contactPhone, contactEmail: settings.contactEmail,
    },
    member: {
      name: me.name, memberNo: me.memberNo, phone: me.phone, email: me.email, role: me.role,
      joinDate: me.joinDate, nationalId: mask(me.nationalId),
    },
    summary: {
      savings, borrowingLimit: elig.limit, owed: elig.outstanding, available: elig.available,
      unpaidFines: sum(unpaid),
      contributedInYear: sum(contributions),
      welfareInYear: sum(contributions.filter((c) => c.type?.code === "welfare")),
    },
    contributions,
    loans: loans.map((l) => {
      const { summary } = summarizeLoan(l);
      return {
        _id: l._id, loanNo: l.loanNo, principal: l.principal, interestRate: l.interestRate, interestMethod: l.interestMethod,
        termMonths: l.termMonths, disbursedOn: l.disbursedOn, status: summary.displayStatus,
        totalPayable: l.totalPayable, totalPaid: l.totalPaid, balance: summary.balance,
        nextDue: summary.nextDue,
      };
    }),
    repayments,
    fines,
    dividend: dividend ? { amount: dividend.amount, savings: dividend.savings, share: dividend.share, paid: dividend.paid, paidOn: dividend.paidOn } : null,
  });
});
