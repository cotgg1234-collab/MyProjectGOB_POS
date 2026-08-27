"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { money } from "@/lib/format";
import type { Sale } from "@/lib/types";

export default function Receipt({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { t, lang } = useI18n();
  const when = new Date(sale.saleDate);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="card w-full max-w-sm">
        <div className="no-print flex items-center justify-between border-b border-line px-4 py-3">
          <span className="font-semibold text-success">{t.pos.success}</span>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            x
          </button>
        </div>

        <div className="print-area px-5 py-4 text-sm">
          <div className="mb-3 text-center">
            <div className="font-semibold">{t.appName}</div>
            <div className="text-xs text-muted">{t.pos.receipt}</div>
          </div>

          <div className="mb-2 flex justify-between text-xs text-muted">
            <span>{sale.code}</span>
            <span>{when.toLocaleString(lang === "th" ? "th-TH" : "en-GB")}</span>
          </div>

          <div className="border-y border-dashed border-line py-2">
            {sale.items.map((i) => (
              <div key={i.id} className="flex justify-between gap-2 py-0.5">
                <span className="min-w-0 flex-1 truncate">
                  {i.name} <span className="text-muted">x{i.qty}</span>
                </span>
                <span>{money(i.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-0.5 py-2">
            <Line label={t.pos.subtotal} value={money(sale.subtotal)} />
            {sale.discount > 0 && <Line label={t.pos.discount} value={`-${money(sale.discount)}`} />}
            <div className="flex justify-between border-t border-line pt-1 text-base font-semibold">
              <span>{t.pos.total}</span>
              <span>{money(sale.total)}</span>
            </div>
            <Line label={t.pos.payMethod} value={t.pos[sale.payMethod as "cash" | "transfer" | "card"] ?? sale.payMethod} />
            {sale.payMethod === "cash" && (
              <>
                <Line label={t.pos.received} value={money(sale.received)} />
                <Line label={t.pos.change} value={money(sale.change)} />
              </>
            )}
          </div>

          <p className="pt-2 text-center text-xs text-muted">*** Thank you / ขอบคุณที่ใช้บริการ ***</p>
        </div>

        <div className="no-print flex gap-2 border-t border-line px-4 py-3">
          <button onClick={onClose} className="btn-ghost flex-1">
            {t.pos.newSale}
          </button>
          <button onClick={() => window.print()} className="btn-primary flex-1">
            {t.pos.print}
          </button>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
