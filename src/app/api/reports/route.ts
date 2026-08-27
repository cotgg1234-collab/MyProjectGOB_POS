import { NextResponse } from "next/server";
import { buildReport } from "@/lib/report";
import { resolveRange, type Preset } from "@/lib/range";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const preset = (searchParams.get("preset") ?? "daily") as Preset;
  const anchor = searchParams.get("anchor") ?? "";
  const { from, to, granularity } = resolveRange(
    preset,
    anchor,
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
  );

  return NextResponse.json(await buildReport(from, to, granularity));
}
