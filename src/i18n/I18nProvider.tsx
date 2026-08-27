"use client";

import { dict } from "./dict";

const value = { t: dict.th };

// Thai-only app: no language switching, so this is just a fixed value — kept as a
// hook so call sites don't need to change if translations move back to context later.
export function useI18n() {
  return value;
}
