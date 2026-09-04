import Shell from "@/components/Shell";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const shop = user
    ? { role: user.role, shopName: user.shopName, shopCode: user.shopCode }
    : null;

  return <Shell shop={shop}>{children}</Shell>;
}
