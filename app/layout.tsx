import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TurboDock",
  description: "Docker Management Dashboard by TurboDock",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-surface text-on-surface antialiased">{children}</body>
    </html>
  );
}
