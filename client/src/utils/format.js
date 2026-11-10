export const kes = (n = 0) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

export const firstName = (name = "") => name.trim().split(" ")[0];

export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const shortDate = (d) =>
  new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short" });

// Which monthly contributions are missing? A month counts as due once its due day has passed.
export function monthlyStatus({ contributions = [], monthlyAmount = 0, dueDay = 5, joinDate, today = new Date() }) {
  const year = today.getFullYear();
  const joined = joinDate ? new Date(joinDate) : null;
  const startMonth = joined && joined.getFullYear() === year ? joined.getMonth() + 1 : 1;

  const paid = new Set(
    contributions.filter((c) => c.type?.code === "monthly" && c.year === year).map((c) => c.month)
  );

  let dueMonths = 0;
  let unpaidMonths = 0;
  for (let m = startMonth; m <= today.getMonth() + 1; m++) {
    const dueDate = new Date(year, m - 1, dueDay, 23, 59, 59);
    if (today > dueDate || paid.has(m)) {
      dueMonths++;
      if (!paid.has(m)) unpaidMonths++;
    }
  }

  // next payment date: this month if unpaid, otherwise next month
  const thisMonth = today.getMonth() + 1;
  const nextDue = paid.has(thisMonth)
    ? new Date(year, thisMonth, dueDay)
    : new Date(year, thisMonth - 1, dueDay);
  const daysLeft = Math.ceil((nextDue - today) / 86400000);

  return {
    dueMonths, unpaidMonths,
    paidMonths: dueMonths - unpaidMonths,
    arrears: unpaidMonths * monthlyAmount,
    paidThisMonth: paid.has(thisMonth),
    nextDue, daysLeft,
  };
}