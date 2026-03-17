"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatAddress } from "@/utils/aptos";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/arbitrator", label: "Arbitrator" },
  { href: "/disputes", label: "Disputes" },
];

export function Header() {
  const pathname = usePathname();
  const { connected, account, connect, disconnect, wallets } = useWallet();

  const handleConnect = async () => {
    const petra = wallets?.find((w) => w.name === "Petra");
    if (petra) {
      await connect(petra.name);
    } else if (wallets && wallets.length > 0) {
      await connect(wallets[0].name);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#1E1E32] bg-[#080810]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/30 flex items-center justify-center">
            <span className="text-[#00FF94] font-mono text-xs font-bold">SI</span>
          </div>
          <span className="font-serif text-lg tracking-tight">
            Shelby<span className="text-[#00FF94]">Invoice</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === link.href
                  ? "bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/20"
                  : "text-[#8888AA] hover:text-[#E8E8F0] hover:bg-[#1E1E32]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Wallet */}
        <div>
          {connected && account ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20">
                <div className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse" />
                <span className="font-mono text-xs text-[#00FF94]">
                  {formatAddress(account.address.toString())}
                </span>
              </div>
              <button
                onClick={disconnect}
                className="btn-secondary text-xs px-3 py-2"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={handleConnect} className="btn-primary text-sm">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
