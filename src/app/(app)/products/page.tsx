"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n, localName } from "@/i18n/I18nProvider";
import { money } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import ProductImage from "@/components/ProductImage";
import ImageUploader from "@/components/ImageUploader";

type Draft = {
  id?: number;
  sku: string;
  name: string;
  nameEn: string;
  price: string;
  cost: string;
  stock: string;
  lowStock: string;
  categoryId: string;
  imageUrl: string | null;
  active: boolean;
};

const EMPTY: Draft = {
  sku: "",
  name: "",
  nameEn: "",
  price: "",
  cost: "",
  stock: "0",
  lowStock: "5",
  categoryId: "",
  imageUrl: null,
  active: true,
};

export default function ProductsPage() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showCats, setShowCats] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", nameEn: "" });

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
      nameEn: p.nameEn ?? "",
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
      nameEn: draft.nameEn,
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

  async function addCategory() {
    if (!newCat.name.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCat),
    });
    setNewCat({ name: "", nameEn: "" });
    load();
  }

  async function removeCategory(id: number) {
    if (!confirm(t.product.confirmDelete)) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold">{t.product.title}</h1>
        <input
          className="input !w-64"
          placeholder={t.product.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn-ghost" onClick={() => setShowCats(true)}>
          {t.product.manageCategories}
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            setError("");
            setDraft({ ...EMPTY });
          }}
        >
          + {t.product.add}
        </button>
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
              <th className="th text-right">{t.product.stock}</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={`border-b border-line last:border-0 ${p.active ? "" : "opacity-50"}`}>
                <td className="td">
                  <ProductImage src={p.imageUrl} name={p.name} className="h-11 w-11 rounded-lg" />
                </td>
                <td className="td font-mono text-xs">{p.sku}</td>
                <td className="td font-medium">{localName(lang, p.name, p.nameEn)}</td>
                <td className="td text-muted">
                  {p.category ? localName(lang, p.category.name, p.category.nameEn) : "-"}
                </td>
                <td className="td text-right font-semibold">{money(p.price)}</td>
                <td className="td text-right text-muted">{money(p.cost)}</td>
                <td className={`td text-right font-semibold ${p.stock <= p.lowStock ? "text-danger" : ""}`}>
                  {p.stock}
                </td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => edit(p)}>
                      {t.product.edit}
                    </button>
                    <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => remove(p)}>
                      {t.product.delete}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!products.length && (
              <tr>
                <td className="td py-10 text-center text-muted" colSpan={8}>
                  {t.product.noProducts}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <Modal title={draft.id ? t.product.edit : t.product.add} onClose={() => setDraft(null)}>
          <div className="space-y-3">
            <ImageUploader value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />

            <div className="grid grid-cols-2 gap-3">
              <Field label={t.product.sku}>
                <input className="input" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
              </Field>
              <Field label={t.product.category}>
                <select
                  className="input"
                  value={draft.categoryId}
                  onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                >
                  <option value="">-</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {localName(lang, c.name, c.nameEn)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label={t.product.name}>
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label={t.product.nameEn}>
              <input className="input" value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t.product.price}>
                <input className="input" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              </Field>
              <Field label={t.product.cost}>
                <input className="input" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} />
              </Field>
              <Field label={t.product.stock}>
                <input className="input" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
              </Field>
              <Field label={t.product.lowStock}>
                <input
                  className="input"
                  value={draft.lowStock}
                  onChange={(e) => setDraft({ ...draft, lowStock: e.target.value })}
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

      {showCats && (
        <Modal title={t.product.manageCategories} onClose={() => setShowCats(false)}>
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="flex-1">{localName(lang, c.name, c.nameEn)}</span>
                <span className="text-xs text-muted">{c._count?.products ?? 0}</span>
                <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => removeCategory(c.id)}>
                  {t.product.delete}
                </button>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <input
                className="input"
                placeholder="ชื่อหมวดหมู่"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="Category (EN)"
                value={newCat.nameEn}
                onChange={(e) => setNewCat({ ...newCat, nameEn: e.target.value })}
              />
            </div>
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
