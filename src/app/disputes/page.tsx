"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Header } from "@/components/Header";
import { CONTRACT_ADDRESS, REGISTRY_ADDRESS } from "@/utils/constants";
import { formatAddress, formatUSDC } from "@/utils/aptos";

export default function DisputesPage() {
  const { account, signAndSubmitTransaction, connected } = useWallet();

  const [invoiceId, setInvoiceId] = useState("");
  const [winner, setWinner] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Raise dispute form
  const [raiseId, setRaiseId] = useState("");
  const [reason, setReason] = useState("");

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !invoiceId || !winner) return;
    setError("");
    setLoading(true);
    setStatus("Submitting resolution...");

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::resolve_dispute`,
          typeArguments: [],
          functionArguments: [REGISTRY_ADDRESS, invoiceId, winner],
        },
      });
      setStatus("Dispute resolved successfully! ✓");
      setInvoiceId("");
      setWinner("");
    } catch (err: any) {
      setError(err?.message || "Resolution failed");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function handleRaiseDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !raiseId || !reason) return;
    setError("");
    setLoading(true);
    setStatus("Raising dispute...");

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::raise_dispute`,
          typeArguments: [],
          functionArguments: [REGISTRY_ADDRESS, raiseId, reason],
        },
      });
      setStatus("Dispute raised! The arbitrator has been notified. ✓");
      setRaiseId("");
      setReason("");
    } catch (err: any) {
      setError(err?.message || "Failed to raise dispute");
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
          <h1 className="font-serif text-4xl mb-2">Disputes</h1>
          <p className="text-[#8888AA] text-sm">
            Raise disputes or resolve them as an arbitrator. Evidence is stored on Shelby.
          </p>
        </div>

        {!connected ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold mb-2">Connect your wallet</h3>
            <p className="text-[#8888AA] text-sm">Connect your Aptos wallet to manage disputes.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Raise Dispute */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#FFB800]/10 flex items-center justify-center text-lg">
                  ⚠️
                </div>
                <h2 className="font-serif text-xl">Raise a Dispute</h2>
              </div>
              <p className="text-xs text-[#8888AA] mb-5 leading-relaxed">
                If you are a vendor or payer on an invoice and have a grievance, you can raise a
                dispute. The designated arbitrator will review and make a binding decision.
              </p>

              <form onSubmit={handleRaiseDispute} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                    Invoice ID *
                  </label>
                  <input
                    className="input-field font-mono"
                    placeholder="e.g. 1"
                    value={raiseId}
                    onChange={(e) => setRaiseId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                    Reason *
                  </label>
                  <textarea
                    className="input-field resize-none"
                    rows={4}
                    placeholder="Describe the issue clearly. This will be recorded on-chain and visible to the arbitrator."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="p-3 rounded-lg bg-[#FFB800]/5 border border-[#FFB800]/20 text-xs text-[#8888AA]">
                  ⚠️ Raising a false dispute may impact your reputation. Only dispute if you have
                  a genuine grievance.
                </div>
                <button
                  type="submit"
                  className="btn-danger w-full"
                  disabled={loading}
                >
                  Raise Dispute
                </button>
              </form>
            </div>

            {/* Resolve Dispute (Arbitrator) */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#A78BFA]/10 flex items-center justify-center text-lg">
                  ⚖️
                </div>
                <h2 className="font-serif text-xl">Resolve Dispute</h2>
              </div>
              <p className="text-xs text-[#8888AA] mb-5 leading-relaxed">
                If you are the designated arbitrator for an invoice, you can review the Shelby
                evidence and make a binding resolution. Your decision will be recorded on-chain
                and affect your reputation score.
              </p>

              <form onSubmit={handleResolve} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                    Invoice ID *
                  </label>
                  <input
                    className="input-field font-mono"
                    placeholder="e.g. 1"
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                    Winner Address *
                  </label>
                  <input
                    className="input-field font-mono text-xs"
                    placeholder="0x... (must be vendor or payer)"
                    value={winner}
                    onChange={(e) => setWinner(e.target.value)}
                  />
                </div>

                <div className="p-4 rounded-lg bg-[#A78BFA]/5 border border-[#A78BFA]/20 text-xs space-y-2">
                  <div className="text-[#A78BFA] font-medium mb-2">Resolution outcomes:</div>
                  <div className="text-[#8888AA]">
                    <strong className="text-[#E8E8F0]">Vendor wins:</strong> Invoice returns to
                    Created status — payer must pay.
                  </div>
                  <div className="text-[#8888AA]">
                    <strong className="text-[#E8E8F0]">Payer wins:</strong> Invoice is cancelled —
                    no payment required.
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full"
                  style={{ background: "#A78BFA" }}
                  disabled={loading}
                >
                  Submit Resolution
                </button>
              </form>
            </div>

            {/* Status messages */}
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

            {/* Process guide */}
            <div className="md:col-span-2 card p-6">
              <h2 className="font-serif text-xl mb-5">Dispute Resolution Process</h2>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  {
                    step: "1",
                    title: "Dispute Raised",
                    desc: "Vendor or payer raises a dispute with a reason. Invoice status changes to Disputed.",
                    color: "#FFB800",
                  },
                  {
                    step: "2",
                    title: "Evidence Submitted",
                    desc: "Both parties can upload evidence documents to Shelby. The arbitrator reviews the Shelby URL.",
                    color: "#60A5FA",
                  },
                  {
                    step: "3",
                    title: "Arbitrator Reviews",
                    desc: "The designated arbitrator fetches evidence from Shelby and makes a decision.",
                    color: "#A78BFA",
                  },
                  {
                    step: "4",
                    title: "Resolution",
                    desc: "Decision is recorded on-chain. Arbitrator reputation is updated based on outcome.",
                    color: "#00FF94",
                  },
                ].map((item) => (
                  <div key={item.step} className="relative">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mb-3"
                      style={{ background: `${item.color}15`, color: item.color }}
                    >
                      {item.step}
                    </div>
                    <h3 className="font-medium text-sm mb-1.5">{item.title}</h3>
                    <p className="text-xs text-[#8888AA] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
