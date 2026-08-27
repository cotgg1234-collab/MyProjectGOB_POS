import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { I18nProvider } from "@/i18n/I18nProvider";
import "./globals.css";

const thai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "POS System | ระบบขายหน้าร้าน",
  description: "ระบบขายหน้าร้าน พร้อมแดชบอร์ดวิเคราะห์ยอดขายและรายงานส่งออก Excel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${thai.variable} h-full antialiased`}>
      <body className="min-h-full">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
