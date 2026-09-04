import { NextResponse } from "next/server";
import { buildReport } from "@/lib/report";
import { resolveRange, type Preset } from "@/lib/range";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.shopOwnerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const preset = (searchParams.get("preset") ?? "daily") as Preset;
  const anchor = searchParams.get("anchor") ?? "";
  const { from, to, granularity } = resolveRange(
    preset,
    anchor,
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
  );

  return NextResponse.json(await buildReport(from, to, granularity, user.shopOwnerId));
}
