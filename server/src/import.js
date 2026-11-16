// Brings the data from the Chama Manager Excel workbook into PoolIt.
//
//   node src/import.js path/to/Chama_Manager.xlsx             check only: nothing is changed
//   node src/import.js path/to/Chama_Manager.xlsx --commit    really import
//
// Other switches:  --allow-sample  (import even though the file looks like the template's dummy data)
//                  --allow-existing-data  (import into a database that already has records)
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import readline from "readline/promises";
import mongoose from "mongoose";
import { parseWorkbook, LayoutError } from "./import/parseWorkbook.js";
import { buildPlan, formatReport, looksLikeSample } from "./import/planImport.js";
import { commitPlan, compareSettings } from "./import/commitPlan.js";
import { mongoStore } from "./import/mongoStore.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (f) => args.includes(f);

if (!file) {
  console.error("Usage: node src/import.js path/to/Chama_Manager.xlsx [--commit]");
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

let raw;
try {
  raw = await parseWorkbook(file);
} catch (e) {
  console.error(e instanceof LayoutError ? e.message : `Could not read the workbook: ${e.message}`);
  process.exit(1);
}

const plan = buildPlan(raw);
console.log(`\nWorkbook: ${file}  (${raw.settings.chamaName || "unnamed chama"}, year ${raw.settings.finYear})\n`);
console.log(formatReport(plan));

const sample = looksLikeSample(plan.members);
if (sample) {
  console.log("\n*** THIS LOOKS LIKE THE TEMPLATE'S SAMPLE DATA ***");
  console.log("The members have pretend phone numbers (like 0712 000 101) and the template's example names.");
  console.log("Importing it would put fake members into your real chama. Use your own filled-in workbook.");
}

if (!flag("--commit")) {
  console.log(plan.errors.length ? "\nCheck only. Fix the problems above in the workbook, then check again." : "\nCheck only: nothing was changed. Add --commit to import.");
  process.exit(plan.errors.length ? 1 : 0);
}
if (plan.errors.length) { console.log("\nNot imported: fix the problems above first."); process.exit(1); }
if (sample && !flag("--allow-sample")) { console.log("\nNot imported. (Add --allow-sample only if you really want the sample members.)"); process.exit(1); }

await mongoose.connect(process.env.MONGO_URI);
try {
  const chair = await mongoStore.chairperson();
  if (!chair) { console.error("\nThere is no chairperson account yet. Run: node src/seed.js"); process.exit(1); }

  const sys = await mongoStore.settings();
  const diffs = compareSettings(plan.workbookSettings, sys);
  if (diffs.length) {
    console.log("\nSETTINGS: the workbook and PoolIt differ (nothing is changed automatically; set them on the Settings screen)");
    diffs.forEach((d) => console.log(`  - ${d.label}: workbook ${d.workbook}, PoolIt ${d.system}`));
    console.log("  Loans keep the interest rate they were given in the workbook.");
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nImport ${plan.summary.members} members and their records into ${new URL(process.env.MONGO_URI.replace(/^mongodb(\+srv)?:/, "http:")).host}? Type IMPORT to continue: `);
  rl.close();
  if (answer.trim() !== "IMPORT") { console.log("Cancelled. Nothing was changed."); process.exit(0); }

  const result = await commitPlan(plan, mongoStore, { actorId: chair._id, allowExistingData: flag("--allow-existing-data") });
  console.log(`\nDone. Created ${result.users} member account(s)${result.linked ? ` and linked ${result.linked} that already existed` : ""}.`);
  console.log(Object.entries(result.created).filter(([, n]) => n).map(([k, n]) => `  ${k}: ${n}`).join("\n"));

  if (result.credentials.length) {
    const name = `import-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    const csv = ["Member No,Name,Phone,Temporary password", ...result.credentials.map((c) => [c.memberNo, `"${c.name}"`, c.phone, c.password].join(","))].join("\n");
    fs.writeFileSync(name, "\ufeff" + csv);
    console.log(`\nSign-in details for the new members are in ${name}.`);
    console.log("Each person must choose their own password at first sign-in. Hand these out privately, then DELETE that file.");
  }
} catch (e) {
  console.error(`\nImport failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
