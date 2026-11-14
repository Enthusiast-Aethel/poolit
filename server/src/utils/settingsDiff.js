// Flattens nested settings into "fines.lateRepayment.value" -> "5" so changes can be listed
export function flat(obj, prefix = "") {
  return Object.entries(obj || {}).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)
      ? flat(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, JSON.stringify(v ?? null)]]
  );
}

export function diffSettings(before, after) {
  const a = Object.fromEntries(flat(before));
  const b = Object.fromEntries(flat(after));
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((k) => a[k] !== b[k])
    .map((k) => ({ field: k, from: a[k] ?? "—", to: b[k] ?? "—" }));
}
