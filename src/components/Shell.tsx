"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

const LINKS = [
  { href: "/pos", key: "pos", icon: "" },
  { href: "/dashboard", key: "dashboard", icon: "" },
  { href: "/products", key: "products", icon: "" },
  { href: "/reports", key: "reports", icon: "" },
] as const;

export default function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 h-16 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-brand">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white">P</span>
            <span className="hidden sm:inline">{t.appName}</span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {LINKS.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-2 text-base font-normal whitespace-nowrap transition ${
                    active ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <span className="mr-1">{l.icon}</span>
                  {t.nav[l.key]}
                </Link>
              );
            })}
          </nav>

          <button onClick={logout} className="btn-ghost !px-3 !py-1.5 text-xs">
            {t.nav.logout}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
