import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user?.shopOwnerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = Number((await params).id);
  const existing = await prisma.category.findFirst({ where: { id, ownerId: user.shopOwnerId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.category.delete({ where: { id } }); // products fall back to "no category"
  return NextResponse.json({ ok: true });
}
