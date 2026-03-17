"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { formatAddress, formatUSDC, formatDate } from "@/utils/aptos";
import { CONTRACT_ADDRESS, REGISTRY_ADDRESS, STATUS_CONFIG } from "@/utils/constants";
import type { Invoice } from "@/types";

// Initialize Aptos Client
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

type Props = { mode: "vendor" | "payer" };

export function InvoiceList({ mode }: Props) {
  const { account, signAndSubmitTransaction } = useWallet();
  const [invoiceId, setInvoiceId] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState("");

  /**
   * Fetches invoice data from the smart contract using a view function
   */
  async function handleLookup() {
    if (!invoiceId.trim()) return;
    setError("");
    setInvoice(null);
    setLoading(true);

    try {
      const result = await aptos.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::get_invoice`,
          functionArguments: [REGISTRY_ADDRESS, invoiceId],
        },
      });

      if (result && result[0]) {
        setInvoice(result[0] as Invoice);
      } else {
        setError("Invoice not found.");
      }
    } catch (err: any) {
      console.error("Lookup error:", err);
      setError("Failed to fetch invoice. Please check the ID.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(id: number) {
    if (!account) return;
    setActionStatus("Processing payment...");
    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::pay_invoice`,
          functionArguments: [REGISTRY_ADDRESS, id.toString()],
        },
      });
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setActionStatus("Invoice paid successfully! ✓");
      handleLookup(); // Refresh local state
    } catch (err: any) {
      setActionStatus("");
      setError(err?.message || "Payment failed");
    }
  }

  async function handleCancel(id: number) {
    if (!account) return;
    setActionStatus("Cancelling invoice...");
    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::cancel_invoice`,
          functionArguments: [REGISTRY_ADDRESS, id.toString()],
        },
      });
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setActionStatus("Invoice cancelled. ✓");
      handleLookup();
    } catch (err: any) {
      setActionStatus("");
      setError(err?.message || "Cancel failed");
    }
  }

  async function handleDispute(id: number) {
    const reason = prompt("Enter dispute reason:");
    if (!reason || !account) return;
    setActionStatus("Raising dispute...");
    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::raise_dispute`,
          functionArguments: [REGISTRY_ADDRESS, id.toString(), reason],
        },
      });
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setActionStatus("Dispute raised. ✓");
      handleLookup();
    } catch (err: any) {
      setActionStatus("");
      setError(err?.message || "Dispute failed");
    }
  }

  const statusCfg = invoice ? STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG[0] : null;
  const userAddr = account?.address?.toString();

  return (
    <div className="space-y-6">
      {/* Lookup Section */}
      <div className="card p-6 border border-[#1E1E32] bg-[#0B0B15] rounded-xl">
        <h3 className="text-sm font-semibold text-[#8888AA] uppercase tracking-wider mb-4">
          Look up Invoice by ID
        </h3>
        <div className="flex gap-3">
          <input
            className="input-field font-mono flex-1 bg-[#161625] border border-[#2A2A40] p-2 rounded-lg text-white outline-none focus:border-[#00FF94] transition-colors"
            placeholder="Invoice ID (e.g. 1)"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          />
          <button 
            className="btn-secondary px-6 bg-[#2A2A40] hover:bg-[#3A3A55] text-white transition-colors rounded-lg disabled:opacity-50" 
            onClick={handleLookup} 
            disabled={loading}
          >
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

      {/* Invoice Details Section */}
      {invoice && statusCfg && (
        <div className="card p-6 animate-fade-in border border-[#1E1E32] bg-[#0B0B15] rounded-xl shadow-2xl">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="font-mono text-xs text-[#44445A] mb-1">Invoice #{invoice.id}</div>
              <h3 className="text-lg font-semibold text-white">{invoice.description}</h3>
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
            <a
              href={invoice.shelby_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#00FF94] hover:underline mb-5"
            >
              📄 View metadata on Shelby →
            </a>
          )}

          {/* Action Buttons */}
          {account && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-[#1E1E32]">
              {invoice.status === 0 && invoice.payer === userAddr && (
                <button 
                  className="btn-primary bg-[#00FF94] text-black px-4 py-2 rounded-lg font-bold hover:brightness-110 transition-all" 
                  onClick={() => handlePay(invoice.id)}
                >
                  Pay Invoice
                </button>
              )}
              {invoice.status === 0 && invoice.vendor === userAddr && (
                <button 
                  className="btn-danger bg-[#FF4444] text-white px-4 py-2 rounded-lg font-bold hover:brightness-110 transition-all" 
                  onClick={() => handleCancel(invoice.id)}
                >
                  Cancel
                </button>
              )}
              {invoice.status === 0 && (invoice.vendor === userAddr || invoice.payer === userAddr) && (
                <button 
                  className="btn-secondary border border-[#2A2A40] text-white px-4 py-2 rounded-lg hover:bg-[#1E1E32] transition-all" 
                  onClick={() => handleDispute(invoice.id)}
                >
                  Raise Dispute
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!invoice && !loading && (
        <div className="card p-12 text-center border border-dashed border-[#1E1E32] rounded-xl">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-[#8888AA] text-sm">
            {mode === "vendor"
              ? "Look up an invoice by ID, or create a new one."
              : "Look up an invoice assigned to your wallet address."}
          </p>
        </div>
      )}
    </div>
  );
}