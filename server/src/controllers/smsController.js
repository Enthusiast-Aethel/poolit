import SmsLog from "../models/SmsLog.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { smsConfig, getBalance } from "../services/sms.js";
import { deliver } from "../services/notify.js";
import { runReminders } from "../services/reminders.js";
import { loadStats } from "../utils/stats.js";
import { standing } from "../utils/standing.js";
import { DEFAULT_TEMPLATES, EVENT_FOR, TEMPLATE_LABELS, TEMPLATE_VARS, renderTemplate, smsInfo } from "../utils/smsText.js";

const MAX_RECIPIENTS = 300;

export const status = asyncHandler(async (req, res) => {
  const cfg = smsConfig();
  const settings = await Settings.get();
  res.json({
    configured: cfg.configured, provider: cfg.provider, sandbox: cfg.sandbox, senderId: cfg.from || null,
    balance: await getBalance(),
    enabled: !!settings.sms?.enabled,
    webhookReady: !!process.env.SMS_WEBHOOK_SECRET,
    remindersScheduled: String(process.env.SMS_REMINDERS).toLowerCase() === "on",
  });
});

export const templates = (req, res) =>
  res.json({ defaults: DEFAULT_TEMPLATES, labels: TEMPLATE_LABELS, variables: TEMPLATE_VARS, events: EVENT_FOR });

export const listLogs = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  res.json(await SmsLog.find(filter).populate("member", "name memberNo").sort("-createdAt").limit(limit));
});

// Write one message to many members. {name} becomes each member's first name.
export const broadcast = asyncHandler(async (req, res) => {
  const { audience = "all", memberIds = [] } = req.body;
  const text = String(req.body.message || "").trim();
  if (!text) throw new HttpError(400, "Type the message first");
  if (text.length > 480) throw new HttpError(400, "That message is too long. Keep it under 480 characters.");
  if (!smsConfig().configured)
    throw new HttpError(400, "SMS is not connected yet. See the setup steps at the top of the Messages page.");

  let users = await User.find({ isActive: true, smsOptOut: { $ne: true } }).select("name phone");

  if (audience === "selected") {
    const ids = new Set(memberIds.map(String));
    users = users.filter((u) => ids.has(String(u._id)));
  } else if (audience === "arrears") {
    const [settings, stats] = await Promise.all([Settings.get(), loadStats()]);
    const all = await User.find({ isActive: true }).select("joinDate");
    const behind = new Set(
      all.filter((u) => standing({
        paidByMonth: stats.get(u._id).paidByMonth, joinDate: u.joinDate,
        dueDay: settings.contributionDueDay, monthlyAmount: stats.monthlyAmount,
      }).arrears > 0).map((u) => String(u._id))
    );
    users = users.filter((u) => behind.has(String(u._id)));
  }
  users = users.filter((u) => u.phone);
  if (users.length === 0) throw new HttpError(400, "No members to send to");
  if (users.length > MAX_RECIPIENTS) throw new HttpError(400, `Too many recipients (limit ${MAX_RECIPIENTS} at a time)`);

  const chama = (await Settings.get()).chamaName;
  let sent = 0, failed = 0;
  for (let i = 0; i < users.length; i += 5) {
    const logs = await Promise.all(
      users.slice(i, i + 5).map((u) =>
        deliver({
          to: u.phone, member: u._id, kind: "broadcast", sentBy: req.user._id,
          message: renderTemplate(text, { name: u.name.split(" ")[0], chama }),
        })
      )
    );
    logs.forEach((l) => (l.status === "sent" ? sent++ : failed++));
  }
  res.json({ total: users.length, sent, failed });
});

// A test message to the chairperson's own phone
export const test = asyncHandler(async (req, res) => {
  if (!smsConfig().configured) throw new HttpError(400, "SMS is not connected yet");
  const chama = (await Settings.get()).chamaName;
  const log = await deliver({
    to: req.user.phone, member: req.user._id, kind: "test", sentBy: req.user._id,
    message: `${chama}: This is a test message from PoolIt. SMS is working.`,
  });
  res.json({ status: log.status, error: log.error, to: log.to });
});

export const runNow = asyncHandler(async (req, res) => {
  if (!smsConfig().configured) throw new HttpError(400, "SMS is not connected yet");
  res.json(await runReminders({ force: true }));
});

// Africa's Talking calls this when a message is delivered or fails.
// Set the callback URL in their dashboard to  /api/sms/delivery?token=<SMS_WEBHOOK_SECRET>
export const deliveryReport = asyncHandler(async (req, res) => {
  const secret = process.env.SMS_WEBHOOK_SECRET;
  if (!secret || req.query.token !== secret) return res.status(403).json({ message: "Forbidden" });

  const { id, status: s, failureReason } = req.body || {};
  if (id) {
    const state = String(s || "").toLowerCase();
    const update = state === "success" ? { status: "delivered" }
      : state === "failed" || state === "rejected" ? { status: "failed", error: failureReason || s }
      : null; // Sent / Submitted / Buffered: still on its way
    if (update) await SmsLog.updateOne({ providerId: id }, update);
  }
  res.json({ ok: true });
});

export { smsInfo };
