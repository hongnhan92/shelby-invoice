import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { SHELBY_API_KEY, SHELBY_BASE_URL } from "./constants";

let _client: ShelbyClient | null = null;

export function getShelbyClient(): ShelbyClient {
  if (!_client) {
    _client = new ShelbyClient({
      network: "testnet" as any,
      apiKey: SHELBY_API_KEY,
    });
  }
  return _client;
}

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
  const client = getShelbyClient();
  const blobName = `invoice-${Date.now()}.json`;
  const metadataJson = JSON.stringify(metadata, null, 2);
  const blobData = new TextEncoder().encode(metadataJson);

  const storageAccountAddress = accountAddress;

  await client.rpc.putBlob({
    account: storageAccountAddress,
    blobName,
    blobData,
  });

  const url = buildShelbyUrl(storageAccountAddress, blobName);

  // Simple hash for integrity check
  const hash = await crypto.subtle.digest("SHA-256", blobData);
  const hashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

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
