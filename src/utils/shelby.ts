import { SHELBY_BASE_URL } from "./constants";

export type InvoiceMetadata = {
  version: "1.0";
  description: string;
  vendor: string;
  payer: string;
  arbitrator: string;
  amount_usdc: string;
  due_date: string;
  created_at: string;
  attachments?: string[];
  notes?: string;
};

export function buildShelbyUrl(accountAddress: string, blobName: string): string {
  return `${SHELBY_BASE_URL}/${accountAddress}/${blobName}`;
}

export async function uploadInvoiceMetadata(
  accountAddress: string,
  signAndSubmitTransaction: (params: any) => Promise<any>,
  metadata: InvoiceMetadata,
): Promise<{ url: string; hash: string }> {
  const blobName = `invoice-${Date.now()}.json`;
  const metadataJson = JSON.stringify(metadata, null, 2);
  const blobData = Array.from(new TextEncoder().encode(metadataJson));

  // Tính hash trước khi upload
  const blobUint8 = new Uint8Array(blobData);
  const hashBuffer = await crypto.subtle.digest("SHA-256", blobUint8);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Gọi API route server-side thay vì gọi Shelby trực tiếp
  const res = await fetch("/api/upload-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountAddress, blobName, blobData }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to upload to Shelby");
  }

  const url = buildShelbyUrl(accountAddress, blobName);
  return { url, hash: `0x${hashHex}` };
}

export async function fetchMetadata(url: string): Promise<InvoiceMetadata | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}