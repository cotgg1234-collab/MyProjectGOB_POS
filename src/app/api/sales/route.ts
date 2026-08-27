import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type IncomingItem = { productId: number; qty: number };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("take") ?? 20), 100);

  const sales = await prisma.sale.findMany({
    orderBy: { saleDate: "desc" },
    take,
    include: { items: true },
  });
  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const incoming: IncomingItem[] = Array.isArray(body.items) ? body.items : [];
  if (!incoming.length) return NextResponse.json({ error: "empty_cart" }, { status: 400 });

  const products = await prisma.product.findMany({
    where: { id: { in: incoming.map((i) => Number(i.productId)) } },
  });

  const items: { productId: number; name: string; qty: number; unitPrice: number; unitCost: number; lineTotal: number }[] = [];
  for (const line of incoming) {
    const p = products.find((x) => x.id === Number(line.productId));
    const qty = Math.floor(Number(line.qty));
    if (!p) return NextResponse.json({ error: "product_not_found", productId: line.productId }, { status: 400 });
    if (!Number.isInteger(qty) || qty < 1) return NextResponse.json({ error: "bad_qty" }, { status: 400 });
    if (p.stock < qty) {
      return NextResponse.json({ error: "insufficient_stock", product: p.name, stock: p.stock }, { status: 409 });
    }
    items.push({
      productId: p.id,
      name: p.name,
      qty,
      unitPrice: p.price,
      unitCost: p.cost,
      lineTotal: p.price * qty,
    });
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const discount = Math.max(0, Math.min(Number(body.discount) || 0, subtotal));
  const total = subtotal - discount;
  const cost = items.reduce((s, i) => s + i.unitCost * i.qty, 0);
  const payMethod = ["cash", "transfer", "card"].includes(body.payMethod) ? body.payMethod : "cash";
  const received = payMethod === "cash" ? Number(body.received) || total : total;
  if (received < total) return NextResponse.json({ error: "insufficient_payment" }, { status: 400 });

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const lastToday = await prisma.sale.findFirst({
    where: { code: { startsWith: `S${stamp}-` } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const nextSeq = lastToday ? Number(lastToday.code.split("-")[1]) + 1 : 1;

  // Stock deduction and the bill must land together, or not at all.
  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        code: `S${stamp}-${String(nextSeq).padStart(5, "0")}`,
        saleDate: now,
        subtotal,
        discount,
        tax: 0,
        total,
        cost,
        received,
        change: received - total,
        payMethod,
        userId: user.id,
        items: { create: items },
      },
      include: { items: true },
    });

    for (const item of items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.qty } } });
    }

    return created;
  });

  return NextResponse.json(sale, { status: 201 });
}
