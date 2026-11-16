import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { normalizePhone } from "../utils/phone.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

export const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone,
  memberNo: u.memberNo, role: u.role, joinDate: u.joinDate, mustChangePassword: !!u.mustChangePassword,
});

// One more than the highest member number, keeping the style already in use (001, M011, ...)
async function nextMemberNo() {
  const all = await User.find({ memberNo: { $exists: true, $ne: null } }).select("memberNo").lean();
  let best = { n: 0, prefix: "", width: 3 };
  for (const u of all) {
    const m = /^([A-Za-z]*)(\d+)$/.exec(u.memberNo);
    if (m && Number(m[2]) >= best.n) best = { n: Number(m[2]), prefix: m[1], width: Math.max(3, m[2].length) };
  }
  return `${best.prefix}${String(best.n + 1).padStart(best.width, "0")}`;
}

// Chairperson only (see routes). Leave password empty to get a temporary one back.
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, role, nationalId, nextOfKin } = req.body;
  let { password, memberNo } = req.body;

  const normalized = normalizePhone(phone);
  if (!name?.trim()) throw new HttpError(400, "Name is required");
  if (!normalized) throw new HttpError(400, "Enter a valid Kenyan phone number");

  const clash = await User.findOne({
    $or: [{ phone: normalized }, ...(email ? [{ email: email.toLowerCase() }] : []), ...(memberNo ? [{ memberNo }] : [])],
  });
  if (clash) throw new HttpError(400, "Phone, email or member number already in use");

  const generated = !password;
  if (generated) password = crypto.randomBytes(6).toString("base64url");
  memberNo = memberNo || (await nextMemberNo());

  const user = await User.create({
    name, email: email || undefined, phone: normalized, password, role, memberNo,
    nationalId: nationalId || undefined,
    nextOfKin: nextOfKin?.name ? nextOfKin : undefined,
    mustChangePassword: true, // they choose their own at first sign-in
  });
  res.status(201).json({ ...publicUser(user), ...(generated && { temporaryPassword: password }) });
});

// identifier = phone number, member number or email
export const login = asyncHandler(async (req, res) => {
  const raw = String(req.body.identifier ?? req.body.email ?? "").trim();
  const { password } = req.body;
  if (!raw || !password)
    throw new HttpError(400, "Enter your phone number, member number or email, and your password");

  const phone = normalizePhone(raw);
  const user = await User.findOne({
    $or: [{ email: raw.toLowerCase() }, { memberNo: raw }, ...(phone ? [{ phone }] : [])],
  }).select("+password");

  if (!user || !user.isActive || !(await user.matchPassword(password)))
    throw new HttpError(401, "Wrong phone number, member number or password");

  res.json({ token: signToken(user._id), user: publicUser(user) });
});

export const me = (req, res) => res.json(publicUser(req.user));

// A signed-in person chooses a new password (also used for the forced change after a temporary one)
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new HttpError(400, "Enter your current password and a new one");
  if (newPassword.length < 8) throw new HttpError(400, "The new password must be at least 8 characters");
  if (Buffer.byteLength(newPassword) > 72) throw new HttpError(400, "The new password is too long");
  if (newPassword === currentPassword) throw new HttpError(400, "Choose a password different from the current one");

  const user = await User.findById(req.user._id).select("+password");
  // 400, not 401: a wrong guess must not look like an expired session
  if (!(await user.matchPassword(currentPassword))) throw new HttpError(400, "Your current password is not right");
  // 0712345678, 712345678 and 254712345678 are all "their phone number"
  const tail = String(user.phone || "").replace(/\D/g, "").slice(-9);
  if (tail && [tail, `0${tail}`, `254${tail}`].includes(newPassword.replace(/\D/g, "")))
    throw new HttpError(400, "Do not use your phone number as your password");

  user.password = newPassword;
  user.mustChangePassword = false;
  user.passwordChangedAt = new Date();
  await user.save();
  res.json({ token: signToken(user._id), user: publicUser(user) }); // a fresh session; older ones stop working
});
