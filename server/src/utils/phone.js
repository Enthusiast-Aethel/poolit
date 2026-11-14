// 0722 123 456, 722123456, +254722123456 -> +254722123456
export function normalizePhone(input = "") {
  const d = String(input).replace(/[^\d]/g, "");
  if (d.length === 12 && d.startsWith("254")) return `+${d}`;
  if (d.length === 10 && d.startsWith("0")) return `+254${d.slice(1)}`;
  if (d.length === 9 && /^[17]/.test(d)) return `+254${d}`;
  return null;
}