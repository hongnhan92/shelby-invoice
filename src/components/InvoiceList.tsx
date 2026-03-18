"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { formatAddress, formatUSDC, formatDate } from "@/utils/aptos";
import { CONTRACT_ADDRESS, REGISTRY_ADDRESS, STATUS_CONFIG } from "@/utils/constants";
import type { Invoice } from "@/types";

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Normalize address: lowercase, remove leading zeros after 0x
// e.g. "0x00abc" → "0xabc", "0XABC" → "0xabc"
function normalizeAddr(addr: string): string {
  if (!addr) return "";
  const lower = addr.toLowerCase();
  const hex = lower.startsWith("0x") ? lower.slice(2) : lower;
  return "0x" + hex.replace(/^0+/, "") || "0x0";
}

type Props = { mode: "vendor" | "payer" };

export function InvoiceList({ mode }: Props) {
  const { account, signAndSubmitTransaction } = useWallet();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [lookedUp, setLookedUp] = useState<Invoice | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const userAddr = normalizeAddr(account?.address?.toString() ?? "");

  useEffect(() => {
    if (!userAddr) return;
    fetchMyInvoices();
  }, [userAddr, mode]);

  async function fetchMyInvoices() {
    if (!userAddr) return;
    setLoading(true);
    setError("");
    setInvoices([]);
    try {
      const [nextId] = await aptos.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::get_next_id`,
          functionArguments: [REGISTRY_ADDRESS],
        },
      });
      const total = Number(nextId) - 1;
      if (total <= 0) {
        setLoading(false);
        return;
      }
      const ids = Array.from({ length: total }, (_, i) => i + 1);
      const results = await Promise.allSettled(
        ids.map((id) =>
          aptos.view({
            payload: {
              function: `${CONTRACT_ADDRESS}::invoice_registry::get_invoice`,
              functionArguments: [REGISTRY_ADDRESS, id.toString()],
            },
          })
        )
      );
      const matched: Invoice[] = [];
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const inv = result.value[0] as Invoice;
        if (!inv) continue;
        const normVendor = normalizeAddr(inv.vendor);
        const normPayer = normalizeAddr(inv.payer);
        const isMatch = mode === "vendor"
          ? normVendor === userAddr
          : normPayer === userAddr;
        if (isMatch) matched.push(inv);
      }
      matched.sort((a, b) => Number(b.id) - Number(a.id));
      setInvoices(matched);
    } catch (e: any) {
      setError("Failed to load invoices.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup() {
    if (!invoiceId.trim()) return;
    setLookupError("");
    setLookedUp(null);
    setLookupLoading(true);
    try {
      const result = await aptos.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::get_invoice`,
          functionArguments: [REGISTRY_ADDRESS, invoiceId],
        },
      });
      if (result?.[0]) setLookedUp(result[0] as Invoice);
      else setLookupError("Invoice not found.");
    } catch {
      setLookupError("Invoice not found. Check the ID.");
    } finally {
      setLookupLoading(false);
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
      fetchMyInvoices();
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
      fetchMyInvoices();
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
      fetchMyInvoices();
    } catch (err: any) {
      setActionStatus("");
      setError(err?.message || "Dispute failed");
    }
  }

  function InvoiceCard({ inv }: { inv: Invoice }) {
    const statusCfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG[0];
    return (
      <div className="card p-6 border border-[#1E1E32] bg-[#0B0B15] rounded-xl shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-mono text-xs text-[#44445A] mb-1">Invoice #{inv.id}</div>
            <h3 className="text-base font-semibold text-white">{inv.description}</h3>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
          >
            {statusCfg.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <div className="text-xs text-[#44445A] uppercase tracking-wider mb-1">Amount</div>
            <div className="font-mono text-white">{formatUSDC(inv.amount)} USDC</div>
          </div>
          <div>
            <div className="text-xs text-[#44445A] uppercase tracking-wider mb-1">Due Date</div>
            <div className="text-white">{formatDate(inv.due_date)}</div>
          </div>
          <div>
            <div className="text-xs text-[#44445A] uppercase tracking-wider mb-1">Vendor</div>
            <div className="font-mono text-[#E8E8F0]">{formatAddress(inv.vendor)}</div>
          </div>
          <div>
            <div className="text-xs text-[#44445A] uppercase tracking-wider mb-1">Payer</div>
            <div className="font-mono text-[#E8E8F0]">{formatAddress(inv.payer)}</div>
          </div>
        </div>

        {inv.shelby_url && (
          <a
            href={inv.shelby_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#00FF94] hover:underline mb-4"
          >
            📄 View metadata on Shelby →
          </a>
        )}

        {account && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-[#1E1E32]">
            {inv.status === 0 && normalizeAddr(inv.payer) === userAddr && (
              <button
                className="bg-[#00FF94] text-black px-4 py-1.5 rounded-lg text-sm font-bold hover:brightness-110 transition-all"
                onClick={() => handlePay(inv.id)}
              >
                Pay Invoice
              </button>
            )}
            {inv.status === 0 && normalizeAddr(inv.vendor) === userAddr && (
              <button
                className="bg-[#FF4444] text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:brightness-110 transition-all"
                onClick={() => handleCancel(inv.id)}
              >
                Cancel
              </button>
            )}
            {inv.status === 0 && (normalizeAddr(inv.vendor) === userAddr || normalizeAddr(inv.payer) === userAddr) && (
              <button
                className="border border-[#2A2A40] text-white px-4 py-1.5 rounded-lg text-sm hover:bg-[#1E1E32] transition-all"
                onClick={() => handleDispute(inv.id)}
              >
                Raise Dispute
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionStatus && (
        <div className="p-3 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20 text-[#00FF94] text-sm">
          {actionStatus}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-[#FF4444]/10 border border-[#FF4444]/20 text-[#FF4444] text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center border border-[#1E1E32] rounded-xl">
          <div className="text-[#8888AA] text-sm animate-pulse">Loading invoices...</div>
        </div>
      ) : invoices.length > 0 ? (
        <div className="space-y-4">
          {invoices.map((inv) => (
            <InvoiceCard key={inv.id} inv={inv} />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center border border-dashed border-[#1E1E32] rounded-xl">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-[#8888AA] text-sm">
            {mode === "vendor"
              ? "No invoices created by you yet."
              : "No invoices payable by you yet."}
          </p>
        </div>
      )}

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
            className="px-6 bg-[#2A2A40] hover:bg-[#3A3A55] text-white transition-colors rounded-lg disabled:opacity-50"
            onClick={handleLookup}
            disabled={lookupLoading}
          >
            {lookupLoading ? "..." : "Lookup"}
          </button>
        </div>
        {lookupError && (
          <div className="mt-3 p-3 rounded-lg bg-[#FF4444]/10 border border-[#FF4444]/20 text-[#FF4444] text-sm">
            {lookupError}
          </div>
        )}
        {lookedUp && <InvoiceCard inv={lookedUp} />}
      </div>
    </div>
  );
}