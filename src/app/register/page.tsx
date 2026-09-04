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
  const [role, setRole] = useState<"owner" | "user">("owner");
  const [shopName, setShopName] = useState("");
  const [shopCode, setShopCode] = useState("");
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
    if (role === "owner" && !shopName.trim()) {
      setError(t.register.errorShopNameRequired);
      return;
    }
    if (role === "user" && !shopCode.trim()) {
      setError(t.register.errorShopCodeRequired);
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
      body: JSON.stringify({
        username: username.trim(),
        role,
        shopName: role === "owner" ? shopName.trim() : undefined,
        shopCode: role === "user" ? shopCode.trim() : undefined,
        password,
        confirmPassword,
      }),
    });
    setBusy(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(
        err.error === "duplicate_username"
          ? t.register.errorDuplicate
          : err.error === "duplicate_shop_name"
            ? t.register.errorDuplicateShopName
            : err.error === "shop_name_required"
              ? t.register.errorShopNameRequired
              : err.error === "shop_code_required"
                ? t.register.errorShopCodeRequired
                : err.error === "invalid_shop_code"
                  ? t.register.errorInvalidShopCode
                  : err.error === "password_mismatch"
                    ? t.register.errorMismatch
                    : err.error === "password_too_short"
                      ? t.register.errorTooShort
                      : t.register.errorRequired,
      );
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(1100px_700px_at_50%_-10%,rgba(30,97,240,0.10),transparent)] bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-[0_20px_50px_-20px_rgba(23,23,23,0.18)]">
        <div className="mb-5 text-center">
          <div className="text-lg font-bold">{t.register.title}</div>
          <div className="mt-1 text-xs text-muted">{t.register.step1}</div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2.5">
          <RoleCard
            selected={role === "owner"}
            onClick={() => setRole("owner")}
            title={t.register.roleOwner}
            desc={t.register.roleOwnerDesc}
            icon={
              <path d="M3 9 4 4h16l1 5 M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9 M9 20v-6h6v6" />
            }
          />
          <RoleCard
            selected={role === "user"}
            onClick={() => setRole("user")}
            title={t.register.roleUser}
            desc={t.register.roleUserDesc}
            icon={<path d="M3 6h18v13H3Z M9 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z M13.5 11h4M13.5 14h4" />}
          />
        </div>

        <div className="mb-5 border-t border-line" />
        <div className="mb-3.5 text-xs font-semibold text-muted">{t.register.step2}</div>

        <form onSubmit={submit} className="space-y-3.5">
          {role === "owner" ? (
            <div>
              <label className="label">{t.register.shopName}</label>
              <input
                className="input h-[46px] border-brand ring-2 ring-brand/15"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={t.register.shopNamePlaceholder}
              />
              <Hint text={t.register.shopNameHint} />
            </div>
          ) : (
            <div>
              <label className="label">{t.register.shopCode}</label>
              <input
                className="input h-[46px] uppercase"
                value={shopCode}
                onChange={(e) => setShopCode(e.target.value)}
                placeholder={t.register.shopCodePlaceholder}
              />
              <Hint text={t.register.shopCodeHint} />
            </div>
          )}

          <div>
            <label className="label">{t.register.username}</label>
            <input
              className="input h-[46px]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.register.usernamePlaceholder}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="label">{t.register.password}</label>
              <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" className="h-[46px]" />
            </div>
            <div>
              <label className="label">{t.register.confirmPassword}</label>
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" className="h-[46px]" />
            </div>
          </div>
          <p className="-mt-1.5 text-xs text-muted">{t.register.passwordHint}</p>

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <button className="btn-primary h-[50px] w-full text-base" disabled={busy}>
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

function RoleCard({
  selected,
  onClick,
  title,
  desc,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-[14px] border p-4 text-left transition ${
        selected ? "border-2 border-brand bg-brand/[0.06]" : "border-line bg-surface hover:bg-surface-2"
      }`}
    >
      {selected && (
        <span className="absolute right-2.5 top-2.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-brand">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      )}
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke={selected ? "var(--brand)" : "var(--muted)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon}
      </svg>
      <div className="mt-2.5 text-sm font-bold">{title}</div>
      <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{desc}</div>
    </button>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <div className="mt-1.5 flex items-start gap-1.5">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mt-0.5 shrink-0 text-muted"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
      <span className="text-[11.5px] leading-snug text-muted">{text}</span>
    </div>
  );
}
