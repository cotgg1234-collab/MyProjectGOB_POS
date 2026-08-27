import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const exists = await prisma.category.findUnique({ where: { name } });
  if (exists) return NextResponse.json({ error: "duplicate_name" }, { status: 409 });

  const category = await prisma.category.create({
    data: { name, nameEn: body.nameEn ? String(body.nameEn).trim() : null },
  });
  return NextResponse.json(category, { status: 201 });
}
