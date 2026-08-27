import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const body = await req.json();

  if (body.sku) {
    const clash = await prisma.product.findFirst({ where: { sku: String(body.sku).trim(), NOT: { id } } });
    if (clash) return NextResponse.json({ error: "duplicate_sku" }, { status: 409 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(body.sku !== undefined ? { sku: String(body.sku).trim() } : {}),
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.nameEn !== undefined ? { nameEn: body.nameEn ? String(body.nameEn).trim() : null } : {}),
      ...(body.price !== undefined ? { price: Number(body.price) || 0 } : {}),
      ...(body.cost !== undefined ? { cost: Number(body.cost) || 0 } : {}),
      ...(body.stock !== undefined ? { stock: Number(body.stock) || 0 } : {}),
      ...(body.lowStock !== undefined ? { lowStock: Number(body.lowStock) || 0 } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl || null } : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId ? Number(body.categoryId) : null } : {}),
      ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
    },
  });

  return NextResponse.json(product);
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const sold = await prisma.saleItem.count({ where: { productId: id } });

  // Keep sales history intact: products that have been sold are archived, not deleted.
  if (sold > 0) {
    await prisma.product.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true, archived: true });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true, archived: false });
}
