import crypto from "crypto";
import MerryGoRound from "../models/MerryGoRound.js";
import ContributionType from "../models/ContributionType.js";
import Contribution from "../models/Contribution.js";
import User from "../models/User.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";

// Fair, unbiased shuffle using Node's cryptographic random generator
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ADMIN: run the ballot. The order is saved and can never be changed.
export const createCycle = asyncHandler(async (req, res) => {
  if (await MerryGoRound.findOne({ status: "active" }))
    throw new HttpError(400, "A cycle is already running. Finish it before starting another.");

  const type = await ContributionType.findOne({ code: "merry_go_round" });
  if (!(type?.amount > 0))
    throw new HttpError(400, "Set the Merry-Go-Round amount per member first");

  const members = await User.find({ isActive: true }).select("_id");
  if (members.length < 2) throw new HttpError(400, "At least 2 active members are needed");

  const payout = type.amount * members.length; // amount x active members
  const order = shuffle(members);

  const cycle = await MerryGoRound.create({
    name: req.body.name || `Cycle ${new Date().getFullYear()}`,
    amountPerMember: type.amount,
    drawnBy: req.user._id,
    rounds: order.map((m, i) => ({ position: i + 1, member: m._id, payout })),
  });
  res.status(201).json(cycle);
});

export const listCycles = asyncHandler(async (req, res) => {
  res.json(await MerryGoRound.find().select("-rounds").sort("-createdAt"));
});

// Any logged-in member can see the order (transparency)
export const getCycle = asyncHandler(async (req, res) => {
  const cycle = await MerryGoRound.findById(req.params.id).populate("rounds.member", "name memberNo");
  if (!cycle) throw new HttpError(404, "Cycle not found");

  const collected = await Contribution.aggregate([
    { $match: { cycle: cycle._id } },
    { $group: { _id: "$round", total: { $sum: "$amount" }, payers: { $sum: 1 } } },
  ]);
  const byRound = Object.fromEntries(collected.map((c) => [c._id, c]));

  res.json({
    ...cycle.toObject(),
    rounds: cycle.rounds.map((r) => ({
      ...r.toObject(),
      collected: byRound[r.position]?.total || 0,
      payers: byRound[r.position]?.payers || 0,
    })),
  });
});

// ADMIN: mark a round as paid out (earlier rounds must be paid first)
export const payRound = asyncHandler(async (req, res) => {
  const cycle = await MerryGoRound.findById(req.params.id);
  if (!cycle) throw new HttpError(404, "Cycle not found");

  const r = cycle.rounds.find((x) => x.position === Number(req.params.position));
  if (!r) throw new HttpError(404, "Round not found");
  if (r.status === "paid") throw new HttpError(400, "Round already paid");
  if (cycle.rounds.some((x) => x.position < r.position && x.status !== "paid"))
    throw new HttpError(400, "Earlier rounds must be paid first");

  r.status = "paid";
  r.paidOn = new Date();
  if (cycle.rounds.every((x) => x.status === "paid")) cycle.status = "completed";
  await cycle.save();
  res.json(cycle);
});