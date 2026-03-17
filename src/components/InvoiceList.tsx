"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { formatAddress, formatUSDC, formatDate } from "@/utils/aptos";
import { CONTRACT_ADDRESS, REGISTRY_ADDRESS, STATUS_CONFIG } from "@/utils/constants";
import type { Invoice } from "@/types";

type Props = { mode: "vendor" | "payer" };

// NOTE: In production, fetch invoices from an indexer or event listener.
// For now, this demonstrates the UI with manual lookup.
export function InvoiceList({ mode }: Props) {
  const { account, signAndSubmitTransaction } = useWallet();
  const [invoiceId, setInvoiceId] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState("");

  async function handleLookup() {
    if (!invoiceId.trim()) return;
    setError("");
    setInvoice(null);
    setLoading(true);

    try {
      // In production: call view function on contract
      // const result = await aptos.view({ ... })
      setError("Indexer integration coming soon. Use invoice ID to look up.");
    } catch (err: any) {
      setError(err?.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(id: number) {
    if (!account) return;
    setActionStatus("Paying invoice...");
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::pay_invoice`,
          typeArguments: [],
          functionArguments: [REGISTRY_ADDRESS, id.toString()],
        },
      });
      setActionStatus("Invoice paid! ✓");
    } catch (err: any) {
      setActionStatus("");
      setError(err?.message || "Payment failed");
    }
  }

  async function handleCancel(id: number) {
    if (!account) return;
    setActionStatus("Cancelling invoice...");
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::cancel_invoice`,
          typeArguments: [],
          functionArguments: [REGISTRY_ADDRESS, id.toString()],
        },
      });
      setActionStatus("Invoice cancelled. ✓");
    } catch (err: any) {
      setActionStatus("");
      setError(err?.message || "Cancel failed");
    }
  }

  async function handleDispute(id: number) {
    const reason = prompt("Enter dispute reason:");
    if (!reason) return;
    setActionStatus("Raising dispute...");
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::raise_dispute`,
          typeArguments: [],
          functionArguments: [REGISTRY_ADDRESS, id.toString(), reason],
        },
      });
      setActionStatus("Dispute raised. ✓");
    } catch (err: any) {
      setActionStatus("");
      setError(err?.message || "Dispute failed");
    }
  }

  const statusCfg = invoice ? STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG[0] : null;

  return (
    <div className="space-y-6">
      {/* Lookup */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-[#8888AA] uppercase tracking-wider mb-4">
          Look up Invoice by ID
        </h3>
        <div className="flex gap-3">
          <input
            className="input-field font-mono flex-1"
            placeholder="Invoice ID (e.g. 1)"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          />
          <button className="btn-secondary px-6" onClick={handleLookup} disabled={loading}>
            {loading ? "..." : "Lookup"}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-[#FF4444]/10 border border-[#FF4444]/20 text-[#FF4444] text-sm">
            {error}
          </div>
        )}

        {actionStatus && (
          <div className="mt-3 p-3 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20 text-[#00FF94] text-sm">
            {actionStatus}
          </div>
        )}
      </div>

      {/* Invoice card */}
      {invoice && statusCfg && (
        <div className="card p-6 animate-fade-in">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="font-mono text-xs text-[#44445A] mb-1">Invoice #{invoice.id}</div>
              <h3 className="text-lg font-semibold">{invoice.description}</h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
              {statusCfg.label}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-5">
            {[
              { label: "Amount", value: `${formatUSDC(invoice.amount)} USDC`, mono: true },
              { label: "Due Date", value: formatDate(invoice.due_date), mono: false },
              { label: "Vendor", value: formatAddress(invoice.vendor), mono: true },
              { label: "Payer", value: formatAddress(invoice.payer), mono: true },
              { label: "Beneficiary", value: formatAddress(invoice.beneficiary), mono: true },
              { label: "Arbitrator", value: formatAddress(invoice.arbitrator), mono: true },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-xs text-[#44445A] uppercase tracking-wider mb-1">{item.label}</div>
                <div className={`text-sm ${item.mono ? "font-mono" : ""} text-[#E8E8F0]`}>{item.value}</div>
              </div>
            ))}
          </div>

          {invoice.shelby_url && (
            
              href={invoice.shelby_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#00FF94] hover:underline mb-5"
            >
              📄 View metadata on Shelby →
            </a>
          )}

          {/* Actions */}
          {account && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-[#1E1E32]">
              {invoice.status === 0 && invoice.payer === account.address.toString() && (
                <button className="btn-primary text-sm" onClick={() => handlePay(invoice.id)}>
                  Pay Invoice
                </button>
              )}
              {invoice.status === 0 && invoice.vendor === account.address.toString() && (
                <button className="btn-danger text-sm" onClick={() => handleCancel(invoice.id)}>
                  Cancel
                </button>
              )}
              {invoice.status === 0 && (
                invoice.vendor === account.address.toString() || 
                invoice.payer === account.address.toString()
              ) && (
                <button className="btn-secondary text-sm" onClick={() => handleDispute(invoice.id)}>
                  Raise Dispute
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!invoice && !loading && (
        <div className="card p-12 text-center">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-[#8888AA] text-sm">
            {mode === "vendor"
              ? "Look up an invoice by ID, or create a new one."
              : "Look up an invoice assigned to you as payer."}
          </p>
        </div>
      )}
    </div>
  );
}