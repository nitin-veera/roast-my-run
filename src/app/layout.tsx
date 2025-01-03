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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className={`${outfit.className} bg-zinc-800 overflow-hidden overscroll-none`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
