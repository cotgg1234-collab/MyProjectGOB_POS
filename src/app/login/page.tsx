"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [username, setUsername] = useState("admin");
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
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand/10 via-background to-background px-4">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-6">
          <div className="font-semibold">{t.login.title}</div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t.login.username}</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">{t.login.password}</label>
            <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" />
          </div>

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? t.common.loading : t.login.submit}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {t.login.noAccount}{" "}
          <Link href="/register" className="font-semibold text-brand hover:underline">
            {t.login.registerLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
