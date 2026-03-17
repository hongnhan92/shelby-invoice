"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Link from "next/link";
import { Header } from "@/components/Header";

const FEATURES = [
  {
    icon: "📄",
    title: "Create Invoices",
    desc: "Issue USDC invoices with metadata stored on Shelby decentralized storage.",
    href: "/invoices",
    accent: "#00FF94",
  },
  {
    icon: "💱",
    title: "Invoice Marketplace",
    desc: "Buy and sell invoices at a discount. Get paid early, invest in receivables.",
    href: "/marketplace",
    accent: "#60A5FA",
  },
  {
    icon: "⚖️",
    title: "Arbitration",
    desc: "Mint arbitrator NFTs and earn fees resolving payment disputes.",
    href: "/arbitrator",
    accent: "#FFB800",
  },
  {
    icon: "🔍",
    title: "Disputes",
    desc: "View and manage active disputes. Evidence stored immutably on Shelby.",
    href: "/disputes",
    accent: "#A78BFA",
  },
];

const STATS = [
  { label: "Total Invoices", value: "—", mono: true },
  { label: "Volume (USDC)", value: "—", mono: true },
  { label: "Arbitrators", value: "—", mono: true },
  { label: "Disputes Resolved", value: "—", mono: true },
];

export default function HomePage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#1E1E32]">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#1E1E32 1px, transparent 1px), linear-gradient(90deg, #1E1E32 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00FF94]/5 blur-[100px] rounded-full" />

        <div className="relative max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF94]/10 border border-[#00FF94]/20 text-[#00FF94] text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF94] animate-pulse" />
            Live on Aptos Testnet · Powered by Shelby Storage
          </div>

          <h1 className="font-serif text-5xl md:text-7xl tracking-tight mb-6 leading-none">
            Decentralized
            <br />
            <span className="text-[#00FF94]">Invoice Protocol</span>
          </h1>

          <p className="text-[#8888AA] text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Create, pay, and trade invoices on Aptos. Every document stored
            on Shelby — immutable, verifiable, permanent.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/invoices" className="btn-primary text-base px-8 py-3">
              Create Invoice →
            </Link>
            <Link href="/marketplace" className="btn-secondary text-base px-8 py-3">
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-[#1E1E32]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1E1E32]">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-[#080810] px-6 py-5">
                <div
                  className={`text-2xl font-bold mb-1 ${stat.mono ? "font-mono" : ""} text-[#E8E8F0]`}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-[#8888AA] uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="font-serif text-3xl mb-10">
          Everything you need to{" "}
          <span className="text-[#00FF94]">get paid</span>
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="card p-6 group hover:border-[#2A2A42] transition-all hover:-translate-y-1"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: `${f.accent}15` }}
              >
                {f.icon}
              </div>
              <h3
                className="font-semibold mb-2 text-[#E8E8F0] group-hover:text-white transition-colors"
                style={{ color: undefined }}
              >
                {f.title}
              </h3>
              <p className="text-sm text-[#8888AA] leading-relaxed">{f.desc}</p>
              <div
                className="mt-4 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: f.accent }}
              >
                Open →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#1E1E32] bg-[#0E0E1A]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="font-serif text-3xl mb-12 text-center">
            How it <span className="text-[#00FF94]">works</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create Invoice",
                desc: "Vendor creates invoice specifying payer, amount, due date, and an arbitrator address. Metadata is stored on Shelby.",
              },
              {
                step: "02",
                title: "Pay or Dispute",
                desc: "Payer pays in USDC directly on-chain. If there's a problem, either party can raise a dispute for the arbitrator.",
              },
              {
                step: "03",
                title: "Arbitration",
                desc: "Designated arbitrator reviews Shelby evidence and resolves the dispute. Arbitrators earn fees and build reputation.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="font-mono text-5xl font-bold text-[#1E1E32] mb-4 select-none">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                <p className="text-sm text-[#8888AA] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E1E32] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-serif text-sm text-[#8888AA]">
            ShelbyInvoice — Built on Aptos · Stored on Shelby
          </div>
          <div className="flex items-center gap-6 text-xs text-[#44445A]">
            <a
              href="https://docs.shelby.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#8888AA] transition-colors"
            >
              Shelby Docs
            </a>
            <a
              href="https://aptos.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#8888AA] transition-colors"
            >
              Aptos Dev
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
