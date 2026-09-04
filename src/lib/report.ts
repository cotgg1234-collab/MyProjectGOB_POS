import { prisma } from "./db";
import { ymd } from "./format";

export type Granularity = "day" | "month" | "year";

export type PeriodRow = {
  period: string;
  orders: number;
  qty: number;
  sales: number;
  cost: number;
  profit: number;
};

export type ProductRow = {
  sku: string;
  name: string;
  qty: number;
  sales: number;
  profit: number;
};

export type SaleRow = {
  code: string;
  date: string;
  items: number;
  payMethod: string;
  discount: number;
  total: number;
};

export type ReportData = {
  from: string;
  to: string;
  granularity: Granularity;
  summary: { orders: number; qty: number; sales: number; cost: number; profit: number; discount: number };
  periods: PeriodRow[];
  products: ProductRow[];
  sales: SaleRow[];
};

/** Bucket key for a sale date at the requested granularity. */
function periodKey(d: Date, g: Granularity) {
  const iso = ymd(d);
  if (g === "year") return iso.slice(0, 4);
  if (g === "month") return iso.slice(0, 7);
  return iso;
}

export async function buildReport(from: Date, to: Date, granularity: Granularity, ownerId: number): Promise<ReportData> {
  const sales = await prisma.sale.findMany({
    where: { ownerId, saleDate: { gte: from, lte: to } },
    include: { items: true },
    orderBy: { saleDate: "asc" },
  });

  const periods = new Map<string, PeriodRow>();
  const products = new Map<string, ProductRow>();
  const summary = { orders: 0, qty: 0, sales: 0, cost: 0, profit: 0, discount: 0 };
  const saleRows: SaleRow[] = [];

  for (const sale of sales) {
    const qty = sale.items.reduce((s, i) => s + i.qty, 0);
    const cost = sale.items.reduce((s, i) => s + i.unitCost * i.qty, 0);

    summary.orders += 1;
    summary.qty += qty;
    summary.sales += sale.total;
    summary.cost += cost;
    summary.discount += sale.discount;

    const key = periodKey(sale.saleDate, granularity);
    const row = periods.get(key) ?? { period: key, orders: 0, qty: 0, sales: 0, cost: 0, profit: 0 };
    row.orders += 1;
    row.qty += qty;
    row.sales += sale.total;
    row.cost += cost;
    row.profit = row.sales - row.cost;
    periods.set(key, row);

    for (const item of sale.items) {
      const pkey = String(item.productId ?? item.name);
      const p = products.get(pkey) ?? { sku: "-", name: item.name, qty: 0, sales: 0, profit: 0 };
      p.qty += item.qty;
      p.sales += item.lineTotal;
      p.profit += item.lineTotal - item.unitCost * item.qty;
      products.set(pkey, p);
    }

    saleRows.push({
      code: sale.code,
      date: sale.saleDate.toISOString(),
      items: qty,
      payMethod: sale.payMethod,
      discount: sale.discount,
      total: sale.total,
    });
  }

  summary.profit = summary.sales - summary.cost;

  // Fill in SKUs for products that still exist.
  const ids = [...products.keys()].map(Number).filter(Number.isInteger);
  if (ids.length) {
    const found = await prisma.product.findMany({ where: { id: { in: ids }, ownerId }, select: { id: true, sku: true } });
    for (const f of found) {
      const p = products.get(String(f.id));
      if (p) p.sku = f.sku;
    }
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    granularity,
    summary,
    periods: [...periods.values()].sort((a, b) => a.period.localeCompare(b.period)),
    products: [...products.values()].sort((a, b) => b.sales - a.sales),
    sales: saleRows,
  };
}
