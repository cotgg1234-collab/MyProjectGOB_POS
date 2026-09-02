"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import PasswordInput from "@/components/PasswordInput";

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password || !confirmPassword) {
      setError(t.register.errorRequired);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.register.errorMismatch);
      return;
    }
    if (password.length < 6) {
      setError(t.register.errorTooShort);
      return;
    }

    setBusy(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password, confirmPassword }),
    });
    setBusy(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(
        err.error === "duplicate_username"
          ? t.register.errorDuplicate
          : err.error === "password_mismatch"
            ? t.register.errorMismatch
            : err.error === "password_too_short"
              ? t.register.errorTooShort
              : t.register.errorRequired,
      );
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand/10 via-background to-background px-4">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-6">
          <div className="font-semibold">{t.register.title}</div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t.register.username}</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">{t.register.password}</label>
            <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" />
          </div>
          <div>
            <label className="label">{t.register.confirmPassword}</label>
            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" />
          </div>

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? t.common.saving : t.register.submit}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {t.register.haveAccount}{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            {t.register.loginLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
