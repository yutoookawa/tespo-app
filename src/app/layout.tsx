import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tespo-app.vercel.app"),
  title: "テスターズフィールド (Testers Field) | 個人開発者のGoogle Playクローズドテスト相互支援",
  description: "Google Playのアプリ公開に必要な「12人以上・14日間のクローズドテスト」を個人開発者同士で助け合うプラットフォームです。",
  openGraph: {
    title: "テスターズフィールド (Testers Field)",
    description: "個人開発者同士でGoogle Playの14日間クローズドテストを助け合う相互プラットフォーム",
    url: "https://tespo-app.vercel.app",
    siteName: "テスターズフィールド",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "テスターズフィールド",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "テスターズフィールド (Testers Field)",
    description: "個人開発者同士でGoogle Playの14日間クローズドテストを助け合う相互プラットフォーム",
    images: ["/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-slate-900 bg-slate-50`}
      >
        {children}
      </body>
    </html>
  );
}