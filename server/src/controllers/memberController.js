import User from "../models/User.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";

export const listMembers = asyncHandler(async (req, res) => {
  res.json(await User.find().sort("memberNo name"));
});

// Lightweight list so a member can pick guarantors (no personal data)
export const listGuarantorOptions = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true, _id: { $ne: req.user._id } }).select("name memberNo");
  res.json(users);
});

export const getMember = asyncHandler(async (req, res) => {
  const m = await User.findById(req.params.id);
  if (!m) throw new HttpError(404, "Member not found");
  res.json(m);
});

export const updateMember = asyncHandler(async (req, res) => {
  const { name, phone, role, isActive, memberNo, registrationPaid } = req.body;
  const m = await User.findByIdAndUpdate(
    req.params.id,
    { name, phone, role, isActive, memberNo, registrationPaid },
    { new: true, runValidators: true }
  );
  if (!m) throw new HttpError(404, "Member not found");
  res.json(m);
});