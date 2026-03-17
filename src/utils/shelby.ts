import {
  ShelbyClient,
  ShelbyBlobClient,
  generateCommitments,
  ClayErasureCodingProvider,
} from "@shelby-protocol/sdk/browser";
import { SHELBY_BASE_URL } from "./constants";

let _client: ShelbyClient | null = null;

export function getShelbyClient(): ShelbyClient {
  if (!_client) {
    _client = new ShelbyClient({
      network: "testnet" as any,
      apiKey: process.env.NEXT_PUBLIC_SHELBY_API_KEY,
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

  // Step 1: Generate commitments (merkle root)
  const provider = await ClayErasureCodingProvider.create();
  const commitments = await generateCommitments(provider, blobData);

  // Step 2: Build register blob payload
  const payload = ShelbyBlobClient.createRegisterBlobPayload({
    account: accountAddress as any,
    blobName,
    blobSize: blobData.length,
    blobMerkleRoot: commitments.blob_merkle_root,
    expirationMicros: (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000, // 30 days
    numChunksets: commitments.chunkset_commitments.length,
    encoding: 0,
  });

  // Step 3: Sign & submit on-chain via user's wallet
  await signAndSubmitTransaction({ data: payload });

  // Step 4: Upload blob data to Shelby RPC
  await client.rpc.putBlob({
    account: accountAddress,
    blobName,
    blobData,
  });

  // Step 5: Compute hash for on-chain integrity check
  const hashBuffer = await crypto.subtle.digest("SHA-256", blobData);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

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