import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A-List Savings Calculator",
  description:
    "Track AMC A-List usage, savings, and Letterboxd sync in a brutalist dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
