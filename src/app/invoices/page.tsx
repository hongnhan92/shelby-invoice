"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Header } from "@/components/Header";
import { CreateInvoiceForm } from "@/components/CreateInvoiceForm";
import { InvoiceList } from "@/components/InvoiceList";

type Tab = "my-invoices" | "create" | "payable";

export default function InvoicesPage() {
  const { connected } = useWallet();
  const [tab, setTab] = useState<Tab>("my-invoices");

  const TABS: { id: Tab; label: string }[] = [
    { id: "my-invoices", label: "Created by Me" },
    { id: "payable", label: "Payable by Me" },
    { id: "create", label: "+ New Invoice" },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl mb-2">Invoices</h1>
          <p className="text-[#8888AA] text-sm">
            Create and manage on-chain invoices. Metadata stored on Shelby.
          </p>
        </div>

        {!connected ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold mb-2">Connect your wallet</h3>
            <p className="text-[#8888AA] text-sm">
              Connect your Aptos wallet to create or manage invoices.
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-8 bg-[#0E0E1A] rounded-xl p-1 border border-[#1E1E32] w-fit">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    tab === t.id
                      ? "bg-[#00FF94] text-[#080810]"
                      : "text-[#8888AA] hover:text-[#E8E8F0]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "create" && (
              <CreateInvoiceForm onSuccess={() => setTab("my-invoices")} />
            )}
            {tab === "my-invoices" && <InvoiceList mode="vendor" />}
            {tab === "payable" && <InvoiceList mode="payer" />}
          </>
        )}
      </main>
    </div>
  );
}
