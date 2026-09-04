import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addDays, endOfDay, startOfDay, ymd } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.shopOwnerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ownerId = user.shopOwnerId;

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const trendStart = startOfDay(addDays(now, -29));

  const [yearSales, lowStock, categories] = await Promise.all([
    prisma.sale.findMany({
      where: { ownerId, saleDate: { gte: new Date(now.getFullYear() - 1, 0, 1) } },
      include: { items: true },
      orderBy: { saleDate: "asc" },
    }),
    prisma.product.findMany({
      where: { ownerId, active: true },
      select: { id: true, sku: true, name: true, nameEn: true, stock: true, lowStock: true },
      orderBy: { stock: "asc" },
      take: 50,
    }),
    prisma.category.findMany({ where: { ownerId }, select: { id: true, name: true, nameEn: true } }),
  ]);

  const productIds = [...new Set(yearSales.flatMap((s) => s.items.map((i) => i.productId).filter(Boolean)))] as number[];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, ownerId },
    select: { id: true, sku: true, name: true, nameEn: true, categoryId: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const sum = (from: Date, to?: Date) => {
    const rows = yearSales.filter((s) => s.saleDate >= from && (!to || s.saleDate <= to));
    const sales = rows.reduce((a, s) => a + s.total, 0);
    const cost = rows.reduce((a, s) => a + s.items.reduce((c, i) => c + i.unitCost * i.qty, 0), 0);
    return { sales, cost, profit: sales - cost, orders: rows.length };
  };

  const today = sum(todayStart);
  const yesterday = sum(startOfDay(addDays(now, -1)), endOfDay(addDays(now, -1)));
  const month = sum(monthStart);
  const lastMonth = sum(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
  );
  const year = sum(yearStart);

  // 30-day trend, including days with no sales so the line has no gaps.
  const trendMap = new Map<string, { date: string; sales: number; orders: number }>();
  for (let d = new Date(trendStart); d <= now; d = addDays(d, 1)) {
    trendMap.set(ymd(d), { date: ymd(d), sales: 0, orders: 0 });
  }
  for (const s of yearSales) {
    if (s.saleDate < trendStart) continue;
    const row = trendMap.get(ymd(s.saleDate));
    if (row) {
      row.sales += s.total;
      row.orders += 1;
    }
  }

  // Top products / category share / hourly pattern, all over the current month.
  const monthRows = yearSales.filter((s) => s.saleDate >= monthStart);
  const topMap = new Map<number, { name: string; nameEn: string | null; qty: number; sales: number }>();
  const catMap = new Map<number | null, { name: string; nameEn: string | null; sales: number }>();
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, sales: 0 }));

  for (const s of monthRows) {
    hours[s.saleDate.getHours()].sales += s.total;
    for (const i of s.items) {
      if (i.productId) {
        const p = productById.get(i.productId);
        const t = topMap.get(i.productId) ?? { name: i.name, nameEn: p?.nameEn ?? null, qty: 0, sales: 0 };
        t.qty += i.qty;
        t.sales += i.lineTotal;
        topMap.set(i.productId, t);

        const catId = p?.categoryId ?? null;
        const cat = categories.find((c) => c.id === catId);
        const c = catMap.get(catId) ?? { name: cat?.name ?? "ไม่ระบุหมวด", nameEn: cat?.nameEn ?? "Uncategorized", sales: 0 };
        c.sales += i.lineTotal;
        catMap.set(catId, c);
      }
    }
  }

  const monthlyCompare = Array.from({ length: 12 }, (_, m) => ({
    month: m + 1,
    sales: 0,
    lastYear: 0,
  }));
  for (const s of yearSales) {
    const y = s.saleDate.getFullYear();
    const m = s.saleDate.getMonth();
    if (y === now.getFullYear()) monthlyCompare[m].sales += s.total;
    else if (y === now.getFullYear() - 1) monthlyCompare[m].lastYear += s.total;
  }

  return NextResponse.json({
    kpi: {
      today: { ...today, prev: yesterday.sales },
      month: { ...month, prev: lastMonth.sales },
      year,
      avgBill: today.orders ? today.sales / today.orders : 0,
    },
    trend: [...trendMap.values()],
    topProducts: [...topMap.values()].sort((a, b) => b.sales - a.sales).slice(0, 10),
    byCategory: [...catMap.values()].sort((a, b) => b.sales - a.sales),
    byHour: hours,
    monthlyCompare,
    lowStock: lowStock.filter((p) => p.stock <= p.lowStock).slice(0, 8),
    recentSales: [...yearSales]
      .reverse()
      .slice(0, 8)
      .map((s) => ({
        code: s.code,
        date: s.saleDate.toISOString(),
        items: s.items.reduce((a, i) => a + i.qty, 0),
        total: s.total,
        payMethod: s.payMethod,
      })),
  });
}
