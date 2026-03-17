import { NextRequest, NextResponse } from "next/server";
import { ShelbyClient } from "@shelby-protocol/sdk";

export async function POST(req: NextRequest) {
  try {
    const { accountAddress, blobName, blobData } = await req.json();

    const client = new ShelbyClient({
      network: "testnet" as any,
      apiKey: process.env.SHELBY_API_KEY!, // server-side only, không lộ ra browser
    });

    await client.rpc.putBlob({
      account: accountAddress,
      blobName,
      blobData: new Uint8Array(blobData),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Shelby upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}