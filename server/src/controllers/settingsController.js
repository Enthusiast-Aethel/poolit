import Settings from "../models/Settings.js";
import ContributionType from "../models/ContributionType.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";

export const getSettings = asyncHandler(async (req, res) => {
  res.json(await Settings.get());
});

export const updateSettings = asyncHandler(async (req, res) => {
  const s = await Settings.get();
  s.set(req.body);
  await s.save();
  res.json(s);
});

export const listTypes = asyncHandler(async (req, res) => {
  res.json(await ContributionType.find().sort("name"));
});

export const createType = asyncHandler(async (req, res) => {
  const { name, amount, frequency } = req.body;
  if (!name) throw new HttpError(400, "Name is required");
  const code = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  res.status(201).json(await ContributionType.create({ name, code, amount, frequency }));
});

export const updateType = asyncHandler(async (req, res) => {
  const { name, amount, frequency, isActive } = req.body; // code never changes
  const t = await ContributionType.findByIdAndUpdate(
    req.params.id, { name, amount, frequency, isActive }, { new: true, runValidators: true }
  );
  if (!t) throw new HttpError(404, "Type not found");
  res.json(t);
});