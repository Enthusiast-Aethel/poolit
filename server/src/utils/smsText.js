// Message wording, placeholders and length maths. Pure functions, no database.

export const DEFAULT_TEMPLATES = {
  contributionReceived: "{chama}: Received KES {amount} for {type}{period}. Your savings are now KES {savings}. Thank you, {name}.",
  repaymentReceived: "{chama}: Loan repayment of KES {amount} received for {loanNo}. Balance: KES {balance}.",
  loanApproved: "{chama}: Your loan {loanNo} of KES {amount} has been approved.",
  loanDisbursed: "{chama}: Loan {loanNo} of KES {amount} has been disbursed. First instalment of KES {instalment} is due {date}.",
  loanRejected: "{chama}: Your loan application of KES {amount} was not approved. {reason}",
  guaranteeRequest: "{chama}: {borrower} asks you to guarantee a loan of KES {amount}. Open PoolIt to agree or decline.",
  fineIssued: "{chama}: A fine of KES {amount} was issued ({reason}). Please clear it with the chairperson.",
  welfarePaid: "{chama}: Your welfare claim {claimNo} of KES {amount} has been paid.",
  welfareRejected: "{chama}: Your welfare request {claimNo} was not approved. {reason}",
  reminderContribution: "{chama}: Hi {name}, your KES {amount} monthly contribution is due on {date}. Paybill {paybill}.",
  overdueContribution: "{chama}: Hi {name}, your KES {amount} contribution was due on {date}. Please pay to avoid a fine. Paybill {paybill}.",
  reminderLoan: "{chama}: Loan {loanNo} instalment of KES {amount} is due on {date}.",
  overdueLoan: "{chama}: Loan {loanNo} instalment of KES {amount} was due on {date}. Please pay to avoid a fine.",
  meetingReminder: "{chama}: Meeting \"{title}\" on {date} at {time}, {venue}. Please attend.",
};

// Which switch on the Messages page controls each automatic message
export const EVENT_FOR = {
  contributionReceived: "contributionReceived",
  repaymentReceived: "repaymentReceived",
  loanApproved: "loanUpdates", loanDisbursed: "loanUpdates", loanRejected: "loanUpdates",
  guaranteeRequest: "guaranteeRequest",
  fineIssued: "fineIssued",
  welfarePaid: "welfareUpdates", welfareRejected: "welfareUpdates",
  reminderContribution: "reminders", overdueContribution: "reminders", reminderLoan: "reminders", overdueLoan: "reminders",
};

// What the chairperson can type in {braces} for each message (shown on the Messages page)
const COMMON = ["chama", "name"];
export const TEMPLATE_VARS = {
  contributionReceived: [...COMMON, "amount", "type", "period", "savings"],
  repaymentReceived: [...COMMON, "amount", "loanNo", "balance"],
  loanApproved: [...COMMON, "loanNo", "amount"],
  loanDisbursed: [...COMMON, "loanNo", "amount", "instalment", "date"],
  loanRejected: [...COMMON, "amount", "reason"],
  guaranteeRequest: [...COMMON, "borrower", "amount"],
  fineIssued: [...COMMON, "amount", "reason"],
  welfarePaid: [...COMMON, "claimNo", "amount"],
  welfareRejected: [...COMMON, "claimNo", "reason"],
  reminderContribution: [...COMMON, "amount", "date", "paybill"],
  overdueContribution: [...COMMON, "amount", "date", "paybill"],
  reminderLoan: [...COMMON, "loanNo", "amount", "date"],
  overdueLoan: [...COMMON, "loanNo", "amount", "date"],
  meetingReminder: [...COMMON, "title", "date", "time", "venue"],
};

export const TEMPLATE_LABELS = {
  contributionReceived: "Contribution received",
  repaymentReceived: "Loan repayment received",
  loanApproved: "Loan approved",
  loanDisbursed: "Loan disbursed",
  loanRejected: "Loan not approved",
  guaranteeRequest: "Guarantee request",
  fineIssued: "Fine issued",
  welfarePaid: "Welfare claim paid",
  welfareRejected: "Welfare claim not approved",
  reminderContribution: "Contribution due soon",
  overdueContribution: "Contribution overdue",
  reminderLoan: "Loan instalment due soon",
  overdueLoan: "Loan instalment overdue",
  meetingReminder: "Meeting reminder (sent by button)",
};

export function renderTemplate(template, vars = {}) {
  return String(template)
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€";

// How many SMS parts a message costs (160 characters in one part, 153 per part after that;
// any character outside the basic set, such as an emoji, drops the limits to 70 and 67)
export function smsInfo(text = "") {
  const chars = [...String(text)];
  let septets = 0;
  let gsm = true;
  for (const c of chars) {
    if (GSM_BASIC.includes(c)) septets += 1;
    else if (GSM_EXT.includes(c)) septets += 2;
    else { gsm = false; break; }
  }
  const length = gsm ? septets : chars.length;
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments = length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi);
  return { length, segments, encoding: gsm ? "GSM-7" : "Unicode" };
}
