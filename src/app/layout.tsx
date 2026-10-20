import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "ショキミツ2",
  description: "株式会社データロジック 見積もり・マスター管理ツール",
  icons: {
    icon: "/shokimitsu2-icon.svg",
    shortcut: "/shokimitsu2-icon.svg",
    apple: "/shokimitsu2-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
