"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/i18n/I18nProvider";
import { money, moneyTip, kFormat } from "@/lib/format";

type Kpi = { sales: number; cost: number; profit: number; orders: number; prev?: number };

type Dash = {
  kpi: { today: Kpi; month: Kpi; year: Kpi; avgBill: number };
  trend: { date: string; sales: number; orders: number }[];
  topProducts: { name: string; nameEn: string | null; qty: number; sales: number }[];
  byCategory: { name: string; nameEn: string | null; sales: number }[];
  byHour: { hour: number; sales: number }[];
  monthlyCompare: { month: number; sales: number; lastYear: number }[];
  lowStock: { id: number; sku: string; name: string; nameEn: string | null; stock: number; lowStock: number }[];
  recentSales: { code: string; date: string; items: number; total: number; payMethod: string }[];
};

const PIE_COLORS = ["#1e61f0", "#16a34a", "#d97706", "#9333ea", "#dc2626", "#0891b2", "#65a30d"];

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="py-20 text-center text-muted">{t.common.loading}</p>;

  const { kpi } = data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t.dash.title}</h1>
        <div className="mt-0.5 text-sm text-muted">{t.dash.subtitle}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.dash.today}
          value={money(kpi.today.sales)}
          sub={`${kpi.today.orders} ${t.dash.bills}`}
          delta={delta(kpi.today.sales, kpi.today.prev ?? 0)}
          deltaLabel={t.dash.vsYesterday}
          accent="brand"
        />
        <KpiCard
          title={t.dash.month}
          value={money(kpi.month.sales)}
          sub={`${kpi.month.orders} ${t.dash.bills}`}
          delta={delta(kpi.month.sales, kpi.month.prev ?? 0)}
          deltaLabel={t.dash.vsLastMonth}
          accent="success"
        />
        <KpiCard title={t.dash.year} value={money(kpi.year.sales)} sub={`${kpi.year.orders} ${t.dash.bills}`} accent="warning" />
        <KpiCard
          title={t.dash.profit}
          value={money(kpi.month.profit)}
          sub={`${t.dash.avgBill} ${money(kpi.avgBill)}`}
          accent="brand"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={t.dash.trend} className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.trend} margin={{ left: -12, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e61f0" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1e61f0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={kFormat} />
              <Tooltip formatter={moneyTip} labelClassName="text-xs" />
              <Area type="monotone" dataKey="sales" stroke="#1e61f0" strokeWidth={2} fill="url(#salesFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t.dash.byCategory}>
          {data.byCategory.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.byCategory.map((c) => ({ name: c.name, value: c.sales }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {data.byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={moneyTip} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty label={t.dash.noData} />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={t.dash.topProducts}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topProducts} layout="vertical" margin={{ left: 90, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" fontSize={11} stroke="#94a3b8" tickFormatter={kFormat} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                fontSize={11}
                stroke="#94a3b8"
                tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
              />
              <Tooltip formatter={moneyTip} />
              <Bar dataKey="sales" fill="#1e61f0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t.dash.byHour}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byHour} margin={{ left: -12, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="hour" fontSize={11} stroke="#94a3b8" tickFormatter={(h: number) => `${h}:00`} />
              <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={kFormat} />
              <Tooltip formatter={moneyTip} labelFormatter={(h) => `${h}:00 - ${h}:59`} />
              <Bar dataKey="sales" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title={t.dash.monthlyCompare}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.monthlyCompare} margin={{ left: -12, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
            <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={kFormat} />
            <Tooltip formatter={moneyTip} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="lastYear" name={String(new Date().getFullYear() - 1)} fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sales" name={String(new Date().getFullYear())} fill="#1e61f0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={t.dash.lowStock}>
          {data.lowStock.length ? (
            <div className="space-y-2">
              {data.lowStock.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg bg-danger/5 px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-muted">{p.sku}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="font-semibold text-danger">{p.stock}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty label={t.dash.noData} />
          )}
        </Panel>

        <Panel title={t.dash.recentSales}>
          <div className="space-y-2">
            {data.recentSales.map((s) => (
              <div key={s.code} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-muted">{s.code}</span>
                <span className="flex-1 text-xs text-muted">
                  {new Date(s.date).toLocaleString("th-TH")}
                </span>
                <span className="text-xs text-muted">x{s.items}</span>
                <span className="font-semibold">{money(s.total)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function delta(current: number, prev: number) {
  if (!prev) return null;
  return ((current - prev) / prev) * 100;
}

function KpiCard({
  title,
  value,
  sub,
  delta,
  deltaLabel,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  delta?: number | null;
  deltaLabel?: string;
  accent: "brand" | "success" | "warning";
}) {
  const bar = { brand: "bg-brand", success: "bg-success", warning: "bg-warning" }[accent];
  return (
    <div className="card relative overflow-hidden p-6">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <div className="pl-2">
        <div className="text-xs font-medium text-muted">{title}</div>
        <div className="mt-1 text-[26px] font-extrabold">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
          {sub}
          {delta != null && (
            <span className={delta >= 0 ? "text-success" : "text-danger"}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% {deltaLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-6 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="grid h-[260px] place-items-center text-sm text-muted">{label}</p>;
}
