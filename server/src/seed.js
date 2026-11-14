import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "./models/User.js";
import ContributionType from "./models/ContributionType.js";
import Settings from "./models/Settings.js";

const { MONGO_URI, CHAIR_NAME, CHAIR_PHONE, CHAIR_PASSWORD } = process.env;
if (!MONGO_URI) {
  console.error("MONGO_URI is missing from .env");
  process.exit(1);
}
await mongoose.connect(MONGO_URI);

// Built-in contribution types (safe to run again)
const defaults = [
  { name: "Monthly Contribution", code: "monthly", frequency: "monthly", isSystem: true },
  { name: "Registration Fee", code: "registration", frequency: "one_time", isSystem: true },
  { name: "Welfare", code: "welfare", frequency: "ad_hoc", isSystem: true },
  { name: "Merry-Go-Round", code: "merry_go_round", frequency: "rotational", isSystem: true },
];
for (const t of defaults) {
  await ContributionType.updateOne({ code: t.code }, { $setOnInsert: t }, { upsert: true });
}
await Settings.get(); // creates the chama settings document with defaults

// The chairperson account
if (!(await User.findOne({ role: "chairperson" }))) {
  if (!CHAIR_PHONE || !CHAIR_PASSWORD) {
    console.error("Set CHAIR_PHONE and CHAIR_PASSWORD in .env to create the chairperson account.");
    process.exit(1);
  }
  if (CHAIR_PASSWORD.length < 10) {
    console.error("CHAIR_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }
  await User.create({
    name: CHAIR_NAME || "Chairperson", phone: CHAIR_PHONE, password: CHAIR_PASSWORD,
    role: "chairperson", memberNo: "001",
  });
  console.log("Chairperson created. Sign in with your phone number and the password from .env,");
  console.log("then remove CHAIR_PASSWORD from .env.");
} else {
  console.log("Chairperson already exists");
}
console.log("Seed complete");
process.exit();
