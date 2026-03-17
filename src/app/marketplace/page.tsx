"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Header } from "@/components/Header";
import { CONTRACT_ADDRESS, MARKETPLACE_ADDRESS, REGISTRY_ADDRESS } from "@/utils/constants";
import { formatAddress, formatUSDC, formatDate, parseUSDC } from "@/utils/aptos";

export default function MarketplacePage() {
  const { account, signAndSubmitTransaction, connected } = useWallet();

  const [listForm, setListForm] = useState({ invoice_id: "", price: "" });
  const [buyId, setBuyId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleList(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !listForm.invoice_id || !listForm.price) return;
    setError("");
    setLoading(true);
    setStatus("Listing invoice...");

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_marketplace::list_invoice`,
          typeArguments: [],
          functionArguments: [
            MARKETPLACE_ADDRESS,
            listForm.invoice_id,
            parseUSDC(listForm.price).toString(),
          ],
        },
      });
      setStatus("Invoice listed successfully! ✓");
      setListForm({ invoice_id: "", price: "" });
    } catch (err: any) {
      setError(err?.message || "Failed to list invoice");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !buyId) return;
    setError("");
    setLoading(true);
    setStatus("Purchasing invoice...");

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_marketplace::buy_invoice`,
          typeArguments: [],
          functionArguments: [MARKETPLACE_ADDRESS, buyId, REGISTRY_ADDRESS],
        },
      });
      setStatus("Invoice purchased! You are now the beneficiary. ✓");
      setBuyId("");
    } catch (err: any) {
      setError(err?.message || "Purchase failed");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-4xl mb-2">Marketplace</h1>
          <p className="text-[#8888AA] text-sm">
            Buy invoices at a discount. Sell your receivables for immediate liquidity.
          </p>
        </div>

        {!connected ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold mb-2">Connect your wallet</h3>
            <p className="text-[#8888AA] text-sm">Connect your Aptos wallet to use the marketplace.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* How it works */}
            <div className="md:col-span-2 card p-5 bg-[#00FF94]/5 border-[#00FF94]/20">
              <div className="flex items-start gap-4">
                <div className="text-2xl">💡</div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">How Invoice Factoring Works</h3>
                  <p className="text-xs text-[#8888AA] leading-relaxed">
                    <strong className="text-[#E8E8F0]">Vendors:</strong> List your invoice at a
                    discount to get paid immediately instead of waiting.{" "}
                    <strong className="text-[#E8E8F0]">Buyers:</strong> Purchase invoices below face
                    value. When the payer pays, you receive the full amount — earning the spread.
                  </p>
                </div>
              </div>
            </div>

            {/* List Invoice */}
            <div className="card p-6">
              <h2 className="font-serif text-xl mb-5">List Invoice for Sale</h2>
              <form onSubmit={handleList} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                    Invoice ID *
                  </label>
                  <input
                    className="input-field font-mono"
                    placeholder="e.g. 1"
                    value={listForm.invoice_id}
                    onChange={(e) => setListForm((f) => ({ ...f, invoice_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                    Listing Price (USDC) *
                  </label>
                  <input
                    className="input-field font-mono"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="90.00 (discount from face value)"
                    value={listForm.price}
                    onChange={(e) => setListForm((f) => ({ ...f, price: e.target.value }))}
                  />
                  <p className="text-xs text-[#44445A]">
                    Set lower than invoice amount to attract buyers
                  </p>
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  List Invoice
                </button>
              </form>
            </div>

            {/* Buy Invoice */}
            <div className="card p-6">
              <h2 className="font-serif text-xl mb-5">Buy Listed Invoice</h2>
              <form onSubmit={handleBuy} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                    Listing ID *
                  </label>
                  <input
                    className="input-field font-mono"
                    placeholder="e.g. 1"
                    value={buyId}
                    onChange={(e) => setBuyId(e.target.value)}
                  />
                  <p className="text-xs text-[#44445A]">
                    Enter the listing ID from the marketplace
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#60A5FA]/5 border border-[#60A5FA]/20 text-xs text-[#8888AA] space-y-1.5">
                  <div className="text-[#60A5FA] font-medium mb-2">What happens when you buy:</div>
                  <div>✓ USDC transferred to seller at listing price</div>
                  <div>✓ 0.5% marketplace fee deducted</div>
                  <div>✓ You become the invoice beneficiary</div>
                  <div>✓ Full payment from payer goes to you</div>
                </div>

                <button type="submit" className="btn-primary w-full bg-[#60A5FA] hover:bg-[#3B82F6] text-white" disabled={loading}>
                  Purchase Invoice
                </button>
              </form>
            </div>

            {/* Status */}
            {(error || status) && (
              <div className="md:col-span-2">
                {error && (
                  <div className="p-4 rounded-lg bg-[#FF4444]/10 border border-[#FF4444]/20 text-[#FF4444] text-sm">
                    {error}
                  </div>
                )}
                {status && (
                  <div className="p-4 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20 text-[#00FF94] text-sm">
                    {status}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
