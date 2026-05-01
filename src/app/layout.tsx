import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "MawiFarm",
  description: "Dashboard web app MawiFarm untuk monitoring kandang, produksi, pakan, dan operasional.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-[#e8f3ee] text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
