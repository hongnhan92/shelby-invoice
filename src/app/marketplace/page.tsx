"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { Header } from "@/components/Header";
import { CONTRACT_ADDRESS, MARKETPLACE_ADDRESS, REGISTRY_ADDRESS } from "@/utils/constants";
import { formatAddress, formatUSDC, formatDate, parseUSDC } from "@/utils/aptos";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

type Listing = {
  id: number;
  invoice_id: number;
  seller: string;
  price: number;
  status: number;
  created_at: number;
  sold_at: number;
  buyer: string;
};

type Invoice = {
  id: number;
  vendor: string;
  payer: string;
  beneficiary: string;
  amount: number;
  due_date: number;
  description: string;
  status: number;
  shelby_url: string;
};

export default function MarketplacePage() {
  const { account, signAndSubmitTransaction, connected } = useWallet();

  const [listings, setListings] = useState<(Listing & { invoice?: Invoice })[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [listForm, setListForm] = useState({ invoice_id: "", price: "" });
  const [buyId, setBuyId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    setLoadingListings(true);
    try {
      const [count] = await aptos.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::invoice_marketplace::listing_count`,
          functionArguments: [MARKETPLACE_ADDRESS],
        },
      });

      const total = Number(count);
      if (total <= 0) return;

      const ids = Array.from({ length: total }, (_, i) => i + 1);
      const results = await Promise.allSettled(
        ids.map((id) =>
          aptos.view({
            payload: {
              function: `${CONTRACT_ADDRESS}::invoice_marketplace::get_listing`,
              functionArguments: [MARKETPLACE_ADDRESS, id.toString()],
            },
          })
        )
      );

      const active: (Listing & { invoice?: Invoice })[] = [];
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const listing = result.value[0] as Listing;
        if (!listing || listing.status !== 0) continue; // only ACTIVE

        // Fetch invoice details for each listing
        try {
          const [inv] = await aptos.view({
            payload: {
              function: `${CONTRACT_ADDRESS}::invoice_registry::get_invoice`,
              functionArguments: [REGISTRY_ADDRESS, listing.invoice_id.toString()],
            },
          });
          active.push({ ...listing, invoice: inv as Invoice });
        } catch {
          active.push({ ...listing });
        }
      }

      active.sort((a, b) => Number(b.id) - Number(a.id));
      setListings(active);
    } catch (e) {
      console.error("Failed to fetch listings:", e);
    } finally {
      setLoadingListings(false);
    }
  }

  async function handleList(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !listForm.invoice_id || !listForm.price) return;
    setError("");
    setLoading(true);
    setStatus("Validating invoice...");

    try {
      // ✅ Validate invoice exists and belongs to caller before listing
      let invoice: Invoice;
      try {
        const [inv] = await aptos.view({
          payload: {
            function: `${CONTRACT_ADDRESS}::invoice_registry::get_invoice`,
            functionArguments: [REGISTRY_ADDRESS, listForm.invoice_id],
          },
        });
        invoice = inv as Invoice;
      } catch {
        setError(`Invoice #${listForm.invoice_id} does not exist.`);
        setStatus("");
        setLoading(false);
        return;
      }

      const userAddr = account.address?.toString();

      // Only current beneficiary can list (vendor originally, or buyer after purchase)
      if (invoice.beneficiary !== userAddr) {
        setError("Only the current beneficiary of this invoice can list it for sale.");
        setStatus("");
        setLoading(false);
        return;
      }

      const statusMessages: Record<number, string> = {
        1: "This invoice has already been paid and cannot be listed.",
        2: "This invoice has been cancelled and cannot be listed.",
        3: "This invoice is under dispute and cannot be listed.",
        4: "This invoice has been resolved and cannot be listed.",
      };

      if (invoice.status !== 0) {
        setError(statusMessages[invoice.status] || "This invoice cannot be listed.");
        setStatus("");
        setLoading(false);
        return;
      }

      setStatus("Listing invoice...");
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
      fetchListings(); // Refresh listings
    } catch (err: any) {
      setError(err?.message || "Failed to list invoice");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(listingId: number) {
    if (!account) return;
    setError("");
    setLoading(true);
    setStatus("Purchasing invoice...");
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_marketplace::buy_invoice`,
          typeArguments: [],
          functionArguments: [MARKETPLACE_ADDRESS, listingId.toString(), REGISTRY_ADDRESS],
        },
      });
      setStatus("Invoice purchased! You are now the beneficiary. ✓");
      fetchListings(); // Refresh listings
    } catch (err: any) {
      setError(err?.message || "Purchase failed");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(listingId: number) {
    if (!account) return;
    setError("");
    setLoading(true);
    setStatus("Cancelling listing...");
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_marketplace::cancel_listing`,
          typeArguments: [],
          functionArguments: [MARKETPLACE_ADDRESS, listingId.toString()],
        },
      });
      setStatus("Listing cancelled. ✓");
      fetchListings();
    } catch (err: any) {
      setError(err?.message || "Cancel failed");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  const userAddr = account?.address?.toString();

  const totalPages = Math.ceil(listings.length / PAGE_SIZE);
  const paginatedListings = listings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
          <div className="space-y-8">
            {/* How it works */}
            <div className="card p-5 bg-[#00FF94]/5 border-[#00FF94]/20">
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

            {/* Status messages */}
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

            {/* Active Listings */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-2xl">Active Listings</h2>
                <button
                  onClick={fetchListings}
                  className="text-xs text-[#8888AA] hover:text-white transition-colors"
                  disabled={loadingListings}
                >
                  {loadingListings ? "Loading..." : "↻ Refresh"}
                </button>
              </div>

              {loadingListings ? (
                <div className="card p-12 text-center border border-[#1E1E32] rounded-xl">
                  <div className="text-[#8888AA] text-sm animate-pulse">Loading listings...</div>
                </div>
              ) : listings.length === 0 ? (
                <div className="card p-12 text-center border border-dashed border-[#1E1E32] rounded-xl">
                  <div className="text-3xl mb-3">🏪</div>
                  <p className="text-[#8888AA] text-sm">No active listings yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {paginatedListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="card p-6 border border-[#1E1E32] bg-[#0B0B15] rounded-xl"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-mono text-xs text-[#44445A] mb-1">
                            Listing #{listing.id} · Invoice #{listing.invoice_id}
                          </div>
                          <div className="text-base font-semibold text-white">
                            {listing.invoice?.description || "—"}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400">
                          Active
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                        <div>
                          <div className="text-xs text-[#44445A] uppercase tracking-wider mb-1">
                            Listing Price
                          </div>
                          <div className="font-mono text-[#00FF94] font-semibold">
                            {formatUSDC(listing.price)} USDC
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#44445A] uppercase tracking-wider mb-1">
                            Face Value
                          </div>
                          <div className="font-mono text-white">
                            {listing.invoice ? `${formatUSDC(listing.invoice.amount)} USDC` : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#44445A] uppercase tracking-wider mb-1">
                            Seller
                          </div>
                          <div className="font-mono text-[#E8E8F0]">
                            {formatAddress(listing.seller)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#44445A] uppercase tracking-wider mb-1">
                            Due Date
                          </div>
                          <div className="text-white">
                            {listing.invoice ? formatDate(listing.invoice.due_date) : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-[#1E1E32]">
                        {listing.seller !== userAddr && (
                          <button
                            className="flex-1 bg-[#60A5FA] hover:bg-[#3B82F6] text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                            onClick={() => handleBuy(listing.id)}
                            disabled={loading}
                          >
                            Buy for {formatUSDC(listing.price)} USDC
                          </button>
                        )}
                        {listing.seller === userAddr && (
                          <button
                            className="flex-1 border border-[#FF4444]/40 text-[#FF4444] hover:bg-[#FF4444]/10 px-4 py-1.5 rounded-lg text-sm transition-all disabled:opacity-50"
                            onClick={() => handleCancel(listing.id)}
                            disabled={loading}
                          >
                            Cancel Listing
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-[#44445A]">
                        Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                        {Math.min(currentPage * PAGE_SIZE, listings.length)} of {listings.length} listings
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-xs rounded-lg border border-[#1E1E32] text-[#8888AA] hover:text-white hover:border-[#3A3A55] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          ← Prev
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                              page === currentPage
                                ? "bg-[#00FF94] text-black border-[#00FF94] font-bold"
                                : "border-[#1E1E32] text-[#8888AA] hover:text-white hover:border-[#3A3A55]"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-xs rounded-lg border border-[#1E1E32] text-[#8888AA] hover:text-white hover:border-[#3A3A55] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* List Invoice form */}
            <div className="grid md:grid-cols-2 gap-6">
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
                    {loading ? "Processing..." : "List Invoice"}
                  </button>
                </form>
              </div>

              <div className="card p-6 bg-[#60A5FA]/5 border-[#60A5FA]/20">
                <h2 className="font-serif text-xl mb-4">How to Buy</h2>
                <div className="space-y-3 text-sm text-[#8888AA]">
                  <div className="flex gap-3">
                    <span className="text-[#60A5FA] font-bold">1.</span>
                    <span>Browse active listings above</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#60A5FA] font-bold">2.</span>
                    <span>Click "Buy" on any listing you want to purchase</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#60A5FA] font-bold">3.</span>
                    <span>Approve the transaction — USDC goes to seller, you become beneficiary</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#60A5FA] font-bold">4.</span>
                    <span>When payer pays the invoice, full amount goes to you</span>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-[#60A5FA]/10 border border-[#60A5FA]/20 text-xs">
                    0.5% marketplace fee applied on purchase
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}