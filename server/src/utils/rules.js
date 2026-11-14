const kes = (n) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

// Loan eligibility. The 3x limit is NET of what the member still owes
// (active loan balances plus loans already requested or approved).
export function loanRequirements({ amount, savings, outstanding = 0, settings }) {
  const limit = savings * settings.loanMultiplier;
  const available = Math.max(0, limit - outstanding);

  if (amount > available) {
    return {
      allowed: false,
      reason: `Available to borrow is ${kes(available)} (${settings.loanMultiplier}x savings of ${kes(savings)}, less ${kes(outstanding)} still owed)`,
    };
  }

  // Self-guarantee only applies to savings that are not already backing other loans
  const unencumbered = Math.max(0, savings - outstanding);
  const selfGuaranteed = amount <= unencumbered;
  const isSmall = amount <= settings.smallLoanThreshold || selfGuaranteed;

  return {
    allowed: true,
    selfGuaranteed,
    guarantorsRequired: selfGuaranteed ? 0 : settings.guarantorsRequired,
    maxTermMonths: isSmall ? settings.smallLoanMonths : settings.maxLoanMonths,
  };
}

// Fine for a rule {mode, value, graceDays}. Returns 0 while inside the grace period.
export function calcFine({ rule, baseAmount = 0, dueDate, today = new Date() }) {
  if (dueDate) {
    const graceEnd = new Date(dueDate);
    graceEnd.setDate(graceEnd.getDate() + rule.graceDays);
    if (today <= graceEnd) return 0;
  }
  if (rule.mode === "percentage") {
    return Math.round(baseAmount * (rule.value / 100) * 100) / 100;
  }
  return rule.value;
}
