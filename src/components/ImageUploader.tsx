"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import ProductImage from "./ProductImage";

export default function ImageUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError("file_too_large (max 5MB)");
      return;
    }

    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setBusy(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "upload_failed");
      return;
    }
    onChange((await res.json()).url);
  }

  return (
    <div>
      <span className="label">{t.product.image}</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 transition ${
          over ? "border-brand bg-brand/5" : "border-line hover:border-brand/50"
        }`}
      >
        <ProductImage src={value} name="?" className="h-20 w-20 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 text-xs text-muted">
          {busy ? t.common.saving : t.product.dropHint}
          {error && <div className="mt-1 text-danger">{error}</div>}
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="btn-ghost !px-2 !py-1 text-xs"
          >
            {t.product.delete}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
