import Settings from "../models/Settings.js";
import User from "../models/User.js";
import Loan from "../models/Loan.js";
import Contribution from "../models/Contribution.js";
import ContributionType from "../models/ContributionType.js";
import { notify } from "./notify.js";
import { pickContributionReminders, pickLoanReminders } from "../utils/reminders.js";

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Texts members who owe this month's contribution or a loan instalment.
// Safe to run more than once a day: the same reminder is never sent twice on the same day.
export async function runReminders({ today = new Date(), force = false } = {}) {
  const settings = await Settings.get();
  const type = await ContributionType.findOne({ code: "monthly" });
  const members = await User.find({ isActive: true }).select("_id joinDate");

  const paid = type
    ? await Contribution.aggregate([
        { $match: { type: type._id, year: today.getFullYear(), month: today.getMonth() + 1 } },
        { $group: { _id: "$member", total: { $sum: "$amount" } } },
      ])
    : [];
  const paidByMember = Object.fromEntries(paid.map((p) => [String(p._id), p.total]));
  const daysBefore = settings.sms?.reminderDaysBefore ?? 3;

  const items = [
    ...pickContributionReminders({
      members, paidByMember, monthlyAmount: type?.amount || 0,
      dueDay: settings.contributionDueDay, daysBefore, today,
    }),
    ...pickLoanReminders({ loans: await Loan.find({ status: "active" }).lean(), daysBefore, today }),
  ];

  let sent = 0, failed = 0, skipped = 0;
  for (const it of items) {
    const log = await notify(it.kind, it.member, it.vars, {
      dedupeKey: `${it.kind}:${it.member}:${it.ref || ""}:${ymd(today)}`, force,
    });
    if (!log) skipped++;
    else if (log.status === "sent") sent++;
    else failed++;
  }
  return { considered: items.length, sent, failed, skipped };
}

// 08:00 Nairobi time is 05:00 UTC (Kenya has no daylight saving)
export function msUntilNextMorning(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next - now;
}

// Turn on with SMS_REMINDERS=on in .env. If your host puts the app to sleep, use the
// "Send reminders now" button on the Messages page instead.
export function startReminderScheduler(env = process.env) {
  if (String(env.SMS_REMINDERS).toLowerCase() !== "on") return false;
  const tick = () => {
    setTimeout(async () => {
      try { console.log("SMS reminders:", await runReminders()); }
      catch (e) { console.error("SMS reminders failed:", e.message); }
      tick();
    }, msUntilNextMorning()).unref?.();
  };
  tick();
  console.log("SMS reminders scheduled for 08:00 Nairobi time every day");
  return true;
}
