import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { normalizePhone } from "../utils/phone.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

export const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone,
  memberNo: u.memberNo, role: u.role, joinDate: u.joinDate,
});

// 001, 002, ... one more than the highest numeric member number
async function nextMemberNo() {
  const all = await User.find({ memberNo: /^\d+$/ }).select("memberNo").lean();
  const max = all.reduce((m, u) => Math.max(m, Number(u.memberNo)), 0);
  return String(max + 1).padStart(3, "0");
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
