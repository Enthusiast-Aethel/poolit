import jwt from "jsonwebtoken";
import User from "../models/User.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// Only the chairperson creates accounts (see routes)
export const createUser = async (req, res) => {
  const { name, email, phone, password, role, memberNo } = req.body;
  if (await User.findOne({ email })) {
    return res.status(400).json({ message: "Email already in use" });
  }
  const user = await User.create({ name, email, phone, password, role, memberNo });
  res.status(201).json({
    id: user._id, name: user.name, email: user.email, role: user.role, memberNo: user.memberNo,
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  res.json({
    token: signToken(user._id),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

export const me = (req, res) => res.json(req.user);