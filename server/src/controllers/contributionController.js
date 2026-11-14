import Contribution from "../models/Contribution.js";
import ContributionType from "../models/ContributionType.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { notifyLater } from "../services/notify.js";
import { getSavings } from "../utils/savings.js";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const n = (v) => Math.round(v).toLocaleString("en-KE");

export const recordContribution = asyncHandler(async (req, res) => {
  const { member, type, amount, year, month, paidOn, reference, cycle, round } = req.body;

  const t = await ContributionType.findById(type);
  if (!t || !t.isActive) throw new HttpError(400, "Invalid or inactive contribution type");
  const user = await User.findById(member);
  if (!user) throw new HttpError(404, "Member not found");

  const value = Number(amount) || t.amount;
  if (!(value > 0)) throw new HttpError(400, "Enter an amount");
  const y = Number(year) || new Date().getFullYear();

  // The same M-Pesa code must never be recorded twice
  const ref = reference ? reference.trim().toUpperCase() : undefined;
  if (ref && (await Contribution.findOne({ reference: ref })))
    throw new HttpError(400, "That reference has already been recorded");

  if (t.frequency === "monthly") {
    if (!month) throw new HttpError(400, "Choose the month this payment is for");
    if (t.amount > 0) {
      // Partial payments are allowed, but a month can't be paid beyond the fixed amount
      const prior = await Contribution.aggregate([
        { $match: { member: user._id, type: t._id, year: y, month: Number(month) } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const remaining = t.amount - (prior[0]?.total || 0);
      if (value > remaining)
        throw new HttpError(400, remaining <= 0 ? "This month is already fully paid." : `Only KES ${remaining} is still due for this month.`);
    }
  }

  if (cycle && round) {
    const dup = await Contribution.findOne({ member, cycle, round });
    if (dup) throw new HttpError(400, "Member already paid into this round");
  }

  const c = await Contribution.create({
    member, type, amount: value, year: y,
    month: month ? Number(month) : undefined,
    paidOn, reference: ref, cycle, round,
    recordedBy: req.user._id,
  });

  if (t.code === "registration") {
    user.registrationPaid = true;
    await user.save();
  }

  notifyLater("contributionReceived", member, async () => ({
    amount: n(value), type: t.name,
    period: c.month ? ` for ${MONTH[c.month - 1]} ${c.year}` : "",
    savings: n(await getSavings(member)),
  }));
  res.status(201).json(c);
});

export const listContributions = asyncHandler(async (req, res) => {
  const filter = {};
  ["member", "type", "year"].forEach((k) => req.query[k] && (filter[k] = req.query[k]));
  res.json(
    await Contribution.find(filter)
      .populate("member", "name memberNo")
      .populate("type", "name code")
      .sort("-paidOn")
  );
});

// 12-month matrix: one row per member, 12 columns
export const matrix = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const code = req.query.type || "monthly";
  const [type, settings] = await Promise.all([ContributionType.findOne({ code }), Settings.get()]);
  if (!type) throw new HttpError(404, "Contribution type not found");

  const [members, contribs] = await Promise.all([
    User.find({ isActive: true }).select("name memberNo role joinDate").sort("memberNo name"),
    Contribution.find({ type: type._id, year }).lean(),
  ]);

  const rows = members.map((m) => ({
    member: { id: m._id, name: m.name, memberNo: m.memberNo, role: m.role },
    joinDate: m.joinDate,
    months: Array(12).fill(0),
    total: 0,
  }));
  const index = new Map(rows.map((r) => [String(r.member.id), r]));

  for (const c of contribs) {
    const row = index.get(String(c.member));
    if (row && c.month) {
      row.months[c.month - 1] += c.amount;
      row.total += c.amount;
    }
  }
  res.json({
    year,
    type: { id: type._id, code: type.code, name: type.name, amount: type.amount, frequency: type.frequency },
    dueDay: settings.contributionDueDay,
    rows,
  });
});
