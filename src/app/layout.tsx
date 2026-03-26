import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMUlett",
  description: "Norwegian labour law compliance workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
