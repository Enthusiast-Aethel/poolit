import Settings from "../models/Settings.js";
import ContributionType from "../models/ContributionType.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { diffSettings } from "../utils/settingsDiff.js";
import { DEFAULT_TEMPLATES } from "../utils/smsText.js";

const FIELDS = [
  "chamaName", "registrationNumber", "kraPin", "fiscalYearStartMonth", "address", "contactEmail", "contactPhone",
  "bankDetails", "paybill", "contributionDueDay", "loanMultiplier", "interestRate", "smallLoanThreshold",
  "smallLoanMonths", "maxLoanMonths", "guarantorsRequired", "fines", "welfare", "quorumPercent", "sms",
];
const PRIVATE = ["kraPin", "bankDetails"]; // only the chairperson sees these

const pick = (obj) => Object.fromEntries(FIELDS.map((k) => [k, obj[k]]));
const present = (doc, user) => {
  const s = pick(doc.toObject());
  if (user.role !== "chairperson") PRIVATE.forEach((k) => delete s[k]);
  return s;
};

// Everyone can read the chama rules (the member portal shows them); contact/bank details are admin only
export const getSettings = asyncHandler(async (req, res) => {
  res.json(present(await Settings.get(), req.user));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const s = (await Settings.findOne().select("+changeLog")) || (await Settings.create({}));
  const before = pick(s.toObject());

  // text message wording: only known messages, plain text, a sensible length
  if (req.body.sms) {
    const t = req.body.sms.templates || {};
    req.body.sms.templates = Object.fromEntries(
      Object.entries(t).filter(([k, v]) => k in DEFAULT_TEMPLATES && typeof v === "string" && v.trim()).map(([k, v]) => [k, v.trim().slice(0, 320)])
    );
  }

  for (const k of FIELDS) if (req.body[k] !== undefined) s.set(k, req.body[k]);

  const changes = diffSettings(before, pick(s.toObject()));
  if (changes.length) {
    s.changeLog.unshift({ by: req.user._id, byName: req.user.name, changes });
    s.changeLog = s.changeLog.slice(0, 200);
  }
  await s.save(); // runs the schema's range checks
  res.json(present(s, req.user));
});

// "Audit change log": who changed which rule, and when
export const getLog = asyncHandler(async (req, res) => {
  const s = await Settings.findOne().select("+changeLog");
  res.json((s?.changeLog || []).slice(0, 100));
});

export const listTypes = asyncHandler(async (req, res) => {
  res.json(await ContributionType.find().sort("name"));
});

export const createType = asyncHandler(async (req, res) => {
  const { name, amount, frequency } = req.body;
  if (!name?.trim()) throw new HttpError(400, "Name is required");
  const code = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  res.status(201).json(await ContributionType.create({ name: name.trim(), code, amount, frequency }));
});

export const updateType = asyncHandler(async (req, res) => {
  const { name, amount, frequency, isActive } = req.body; // code never changes
  const t = await ContributionType.findByIdAndUpdate(
    req.params.id, { name, amount, frequency, isActive }, { new: true, runValidators: true }
  );
  if (!t) throw new HttpError(404, "Type not found");
  res.json(t);
});
