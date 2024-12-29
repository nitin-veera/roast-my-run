import type { Metadata } from "next";
import { Outfit } from 'next/font/google';
import { Analytics } from "@vercel/analytics/react"
import "./globals.css";

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Roast My Run",
  description: "Get your running route roasted by AI - Upload your run and receive a humorous analysis!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={outfit.className}>{children}</body>
    </html>
  );
}
