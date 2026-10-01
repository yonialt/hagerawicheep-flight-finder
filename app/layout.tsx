import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "ሃገራዊ — Cheap Flights Finder for Ethiopian Travelers",
  description:
    "Compare domestic and international flight fares from Addis Ababa. Real prices in ETB, cheapest routes, live airline comparison.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={figtree.className}>{children}</body>
    </html>
  );
}
