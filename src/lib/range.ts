import { endOfDay, startOfDay } from "./format";
import type { Granularity } from "./report";

export type Preset = "daily" | "monthly" | "yearly" | "custom";

/**
 * Turn the report controls into a concrete range + bucket size.
 * daily   -> one month of days      (anchor = YYYY-MM)
 * monthly -> one year of months     (anchor = YYYY)
 * yearly  -> the last `span` years  (anchor = YYYY)
 * custom  -> explicit from/to, bucketed by day
 */
export function resolveRange(preset: Preset, anchor: string, from?: string, to?: string) {
  const now = new Date();

  if (preset === "daily") {
    const [y, m] = anchor.split("-").map(Number);
    const year = y || now.getFullYear();
    const month = (m || now.getMonth() + 1) - 1;
    return {
      from: startOfDay(new Date(year, month, 1)),
      to: endOfDay(new Date(year, month + 1, 0)),
      granularity: "day" as Granularity,
    };
  }

  if (preset === "monthly") {
    const year = Number(anchor) || now.getFullYear();
    return {
      from: startOfDay(new Date(year, 0, 1)),
      to: endOfDay(new Date(year, 11, 31)),
      granularity: "month" as Granularity,
    };
  }

  if (preset === "yearly") {
    const year = Number(anchor) || now.getFullYear();
    return {
      from: startOfDay(new Date(year - 4, 0, 1)),
      to: endOfDay(new Date(year, 11, 31)),
      granularity: "year" as Granularity,
    };
  }

  const f = from ? startOfDay(new Date(from)) : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const t = to ? endOfDay(new Date(to)) : endOfDay(now);
  return { from: f, to: t, granularity: "day" as Granularity };
}
