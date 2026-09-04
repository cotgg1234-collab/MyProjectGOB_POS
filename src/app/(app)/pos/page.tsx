"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { money } from "@/lib/format";
import type { Category, Product, Sale } from "@/lib/types";
import ProductImage from "@/components/ProductImage";
import Receipt from "@/components/Receipt";

type CartLine = { product: Product; qty: number };

export default function PosPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cat, setCat] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [received, setReceived] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showTip, setShowTip] = useState(true);
  const [showStockPanel, setShowStockPanel] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowTip(localStorage.getItem("pos_tip_dismissed") !== "1");
  }, []);

  function dismissTip() {
    localStorage.setItem("pos_tip_dismissed", "1");
    setShowTip(false);
  }

  async function load() {
    const [p, c] = await Promise.all([
      fetch("/api/products?active=1").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    setProducts(p);
    setCategories(c);
  }

  useEffect(() => {
    // Initial data fetch; the state update happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const outOfStock = useMemo(() => products.filter((p) => p.stock <= 0), [products]);
  const lowStock = useMemo(() => products.filter((p) => p.stock > 0 && p.stock <= p.lowStock), [products]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== null && p.categoryId !== cat) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        (p.nameEn ?? "").toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle)
      );
    });
  }, [products, q, cat]);

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const change = Math.max(0, (Number(received) || 0) - total);

  function add(p: Product) {
    setError("");
    setCart((prev) => {
      const found = prev.find((l) => l.product.id === p.id);
      if (found) {
        if (found.qty >= p.stock) return prev;
        return prev.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      if (p.stock < 1) return prev;
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function setQty(id: number, qty: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === id ? { ...l, qty: Math.min(Math.max(0, qty), l.product.stock) } : l))
        .filter((l) => l.qty > 0),
    );
  }

  function clearCart() {
    setCart([]);
    setDiscount(0);
    setReceived("");
    setError("");
  }

  /** Enter on the search box adds the only match, so a barcode scanner can drive the whole flow. */
  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const exact = products.find((p) => p.sku.toLowerCase() === q.trim().toLowerCase());
    const target = exact ?? (visible.length === 1 ? visible[0] : null);
    if (target) {
      add(target);
      setQ("");
    }
  }

  async function checkout() {
    if (!cart.length) return;
    if ((Number(received) || 0) < total) {
      setError(t.pos.notEnoughMoney);
      return;
    }

    setBusy(true);
    setError("");
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((l) => ({ productId: l.product.id, qty: l.qty })),
        discount,
        received: Number(received) || total,
      }),
    });
    setBusy(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.product ? `${t.pos.outOfStock}: ${err.product}` : (err.error ?? "error"));
      return;
    }

    setLastSale(await res.json());
    clearCart();
    load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <section className="space-y-4">
        <div className="card p-3.5">
          <div className="relative">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute inset-y-0 left-[15px] my-auto text-muted"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="input h-12 bg-surface-2 pl-[46px]"
              placeholder={t.pos.search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onSearchKey}
              autoFocus
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setCat(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                cat === null ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {t.pos.allCategories}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  cat === c.id ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {showTip && (
          <div className="flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand/[0.07] px-3.5 py-2.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2"
              className="mt-0.5 shrink-0"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            <span className="flex-1 text-xs leading-relaxed text-brand-dark">{t.pos.tip}</span>
            <button onClick={dismissTip} className="shrink-0 text-brand" aria-label={t.common.close}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((p) => {
            const out = p.stock < 1;
            return (
              <button
                key={p.id}
                onClick={() => add(p)}
                disabled={out}
                className="card relative overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
              >
                {!out && (
                  <span className="absolute right-2 top-2 z-10 grid h-[26px] w-[26px] place-items-center rounded-full bg-ink-pill shadow-[0_4px_10px_rgba(0,0,0,0.18)]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                )}
                <ProductImage src={p.imageUrl} name={p.name} className="h-28 w-full" />
                <div className="p-3">
                  <div className="line-clamp-2 text-sm font-medium">{p.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-semibold text-brand">{money(p.price)}</span>
                    <span className={`text-xs ${p.stock <= p.lowStock ? "text-danger" : "text-muted"}`}>
                      {out ? t.pos.outOfStock : `${t.pos.stock} ${p.stock}`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="card sticky top-20 flex h-fit max-h-[calc(100vh-6rem)] flex-col p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          {t.pos.cart} <span className="text-muted">({cart.length})</span>
        </h2>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {!cart.length && <p className="py-10 text-center text-sm text-muted">{t.pos.empty}</p>}
          {cart.map((l) => (
            <div key={l.product.id} className="mb-2 flex items-center gap-2 rounded-lg bg-surface-2 p-2">
              <ProductImage src={l.product.imageUrl} name={l.product.name} className="h-10 w-10 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{l.product.name}</div>
                <div className="text-xs text-muted">{money(l.product.price)}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQty(l.product.id, l.qty - 1)}
                  className="h-7 w-7 rounded bg-surface text-lg leading-none"
                >
                  -
                </button>
                <input
                  className="w-10 rounded border border-line bg-surface py-1 text-center text-sm"
                  value={l.qty}
                  onChange={(e) => setQty(l.product.id, Number(e.target.value) || 0)}
                />
                <button
                  onClick={() => setQty(l.product.id, l.qty + 1)}
                  className="h-7 w-7 rounded bg-surface text-lg leading-none"
                >
                  +
                </button>
              </div>
              <div className="w-20 text-right text-sm font-semibold">{money(l.product.price * l.qty)}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
          <Row label={t.pos.subtotal} value={money(subtotal)} />

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">{t.pos.discount}</span>
            <input
              className="input !w-28 !py-1 text-right"
              value={discount || ""}
              placeholder="0"
              onChange={(e) => setDiscount(Math.max(0, Math.min(Number(e.target.value) || 0, subtotal)))}
            />
          </div>

          <div className="flex items-baseline justify-between border-t border-line pt-2">
            <span className="font-bold">{t.pos.total}</span>
            <span className="text-[28px] font-extrabold text-brand">{money(total)}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">{t.pos.received}</span>
            <input
              className="input !w-32 !py-1 text-right"
              value={received}
              placeholder="0"
              onChange={(e) => setReceived(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {[1, 2, 5, 10, 20, 50, 100, 500, 1000].map((n) => (
              <button
                key={n}
                onClick={() => setReceived(String((Number(received) || 0) + n))}
                className="rounded bg-surface-2 px-2 py-1 text-xs hover:bg-line"
              >
                +{n}
              </button>
            ))}
            <button
              onClick={() => setReceived(String(total))}
              className="rounded bg-surface-2 px-2 py-1 text-xs hover:bg-line"
            >
              =
            </button>
          </div>
          <Row label={t.pos.change} value={money(change)} strong />

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={clearCart} className="btn-ghost h-12 flex-1" disabled={!cart.length}>
              {t.pos.clear}
            </button>
            <button onClick={checkout} className="btn-primary h-12 flex-[2] gap-2 text-base" disabled={!cart.length || busy}>
              {!busy && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
              {busy ? t.common.saving : t.pos.pay}
            </button>
          </div>
        </div>
      </aside>

      {lastSale && <Receipt sale={lastSale} onClose={() => setLastSale(null)} />}

      {(outOfStock.length > 0 || lowStock.length > 0) && (
        <div className="fixed bottom-4 left-4 z-40">
          {showStockPanel && (
            <div className="mb-2 max-h-64 w-72 overflow-y-auto rounded-xl border border-line bg-surface p-3 shadow-[0_12px_32px_-8px_rgba(23,23,23,0.25)]">
              {outOfStock.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs">
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="font-bold text-danger">{t.pos.outOfStock}</span>
                </div>
              ))}
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs">
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="font-bold text-warning">{p.stock}</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowStockPanel((v) => !v)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-xs font-semibold shadow-[0_8px_20px_-6px_rgba(23,23,23,0.25)] ${
              outOfStock.length > 0
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-warning/30 bg-warning/10 text-warning"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 2 20h20L12 3Z" />
              <path d="M12 9v5" />
              <path d="M12 17h.01" />
            </svg>
            {outOfStock.length > 0 && (
              <span>
                {t.pos.stockAlertOut} {outOfStock.length} {t.pos.stockAlertUnit}
              </span>
            )}
            {outOfStock.length > 0 && lowStock.length > 0 && <span>·</span>}
            {lowStock.length > 0 && (
              <span>
                {t.pos.stockAlertLow} {lowStock.length} {t.pos.stockAlertUnit}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={strong ? "font-semibold text-success" : ""}>{value}</span>
    </div>
  );
}
