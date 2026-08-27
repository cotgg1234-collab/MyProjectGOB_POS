import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const categoryId = searchParams.get("categoryId");
  const onlyActive = searchParams.get("active") === "1";

  const products = await prisma.product.findMany({
    where: {
      ...(onlyActive ? { active: true } : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { nameEn: { contains: q } }, { sku: { contains: q } }] } : {}),
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.sku || !body.name) return NextResponse.json({ error: "sku_and_name_required" }, { status: 400 });

  const exists = await prisma.product.findUnique({ where: { sku: String(body.sku).trim() } });
  if (exists) return NextResponse.json({ error: "duplicate_sku" }, { status: 409 });

  const product = await prisma.product.create({
    data: {
      sku: String(body.sku).trim(),
      name: String(body.name).trim(),
      nameEn: body.nameEn ? String(body.nameEn).trim() : null,
      price: Number(body.price) || 0,
      cost: Number(body.cost) || 0,
      stock: Number(body.stock) || 0,
      lowStock: Number(body.lowStock) || 5,
      imageUrl: body.imageUrl || null,
      categoryId: body.categoryId ? Number(body.categoryId) : null,
      active: body.active !== false,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
