import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "./models/User.js";

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
process.exit();