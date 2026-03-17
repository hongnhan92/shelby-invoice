"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { CONTRACT_ADDRESS, REGISTRY_ADDRESS } from "@/utils/constants";
import { parseUSDC, dateToUnix } from "@/utils/aptos";
import { uploadInvoiceMetadata, type InvoiceMetadata } from "@/utils/shelby";

type Props = { onSuccess?: () => void };

export function CreateInvoiceForm({ onSuccess }: Props) {
  const { account, signAndSubmitTransaction } = useWallet();

  const [form, setForm] = useState({
    payer: "",
    arbitrator: "",
    amount: "",
    due_date: "",
    description: "",
    notes: "",
  });

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!account) return;
    if (!form.payer || !form.arbitrator || !form.amount || !form.due_date || !form.description) {
      setError("All fields except Notes are required.");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Upload metadata to Shelby
      setStatus("Uploading metadata to Shelby...");
      const metadata: InvoiceMetadata = {
        version: "1.0",
        description: form.description,
        vendor: account.address.toString(),
        payer: form.payer,
        arbitrator: form.arbitrator,
        amount_usdc: form.amount,
        due_date: form.due_date,
        created_at: new Date().toISOString(),
        notes: form.notes || undefined,
      };

      const { url, hash } = await uploadInvoiceMetadata(
        account.address,
        signAndSubmitTransaction,
        metadata,
      );

      // Step 2: Create invoice on-chain
      setStatus("Creating invoice on Aptos...");
      const hashBytes = Array.from(Buffer.from(hash.slice(2), "hex"));

      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::invoice_registry::create_invoice`,
          typeArguments: [],
          functionArguments: [
            REGISTRY_ADDRESS,
            form.payer,
            form.arbitrator,
            parseUSDC(form.amount).toString(),
            dateToUnix(form.due_date).toString(),
            form.description,
            hashBytes,
            url,
          ],
        },
      });

      setStatus("Invoice created successfully! ✓");
      setForm({ payer: "", arbitrator: "", amount: "", due_date: "", description: "", notes: "" });
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to create invoice");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="card p-8">
        <h2 className="font-serif text-2xl mb-6">New Invoice</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                Payer Address *
              </label>
              <input
                className="input-field font-mono text-xs"
                placeholder="0x..."
                value={form.payer}
                onChange={(e) => set("payer", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                Arbitrator Address *
              </label>
              <input
                className="input-field font-mono text-xs"
                placeholder="0x..."
                value={form.arbitrator}
                onChange={(e) => set("arbitrator", e.target.value)}
              />
              <p className="text-xs text-[#44445A]">Must be a registered arbitrator NFT holder</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                Amount (USDC) *
              </label>
              <input
                className="input-field font-mono"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="100.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                Due Date *
              </label>
              <input
                className="input-field"
                type="date"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
              Description *
            </label>
            <input
              className="input-field"
              placeholder="e.g. Web development services — March 2026"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
              Notes (optional)
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Additional details, payment terms, etc."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
            <p className="text-xs text-[#44445A]">Stored on Shelby — visible to all parties</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FF4444]/10 border border-[#FF4444]/20 text-[#FF4444] text-sm">
              {error}
            </div>
          )}

          {status && (
            <div className="p-3 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20 text-[#00FF94] text-sm">
              {status}
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#080810]/30 border-t-[#080810] rounded-full animate-spin" />
                {status || "Processing..."}
              </span>
            ) : (
              "Create Invoice"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
