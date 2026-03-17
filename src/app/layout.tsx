import type { Metadata } from "next";
import { DM_Serif_Display, DM_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShelbyInvoice — Decentralized Invoice Protocol",
  description:
    "Create, pay, and trade invoices on Aptos. Powered by Shelby decentralized storage.",
  openGraph: {
    title: "ShelbyInvoice",
    description: "Decentralized Invoice Protocol on Aptos",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${dmMono.variable} ${dmSans.variable}`}>
      <body className="font-sans bg-[#080810] text-[#E8E8F0] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
