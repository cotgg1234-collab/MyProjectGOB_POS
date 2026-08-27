import ExcelJS from "exceljs";
import { buildReport, type ReportData } from "@/lib/report";
import { resolveRange, type Preset } from "@/lib/range";
import { ymd } from "@/lib/format";

export const dynamic = "force-dynamic";

const HEAD_TH = {
  period: "ช่วงเวลา",
  orders: "จำนวนบิล",
  qty: "จำนวนชิ้น",
  sales: "ยอดขาย (บาท)",
  cost: "ต้นทุน (บาท)",
  profit: "กำไรขั้นต้น (บาท)",
  sku: "รหัสสินค้า",
  name: "ชื่อสินค้า",
  code: "เลขที่บิล",
  date: "วันที่-เวลา",
  pay: "ช่องทางชำระ",
  discount: "ส่วนลด (บาท)",
  total: "ยอดสุทธิ (บาท)",
};

function csvEscape(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(data: ReportData) {
  const lines: string[] = [];
  lines.push(`สรุปยอดขาย,${ymd(new Date(data.from))} ถึง ${ymd(new Date(data.to))}`);
  lines.push("");
  lines.push([HEAD_TH.orders, HEAD_TH.qty, HEAD_TH.sales, HEAD_TH.cost, HEAD_TH.profit].join(","));
  lines.push(
    [data.summary.orders, data.summary.qty, data.summary.sales, data.summary.cost, data.summary.profit]
      .map((n) => (typeof n === "number" ? n.toFixed(2) : n))
      .join(","),
  );
  lines.push("");
  lines.push([HEAD_TH.period, HEAD_TH.orders, HEAD_TH.qty, HEAD_TH.sales, HEAD_TH.cost, HEAD_TH.profit].join(","));
  for (const r of data.periods) {
    lines.push([r.period, r.orders, r.qty, r.sales.toFixed(2), r.cost.toFixed(2), r.profit.toFixed(2)].map(csvEscape).join(","));
  }
  lines.push("");
  lines.push([HEAD_TH.sku, HEAD_TH.name, HEAD_TH.qty, HEAD_TH.sales, HEAD_TH.profit].join(","));
  for (const p of data.products) {
    lines.push([p.sku, p.name, p.qty, p.sales.toFixed(2), p.profit.toFixed(2)].map(csvEscape).join(","));
  }
  // BOM so Excel on Windows opens Thai text correctly.
  return "\uFEFF" + lines.join("\r\n");
}

async function toXlsx(data: ReportData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "POS System";
  wb.created = new Date();

  const money = '#,##0.00';
  const header = (ws: ExcelJS.Worksheet, row: number) => {
    const r = ws.getRow(row);
    r.font = { bold: true, color: { argb: "FFFFFFFF" } };
    r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F6FEB" } };
    r.alignment = { vertical: "middle" };
    r.height = 20;
  };

  const s1 = wb.addWorksheet("สรุป");
  s1.mergeCells("A1:E1");
  s1.getCell("A1").value = `รายงานยอดขาย ${ymd(new Date(data.from))} ถึง ${ymd(new Date(data.to))}`;
  s1.getCell("A1").font = { bold: true, size: 14 };
  s1.addRow([]);
  s1.addRow([HEAD_TH.orders, HEAD_TH.qty, HEAD_TH.sales, HEAD_TH.cost, HEAD_TH.profit]);
  header(s1, 3);
  s1.addRow([data.summary.orders, data.summary.qty, data.summary.sales, data.summary.cost, data.summary.profit]);
  s1.columns.forEach((c, i) => {
    c.width = 18;
    if (i >= 2) c.numFmt = money;
  });

  const s2 = wb.addWorksheet("แยกตามช่วงเวลา");
  s2.addRow([HEAD_TH.period, HEAD_TH.orders, HEAD_TH.qty, HEAD_TH.sales, HEAD_TH.cost, HEAD_TH.profit]);
  header(s2, 1);
  for (const r of data.periods) s2.addRow([r.period, r.orders, r.qty, r.sales, r.cost, r.profit]);
  s2.columns.forEach((c, i) => {
    c.width = i === 0 ? 16 : 16;
    if (i >= 3) c.numFmt = money;
  });
  s2.autoFilter = { from: "A1", to: "F1" };

  const s3 = wb.addWorksheet("แยกตามสินค้า");
  s3.addRow([HEAD_TH.sku, HEAD_TH.name, HEAD_TH.qty, HEAD_TH.sales, HEAD_TH.profit]);
  header(s3, 1);
  for (const p of data.products) s3.addRow([p.sku, p.name, p.qty, p.sales, p.profit]);
  s3.columns.forEach((c, i) => {
    c.width = i === 1 ? 30 : 16;
    if (i >= 3) c.numFmt = money;
  });
  s3.autoFilter = { from: "A1", to: "E1" };

  const s4 = wb.addWorksheet("รายละเอียดบิล");
  s4.addRow([HEAD_TH.code, HEAD_TH.date, HEAD_TH.qty, HEAD_TH.pay, HEAD_TH.discount, HEAD_TH.total]);
  header(s4, 1);
  for (const s of data.sales) {
    s4.addRow([s.code, new Date(s.date), s.items, s.payMethod, s.discount, s.total]);
  }
  s4.columns.forEach((c, i) => {
    c.width = 20;
    if (i === 1) c.numFmt = "yyyy-mm-dd hh:mm";
    if (i >= 4) c.numFmt = money;
  });
  s4.autoFilter = { from: "A1", to: "F1" };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const preset = (searchParams.get("preset") ?? "daily") as Preset;
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const { from, to, granularity } = resolveRange(
    preset,
    searchParams.get("anchor") ?? "",
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
  );

  const data = await buildReport(from, to, granularity);
  const filename = `sales-${preset}-${ymd(from)}_${ymd(to)}.${format}`;

  if (format === "csv") {
    return new Response(toCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const buf = await toXlsx(data);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
