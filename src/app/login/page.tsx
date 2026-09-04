"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setBusy(false);
    if (!res.ok) {
      setError(t.login.error);
      return;
    }
    router.replace("/pos");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(1100px_700px_at_50%_-10%,rgba(30,97,240,0.10),transparent)] bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-9 shadow-[0_20px_50px_-20px_rgba(23,23,23,0.18)]">
        <div className="mb-6 text-center">
          <div className="text-xl font-bold leading-tight">{t.login.title}</div>
          <div className="mt-1 text-sm text-muted">{t.login.subtitle}</div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t.login.username}</label>
            <div className="relative">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-muted"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
              </svg>
              <input
                className="input h-12 pl-10"
                placeholder={t.login.usernamePlaceholder}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="label">{t.login.password}</label>
            <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" withIcon className="h-12" />
          </div>

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <button className="btn-primary h-[50px] w-full text-base" disabled={busy}>
            {busy ? t.common.loading : t.login.submit}
          </button>

          <Link
            href="/register"
            className="flex h-12 items-center justify-center gap-2 rounded-[10px] border border-dashed border-line text-sm font-semibold text-foreground transition hover:bg-surface-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t.login.noAccount}
          </Link>
        </form>
      </div>
    </div>
  );
}
