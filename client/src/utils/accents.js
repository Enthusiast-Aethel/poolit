// Category colours: the same category always gets the same accent (welfare types, expense categories...)
// Full class names are written out so Tailwind includes them.
const ACCENTS = [
  { bar: "bg-accent-blue", chip: "bg-accent-blue-container text-on-accent-blue-container" },
  { bar: "bg-accent-purple", chip: "bg-accent-purple-container text-on-accent-purple-container" },
  { bar: "bg-accent-pink", chip: "bg-accent-pink-container text-on-accent-pink-container" },
  { bar: "bg-accent-amber", chip: "bg-accent-amber-container text-on-accent-amber-container" },
];

export function accentFor(key = "") {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}
