import Contribution from "../models/Contribution.js";
import ContributionType from "../models/ContributionType.js";
import User from "../models/User.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";

export const recordContribution = asyncHandler(async (req, res) => {
  const { member, type, amount, year, month, paidOn, reference, cycle, round } = req.body;

  const t = await ContributionType.findById(type);
  if (!t || !t.isActive) throw new HttpError(400, "Invalid or inactive contribution type");
  const user = await User.findById(member);
  if (!user) throw new HttpError(404, "Member not found");

  if (t.frequency === "monthly") {
    if (!month || !year) throw new HttpError(400, "Month and year are required");
    const dup = await Contribution.findOne({ member, type, year, month });
    if (dup) throw new HttpError(400, "This month is already recorded for the member");
  }

  if (cycle && round) {
    const dup = await Contribution.findOne({ member, cycle, round });
    if (dup) throw new HttpError(400, "Member already paid into this round");
  }

  const c = await Contribution.create({
    member, type,
    amount: amount || t.amount,
    year: year || new Date().getFullYear(),
    month, paidOn, reference,
    cycle, round,
    recordedBy: req.user._id,
  });

  if (t.code === "registration") {
    user.registrationPaid = true;
    await user.save();
  }
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
  const type = await ContributionType.findOne({ code });
  if (!type) throw new HttpError(404, "Contribution type not found");

  const [members, contribs] = await Promise.all([
    User.find({ isActive: true }).select("name memberNo").sort("memberNo name"),
    Contribution.find({ type: type._id, year }).lean(),
  ]);

  const rows = members.map((m) => ({
    member: { id: m._id, name: m.name, memberNo: m.memberNo },
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
  res.json({ year, type: type.name, rows });
});