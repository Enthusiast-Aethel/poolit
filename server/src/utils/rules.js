// Loan eligibility, guarantors and max term
export function loanRequirements({ amount, savings, settings }) {
  const limit = savings * settings.loanMultiplier;

  if (amount > limit) {
    return { allowed: false, reason: `Loan limit is KES ${limit} (${settings.loanMultiplier}x your savings)` };
  }

  const selfGuaranteed = amount <= savings;
  const isSmall = amount <= settings.smallLoanThreshold || selfGuaranteed;

  return {
    allowed: true,
    limit,
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