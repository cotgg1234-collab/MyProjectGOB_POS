"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

const ICONS: Record<string, React.ReactNode> = {
  pos: (
    <path d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8Z M9 8V6a3 3 0 0 1 6 0v2" />
  ),
  dashboard: <path d="M4 19V5M12 19V9M20 19v-6" />,
  products: <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z M3 8l9 5 9-5 M12 13v8" />,
  reports: <path d="M6 2h9l5 5v15H6Z M15 2v5h5 M9 13h6M9 17h6" />,
};

const LINKS = [
  { href: "/pos", key: "pos" },
  { href: "/dashboard", key: "dashboard" },
  { href: "/products", key: "products" },
  { href: "/reports", key: "reports" },
] as const;

type ShopInfo = { role: string; shopName: string | null; shopCode: string | null } | null;

const ShopContext = createContext<ShopInfo>(null);

/** The current user's shop info (name, role, join code), as shown next to the logout button. */
export function useShop() {
  return useContext(ShopContext);
}

function NavIcon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

export default function Shell({ children, shop }: { children: React.ReactNode; shop: ShopInfo }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <ShopContext.Provider value={shop}>
      <div className="flex min-h-screen flex-col">
        <header className="no-print sticky top-0 z-30 h-[72px] border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-4 px-6">
            <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
              {LINKS.map((l) => {
                const active = pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
                      active ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    <NavIcon name={l.key} />
                    {t.nav[l.key]}
                  </Link>
                );
              })}
            </nav>

            {shop && (
              <div className="hidden items-center gap-1.5 rounded-[10px] bg-surface-2 px-3.5 py-2 text-xs text-muted sm:flex">
                <span className="font-bold text-foreground">{shop.shopName}</span>
                <span>·</span>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                  {shop.role === "owner" ? t.nav.roleOwner : t.nav.roleUser}
                </span>
                {shop.shopCode && (
                  <>
                    <span>·</span>
                    <span>
                      {t.nav.shopCode}: <span className="font-mono font-semibold text-foreground">{shop.shopCode}</span>
                    </span>
                  </>
                )}
              </div>
            )}

            <button
              onClick={logout}
              className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 text-xs font-semibold text-foreground transition hover:bg-surface-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              {t.nav.logout}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5">{children}</main>
      </div>
    </ShopContext.Provider>
  );
}
