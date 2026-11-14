// LN-2026-001, FN-2026-014 ... a readable reference that restarts each year
export async function nextNo(Model, prefix) {
  const year = new Date().getFullYear();
  const n = await Model.countDocuments({
    createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
  });
  return `${prefix}-${year}-${String(n + 1).padStart(3, "0")}`;
}
