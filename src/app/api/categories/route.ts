import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.shopOwnerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { ownerId: user.shopOwnerId },
    orderBy: { id: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.shopOwnerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const exists = await prisma.category.findUnique({
    where: { ownerId_name: { ownerId: user.shopOwnerId, name } },
  });
  if (exists) return NextResponse.json({ error: "duplicate_name" }, { status: 409 });

  const category = await prisma.category.create({
    data: { ownerId: user.shopOwnerId, name, nameEn: body.nameEn ? String(body.nameEn).trim() : null },
  });
  return NextResponse.json(category, { status: 201 });
}
