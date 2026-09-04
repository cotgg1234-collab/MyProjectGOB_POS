"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/i18n/I18nProvider";
import { money, moneyTip, kFormat, ymd } from "@/lib/format";

type Preset = "daily" | "monthly" | "yearly" | "custom";

type Report = {
  from: string;
  to: string;
  summary: { orders: number; qty: number; sales: number; cost: number; profit: number; discount: number };
  periods: { period: string; orders: number; qty: number; sales: number; cost: number; profit: number }[];
  products: { sku: string; name: string; qty: number; sales: number; profit: number }[];
  sales: { code: string; date: string; items: number; payMethod: string; discount: number; total: number }[];
};

export default function ReportsPage() {
  const { t } = useI18n();
  const now = new Date();

  const [preset, setPreset] = useState<Preset>("daily");
  const [month, setMonth] = useState(ymd(now).slice(0, 7));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [from, setFrom] = useState(ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(ymd(now));
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  const query = useCallback(() => {
    const p = new URLSearchParams({ preset });
    if (preset === "daily") p.set("anchor", month);
    else if (preset === "monthly" || preset === "yearly") p.set("anchor", year);
    else {
      p.set("from", from);
      p.set("to", to);
    }
    return p.toString();
  }, [preset, month, year, from, to]);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?${query()}`);
    setData(await res.json());
    setLoading(false);
  }, [query]);

  useEffect(() => {
    // Re-runs whenever the filter controls change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
  }, [run]);

  function download() {
    // A real anchor click lets the browser handle the Content-Disposition download.
    const a = document.createElement("a");
    a.href = `/api/reports/export?${query()}&format=xlsx`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const periodLabel = (v: string) => (preset === "daily" ? v.slice(8) : preset === "monthly" ? v.slice(5) : v);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold">{t.report.title}</h1>
          <div className="mt-0.5 text-sm text-muted">{t.report.subtitle}</div>
        </div>
        <button className="btn-primary h-[44px] gap-2" onClick={download}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          {t.report.exportExcel}
        </button>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-6">
        <div>
          <span className="label">{t.report.period}</span>
          <div className="flex overflow-hidden rounded-lg border border-line">
            {(["daily", "monthly", "yearly", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-2 text-sm font-medium transition ${
                  preset === p ? "bg-brand text-white" : "text-muted hover:bg-surface-2"
                }`}
              >
                {t.report[p]}
              </button>
            ))}
          </div>
        </div>

        {preset === "daily" && (
          <div>
            <span className="label">{t.report.monthly}</span>
            <input type="month" className="input !w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        )}

        {(preset === "monthly" || preset === "yearly") && (
          <div>
            <span className="label">{t.report.yearly}</span>
            <input type="number" className="input !w-32" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        )}

        {preset === "custom" && (
          <>
            <div>
              <span className="label">{t.report.from}</span>
              <input type="date" className="input !w-44" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <span className="label">{t.report.to}</span>
              <input type="date" className="input !w-44" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        )}

        {loading && <span className="text-xs text-muted">{t.common.loading}</span>}
      </div>

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t.report.sales} value={money(data.summary.sales)} />
            <Stat label={t.report.orders} value={data.summary.orders.toLocaleString()} />
            <Stat label={t.report.qty} value={data.summary.qty.toLocaleString()} />
            <Stat label={t.report.grossProfit} value={money(data.summary.profit)} accent />
          </div>

          <div className="card p-6">
            <h2 className="mb-3 text-sm font-semibold">{t.report.summary}</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.periods} margin={{ left: -12, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period" tickFormatter={periodLabel} fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={kFormat} />
                <Tooltip formatter={moneyTip} />
                <Bar dataKey="sales" fill="#1e61f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="card overflow-x-auto">
              <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">{t.report.summary}</h2>
              <table className="w-full min-w-[420px]">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="th">{t.report.period}</th>
                    <th className="th text-right">{t.report.orders}</th>
                    <th className="th text-right">{t.report.qty}</th>
                    <th className="th text-right">{t.report.sales}</th>
                    <th className="th text-right">{t.report.grossProfit}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map((r) => (
                    <tr key={r.period} className="border-b border-line last:border-0">
                      <td className="td font-medium">{r.period}</td>
                      <td className="td text-right">{r.orders}</td>
                      <td className="td text-right">{r.qty}</td>
                      <td className="td text-right font-semibold">{money(r.sales)}</td>
                      <td className="td text-right text-success">{money(r.profit)}</td>
                    </tr>
                  ))}
                  {!data.periods.length && (
                    <tr>
                      <td className="td py-10 text-center text-muted" colSpan={5}>
                        {"-"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card overflow-x-auto">
              <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">{t.report.byProduct}</h2>
              <table className="w-full min-w-[420px]">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="th">SKU</th>
                    <th className="th">{t.report.byProduct}</th>
                    <th className="th text-right">{t.report.qty}</th>
                    <th className="th text-right">{t.report.sales}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.slice(0, 20).map((p) => (
                    <tr key={p.sku + p.name} className="border-b border-line last:border-0">
                      <td className="td font-mono text-xs">{p.sku}</td>
                      <td className="td">{p.name}</td>
                      <td className="td text-right">{p.qty}</td>
                      <td className="td text-right font-semibold">{money(p.sales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">{t.report.detail}</h2>
            <table className="w-full min-w-[560px]">
              <thead className="bg-surface-2">
                <tr>
                  <th className="th">#</th>
                  <th className="th">{t.report.period}</th>
                  <th className="th text-right">{t.report.qty}</th>
                  <th className="th">{t.pos.payMethod}</th>
                  <th className="th text-right">{t.pos.discount}</th>
                  <th className="th text-right">{t.pos.total}</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.slice(0, 100).map((s) => (
                  <tr key={s.code} className="border-b border-line last:border-0">
                    <td className="td font-mono text-xs">{s.code}</td>
                    <td className="td text-muted">{new Date(s.date).toLocaleString("th-TH")}</td>
                    <td className="td text-right">{s.items}</td>
                    <td className="td">{t.pos[s.payMethod as "cash" | "transfer" | "card"] ?? s.payMethod}</td>
                    <td className="td text-right text-muted">{s.discount ? money(s.discount) : "-"}</td>
                    <td className="td text-right font-semibold">{money(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.sales.length > 100 && (
              <p className="px-4 py-2 text-xs text-muted">
                {data.sales.length.toLocaleString()} — {t.report.exportExcel}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-6">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`mt-1 text-[26px] font-extrabold ${accent ? "text-success" : ""}`}>{value}</div>
    </div>
  );
}
