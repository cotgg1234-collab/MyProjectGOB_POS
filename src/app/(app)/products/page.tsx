"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { money } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import ProductImage from "@/components/ProductImage";
import ImageUploader from "@/components/ImageUploader";
import { useShop } from "@/components/Shell";

type Draft = {
  id?: number;
  sku: string;
  name: string;
  price: string;
  cost: string;
  stock: string;
  lowStock: string;
  categoryId: string;
  imageUrl: string | null;
  active: boolean;
};

/** Strips everything but digits and a single decimal point — blocks letters and "-". */
function sanitizeDecimal(v: string) {
  const cleaned = v.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

/** Strips everything but digits — blocks letters, "-", and ".". */
function sanitizeInt(v: string) {
  return v.replace(/[^0-9]/g, "");
}

const EMPTY: Draft = {
  sku: "",
  name: "",
  price: "",
  cost: "",
  stock: "0",
  lowStock: "5",
  categoryId: "",
  imageUrl: null,
  active: true,
};

export default function ProductsPage() {
  const { t } = useI18n();
  const shop = useShop();
  const isOwner = shop?.role === "owner";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showCats, setShowCats] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [quickCatName, setQuickCatName] = useState("");

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      fetch(`/api/products?q=${encodeURIComponent(q)}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    setProducts(p);
    setCategories(c);
  }, [q]);

  useEffect(() => {
    const id = setTimeout(load, 200);
    return () => clearTimeout(id);
  }, [load]);

  function edit(p: Product) {
    setError("");
    setDraft({
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: String(p.price),
      cost: String(p.cost),
      stock: String(p.stock),
      lowStock: String(p.lowStock),
      categoryId: p.categoryId ? String(p.categoryId) : "",
      imageUrl: p.imageUrl,
      active: p.active,
    });
  }

  async function save() {
    if (!draft) return;
    if (!draft.sku.trim() || !draft.name.trim()) {
      setError(`${t.product.sku} / ${t.product.name}`);
      return;
    }

    setBusy(true);
    setError("");
    const payload = {
      sku: draft.sku,
      name: draft.name,
      price: Number(draft.price) || 0,
      cost: Number(draft.cost) || 0,
      stock: Number(draft.stock) || 0,
      lowStock: Number(draft.lowStock) || 0,
      categoryId: draft.categoryId ? Number(draft.categoryId) : null,
      imageUrl: draft.imageUrl,
      active: draft.active,
    };

    const res = await fetch(draft.id ? `/api/products/${draft.id}` : "/api/products", {
      method: draft.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error === "duplicate_sku" ? `${t.product.sku}: ${draft.sku}` : (err.error ?? "error"));
      return;
    }

    setDraft(null);
    load();
  }

  async function remove(p: Product) {
    if (!confirm(t.product.confirmDelete)) return;
    await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    load();
  }

  async function createCategory(name: string): Promise<Category | null> {
    if (!name.trim()) return null;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function addCategory() {
    if (!(await createCategory(newCatName))) return;
    setNewCatName("");
    load();
  }

  async function addQuickCategory() {
    const created = await createCategory(quickCatName);
    if (!created || !draft) return;
    setCategories((prev) => [...prev, { ...created, _count: { products: 0 } }]);
    setDraft({ ...draft, categoryId: String(created.id) });
    setQuickCatName("");
    setAddingCat(false);
  }

  async function removeCategory(id: number) {
    if (!confirm(t.product.confirmDelete)) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold">{t.product.title}</h1>
          <div className="mt-0.5 text-sm text-muted">
            {t.product.totalPrefix} {products.length} {t.product.totalSuffix}
          </div>
        </div>
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-muted"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="input h-[42px] !w-64 pl-10"
            placeholder={t.product.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {isOwner && (
          <>
            <button className="btn-ghost h-[42px]" onClick={() => setShowCats(true)}>
              {t.product.manageCategories}
            </button>
            <button
              className="btn-primary h-[42px] gap-1.5"
              onClick={() => {
                setError("");
                setDraft({ ...EMPTY });
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t.product.add}
            </button>
          </>
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand/[0.07] px-3.5 py-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
        <span className="flex-1 text-xs leading-relaxed text-brand-dark">{t.product.tip}</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-line bg-surface-2">
            <tr>
              <th className="th w-20">{t.product.image}</th>
              <th className="th">{t.product.sku}</th>
              <th className="th">{t.product.name}</th>
              <th className="th">{t.product.category}</th>
              <th className="th text-right">{t.product.price}</th>
              <th className="th text-right">{t.product.cost}</th>
              <th className="th text-center">{t.product.stock}</th>
              {isOwner && <th className="th"></th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={`border-b border-line last:border-0 ${p.active ? "" : "opacity-50"}`}>
                <td className="td">
                  <ProductImage src={p.imageUrl} name={p.name} className="h-11 w-11 rounded-lg" />
                </td>
                <td className="td font-mono text-xs">{p.sku}</td>
                <td className="td font-medium">{p.name}</td>
                <td className="td">
                  {p.category ? (
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                      {p.category.name}
                    </span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td className="td text-right font-semibold">{money(p.price)}</td>
                <td className="td text-right text-muted">{money(p.cost)}</td>
                <td className="td text-center">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      p.stock <= p.lowStock ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                    }`}
                  >
                    {p.stock}
                  </span>
                </td>
                {isOwner && (
                  <td className="td">
                    <div className="flex justify-end gap-1.5">
                      <button
                        title={t.product.edit}
                        onClick={() => edit(p)}
                        className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-line bg-surface text-muted transition hover:text-foreground"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        title={t.product.delete}
                        onClick={() => remove(p)}
                        className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-line bg-surface text-danger transition hover:bg-danger/5"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16" />
                          <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
                          <path d="M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!products.length && (
              <tr>
                <td className="td py-10 text-center text-muted" colSpan={isOwner ? 8 : 7}>
                  {t.product.noProducts}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isOwner && draft && (
        <Modal title={draft.id ? t.product.edit : t.product.add} onClose={() => setDraft(null)}>
          <div className="space-y-3">
            <ImageUploader value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />

            <div className="grid grid-cols-2 gap-3">
              <Field label={t.product.sku}>
                <input className="input" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
              </Field>
              <Field label={t.product.category}>
                <div className="flex gap-1">
                  <select
                    className="input"
                    value={draft.categoryId}
                    onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                  >
                    <option value="">-</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-ghost !w-10 !px-0 shrink-0"
                    onClick={() => setAddingCat((v) => !v)}
                    title={t.product.newCategory}
                  >
                    +
                  </button>
                </div>
              </Field>
            </div>

            {addingCat && (
              <div className="flex items-end gap-2 rounded-lg bg-surface-2 p-2">
                <div className="flex-1">
                  <span className="label">{t.product.newCategory}</span>
                  <input
                    className="input"
                    placeholder="ชื่อหมวดหมู่"
                    value={quickCatName}
                    onChange={(e) => setQuickCatName(e.target.value)}
                    autoFocus
                  />
                </div>
                <button type="button" className="btn-primary !px-3" onClick={addQuickCategory}>
                  {t.product.save}
                </button>
              </div>
            )}

            <Field label={t.product.name}>
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t.product.price}>
                <input
                  className="input"
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: sanitizeDecimal(e.target.value) })}
                />
              </Field>
              <Field label={t.product.cost}>
                <input
                  className="input"
                  inputMode="decimal"
                  value={draft.cost}
                  onChange={(e) => setDraft({ ...draft, cost: sanitizeDecimal(e.target.value) })}
                />
              </Field>
              <Field label={t.product.stock}>
                <input
                  className="input"
                  inputMode="numeric"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: sanitizeInt(e.target.value) })}
                />
              </Field>
              <Field label={t.product.lowStock}>
                <input
                  className="input"
                  inputMode="numeric"
                  value={draft.lowStock}
                  onChange={(e) => setDraft({ ...draft, lowStock: sanitizeInt(e.target.value) })}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              {t.product.active}
            </label>

            {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button className="btn-ghost flex-1" onClick={() => setDraft(null)}>
                {t.product.cancel}
              </button>
              <button className="btn-primary flex-1" onClick={save} disabled={busy}>
                {busy ? t.common.saving : t.product.save}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {isOwner && showCats && (
        <Modal title={t.product.manageCategories} onClose={() => setShowCats(false)}>
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-muted">{c._count?.products ?? 0}</span>
                <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => removeCategory(c.id)}>
                  {t.product.delete}
                </button>
              </div>
            ))}

            <input
              className="input"
              placeholder="ชื่อหมวดหมู่"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
            <button className="btn-primary w-full" onClick={addCategory}>
              + {t.product.newCategory}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4">
      <div className="card my-auto w-full max-w-lg">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            x
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
