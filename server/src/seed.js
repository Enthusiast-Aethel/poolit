import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "./models/User.js";
import ContributionType from "./models/ContributionType.js";

await mongoose.connect(process.env.MONGO_URI);
const exists = await User.findOne({ role: "chairperson" });
if (!exists) {
  await User.create({
    name: "Chairperson",
    email: "chair@poolit.test",
    password: "ChangeMe123!",
    role: "chairperson",
  });
  console.log("Chairperson created");
} else {
  console.log("Chairperson already exists");
}

const defaults = [
  { name: "Monthly Contribution", code: "monthly", frequency: "monthly", isSystem: true },
  { name: "Registration Fee", code: "registration", frequency: "one_time", isSystem: true },
  { name: "Welfare", code: "welfare", frequency: "ad_hoc", isSystem: true },
  { name: "Merry-Go-Round", code: "merry_go_round", frequency: "rotational", isSystem: true },
];
for (const t of defaults) {
  await ContributionType.updateOne({ code: t.code }, { $setOnInsert: t }, { upsert: true });
}
console.log("Contribution types seeded");

process.exit();