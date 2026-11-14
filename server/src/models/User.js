import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { normalizePhone } from "../utils/phone.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      set: (v) => normalizePhone(v) || v,
      validate: { validator: (v) => /^\+254[17]\d{8}$/.test(v), message: "Enter a valid Kenyan phone number" },
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["chairperson", "vice_chairperson", "secretary", "treasurer", "supervisory", "member"],
      default: "member",
    },
    isActive: { type: Boolean, default: true },
    memberNo: { type: String, unique: true, sparse: true },
    joinDate: { type: Date, default: Date.now },
    registrationPaid: { type: Boolean, default: false },
    smsOptOut: { type: Boolean, default: false }, // does not want text messages
    nationalId: { type: String, trim: true, select: false },
    nextOfKin: { name: String, relationship: String },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model("User", userSchema);
