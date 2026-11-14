import Settings from "../models/Settings.js";
import User from "../models/User.js";
import SmsLog from "../models/SmsLog.js";
import { sendViaProvider } from "./sms.js";
import { DEFAULT_TEMPLATES, EVENT_FOR, renderTemplate, smsInfo } from "../utils/smsText.js";

// Built with injectable parts so the logic can be tested without a database or the internet
export function createNotifier({ settingsModel = Settings, userModel = User, logModel = SmsLog, send = sendViaProvider } = {}) {
  // Sends one message and records it in the log. Never throws.
  async function deliver({ to, message, kind = "broadcast", member, dedupeKey, sentBy }) {
    const log = await logModel.create({ to, message, kind, member, dedupeKey, sentBy, segments: smsInfo(message).segments });
    const r = await send({ to, message });
    log.status = r.notConfigured ? "not_sent" : r.ok ? "sent" : "failed";
    log.providerId = r.providerId;
    log.cost = r.cost;
    log.error = r.ok ? undefined : r.error;
    await log.save();
    return log;
  }

  // An automatic message to one member. Returns the log, or null when it was skipped.
  // force = true ignores the on/off switches (used by buttons the chairperson clicks on purpose).
  async function notify(kind, memberId, vars = {}, { dedupeKey, force = false } = {}) {
    const settings = await settingsModel.get();
    const sms = settings.sms || {};
    if (!force) {
      if (!sms.enabled) return null;
      const toggle = EVENT_FOR[kind];
      if (toggle && sms.events?.[toggle] === false) return null;
    }

    const user = await userModel.findById(memberId).select("name phone isActive smsOptOut");
    if (!user || !user.phone || user.smsOptOut) return null;

    if (dedupeKey && (await logModel.findOne({ dedupeKey, to: user.phone }))) return null;

    const resolved = typeof vars === "function" ? await vars() : vars;
    const template = sms.templates?.[kind] || DEFAULT_TEMPLATES[kind];
    if (!template) return null;

    const message = renderTemplate(template, {
      chama: settings.chamaName, name: user.name.split(" ")[0], paybill: settings.paybill, ...resolved,
    });
    return deliver({ to: user.phone, message, kind, member: user._id, dedupeKey });
  }

  // Fire and forget: the money action the chairperson just did must never wait for, or fail because of, an SMS
  const notifyLater = (...args) => {
    notify(...args).catch((e) => console.error("SMS notify failed:", e.message));
  };

  return { deliver, notify, notifyLater };
}

export const { deliver, notify, notifyLater } = createNotifier();
