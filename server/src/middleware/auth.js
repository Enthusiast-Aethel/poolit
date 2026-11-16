import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Account not found or disabled" });
    }
    // a password change or reset signs out every older session
    if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      return res.status(401).json({ message: "Your password was changed. Please sign in again." });
    }
    // someone on a temporary password can only look at their account and choose a new password
    const path = req.originalUrl.split("?")[0];
    if (user.mustChangePassword && !["/api/auth/password", "/api/auth/me"].includes(path)) {
      return res.status(403).json({ code: "PASSWORD_CHANGE_REQUIRED", message: "Please choose a new password first." });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Chairperson is the only admin
export const adminOnly = (req, res, next) => {
  if (req.user.role !== "chairperson") {
    return res.status(403).json({ message: "Chairperson access only" });
  }
  next();
};
