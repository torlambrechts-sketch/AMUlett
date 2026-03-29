import type { Metadata } from "next";
import { ABeeZee, Adamina, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const abeezee = ABeeZee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-learning-sans",
  display: "swap",
});

const admamina = Adamina({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-learning-serif",
  display: "swap",
});

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
    <html lang="nb" suppressHydrationWarning className={[inter.variable, abeezee.variable, admamina.variable].join(" ")}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
