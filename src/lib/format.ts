export function money(n: number) {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function num(n: number) {
  return n.toLocaleString("th-TH");
}

/** Local (not UTC) YYYY-MM-DD — reports are read in the shop's own timezone. */
export function ymd(d: Date) {
  const p = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Recharts passes loosely-typed values into formatters. */
export function moneyTip(v: unknown) {
  return money(Number(v) || 0);
}

export function kFormat(v: unknown) {
  const n = Number(v) || 0;
  return Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n));
}
