export const fullDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// yyyy-mm-dd in the user's local time (for <input type="date">)
export const isoDate = (d = new Date()) => {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

// 2500 -> 2.5k, 1250000 -> 1.25M
export const compactKes = (n = 0) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : `${Math.round(n)}`;
