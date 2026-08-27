"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n, localName } from "@/i18n/I18nProvider";
import { money } from "@/lib/format";
import type { Category, Product, Sale } from "@/lib/types";
import ProductImage from "@/components/ProductImage";
import Receipt from "@/components/Receipt";

type CartLine = { product: Product; qty: number };

export default function PosPage() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cat, setCat] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [received, setReceived] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastSale, setLastSale] = useState<Sale | null>(null);

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
  const change = payMethod === "cash" ? Math.max(0, (Number(received) || 0) - total) : 0;

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
    if (payMethod === "cash" && (Number(received) || 0) < total) {
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
        payMethod,
        received: payMethod === "cash" ? Number(received) || total : total,
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
        <div className="card p-3">
          <input
            className="input"
            placeholder={t.pos.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onSearchKey}
            autoFocus
          />
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
                {localName(lang, c.name, c.nameEn)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((p) => {
            const out = p.stock < 1;
            return (
              <button
                key={p.id}
                onClick={() => add(p)}
                disabled={out}
                className="card overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
              >
                <ProductImage src={p.imageUrl} name={p.name} className="h-28 w-full" />
                <div className="p-3">
                  <div className="line-clamp-2 text-sm font-medium">{localName(lang, p.name, p.nameEn)}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-bold text-brand">{money(p.price)}</span>
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
        <h2 className="mb-3 font-semibold">
          {t.pos.cart} <span className="text-muted">({cart.length})</span>
        </h2>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {!cart.length && <p className="py-10 text-center text-sm text-muted">{t.pos.empty}</p>}
          {cart.map((l) => (
            <div key={l.product.id} className="mb-2 flex items-center gap-2 rounded-lg bg-surface-2 p-2">
              <ProductImage src={l.product.imageUrl} name={l.product.name} className="h-10 w-10 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{localName(lang, l.product.name, l.product.nameEn)}</div>
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
            <span className="font-semibold">{t.pos.total}</span>
            <span className="text-2xl font-bold text-brand">{money(total)}</span>
          </div>

          <div>
            <span className="label">{t.pos.payMethod}</span>
            <div className="grid grid-cols-3 gap-1">
              {(["cash", "transfer", "card"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`rounded-lg py-1.5 text-xs font-medium transition ${
                    payMethod === m ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {t.pos[m]}
                </button>
              ))}
            </div>
          </div>

          {payMethod === "cash" && (
            <>
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
                {[20, 50, 100, 500, 1000].map((n) => (
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
            </>
          )}

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={clearCart} className="btn-ghost flex-1" disabled={!cart.length}>
              {t.pos.clear}
            </button>
            <button onClick={checkout} className="btn-primary flex-[2]" disabled={!cart.length || busy}>
              {busy ? t.common.saving : t.pos.pay}
            </button>
          </div>
        </div>
      </aside>

      {lastSale && <Receipt sale={lastSale} onClose={() => setLastSale(null)} />}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={strong ? "font-bold text-success" : ""}>{value}</span>
    </div>
  );
}
