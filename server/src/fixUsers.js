import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "./models/User.js";

const phone = process.argv[2];
if (!phone) {
  console.error("Usage: node src/fixUsers.js <chairperson phone>   e.g. node src/fixUsers.js 0706009762");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

// 1. Drop the old email index (it was unique but not sparse)
try {
  await User.collection.dropIndex("email_1");
  console.log("Dropped old email index");
} catch (e) {
  console.log("Email index:", e.codeName === "IndexNotFound" ? "already gone" : e.message);
}

// 2. Give the chairperson a phone number (the model normalises it to +254...)
const chair = await User.findOne({ role: "chairperson" });
if (!chair) {
  console.log("No chairperson found. Run: node src/seed.js");
} else {
  chair.phone = phone;
  await chair.save();
  console.log(`Chairperson phone set to ${chair.phone}`);
}

// 3. Other users created before phone became required
const missing = await User.find({ phone: { $in: [null, ""] } }).select("name email role");
if (missing.length) {
  console.log("\nThese users still have no phone number:");
  missing.forEach((u) => console.log(` - ${u.name} (${u.email || "no email"}, ${u.role})`));
  if (process.argv.includes("--delete-incomplete")) {
    await User.deleteMany({ _id: { $in: missing.map((u) => u._id) } });
    console.log("Deleted them (test data).");
  } else {
    console.log("Re-run with --delete-incomplete to remove them if they are only test accounts.");
  }
}

// 4. Rebuild indexes to match the new schema (unique phone, sparse email)
try {
  await User.syncIndexes();
  console.log("\nIndexes updated");
} catch (e) {
  console.log("\nCould not update indexes yet:", e.message);
}

process.exit();