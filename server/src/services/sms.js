// Sends text messages through Africa's Talking (https://developers.africastalking.com).
// Set these in server/.env:
//   SMS_PROVIDER=africastalking   AT_USERNAME=...   AT_API_KEY=...   AT_SENDER_ID=(optional)
// Use AT_USERNAME=sandbox with your sandbox API key to test without sending real messages.

const HOSTS = { live: "https://api.africastalking.com", sandbox: "https://api.sandbox.africastalking.com" };
const ACCEPTED = new Set([100, 101, 102]); // Processed, Sent, Queued

export function smsConfig(env = process.env) {
  const username = env.AT_USERNAME || "";
  const apiKey = env.AT_API_KEY || "";
  const provider = (env.SMS_PROVIDER || (apiKey ? "africastalking" : "none")).toLowerCase();
  const sandbox = username === "sandbox" || env.AT_ENV === "sandbox";
  return {
    provider, username, apiKey, from: env.AT_SENDER_ID || "", sandbox,
    host: env.AT_HOST || HOSTS[sandbox ? "sandbox" : "live"],
    configured: provider === "africastalking" && !!username && !!apiKey,
  };
}

// Returns { ok, providerId, cost, status, error }. Never throws.
export async function sendViaProvider({ to, message }, { env = process.env, fetchImpl = fetch } = {}) {
  const cfg = smsConfig(env);
  if (!cfg.configured) return { ok: false, notConfigured: true, error: "SMS is not connected yet" };

  try {
    const body = new URLSearchParams({ username: cfg.username, to, message });
    if (cfg.from) body.set("from", cfg.from);

    const res = await fetchImpl(`${cfg.host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey: cfg.apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `Provider replied ${res.status}: ${text.slice(0, 160)}` };

    let json;
    try { json = JSON.parse(text); } catch { return { ok: false, error: "Unreadable reply from the SMS provider" }; }
    const r = json?.SMSMessageData?.Recipients?.[0];
    if (!r) return { ok: false, error: json?.SMSMessageData?.Message || "The provider did not accept the message" };

    const accepted = ACCEPTED.has(Number(r.statusCode));
    return { ok: accepted, providerId: r.messageId, cost: r.cost, status: r.status, error: accepted ? undefined : r.status || `Code ${r.statusCode}` };
  } catch (e) {
    return { ok: false, error: e.name === "TimeoutError" ? "The SMS provider took too long to reply" : e.message };
  }
}

// SMS credit left, e.g. "KES 1250.0000" (or null if it cannot be read)
export async function getBalance({ env = process.env, fetchImpl = fetch } = {}) {
  const cfg = smsConfig(env);
  if (!cfg.configured) return null;
  try {
    const res = await fetchImpl(`${cfg.host}/version1/user?username=${encodeURIComponent(cfg.username)}`, {
      headers: { apiKey: cfg.apiKey, Accept: "application/json" }, signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return (await res.json())?.UserData?.balance ?? null;
  } catch {
    return null;
  }
}
