import { Network } from "@aptos-labs/ts-sdk";

// ─── Network ─────────────────────────────────────────────────────────────────

export const APTOS_NETWORK = Network.TESTNET;

// ─── Contract Addresses (fill after deploying Move contracts) ────────────────

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
export const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || CONTRACT_ADDRESS;
export const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || CONTRACT_ADDRESS;
export const ARBITRATOR_ADDRESS = process.env.NEXT_PUBLIC_ARBITRATOR_ADDRESS || CONTRACT_ADDRESS;

// ─── USDC Token ──────────────────────────────────────────────────────────────

export const USDC_METADATA = "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832";
export const USDC_DECIMALS = 6;

// ─── Shelby ──────────────────────────────────────────────────────────────────

export const SHELBY_API_KEY = process.env.NEXT_PUBLIC_SHELBY_API_KEY || "";
export const SHELBY_BASE_URL = "https://api.testnet.shelby.xyz/shelby/v1/blobs";

// ─── NFT Tiers ───────────────────────────────────────────────────────────────

export const TIER_GOLD = 1;
export const TIER_DIAMOND = 2;
export const TIER_PLATINUM = 3;

export const TIER_CONFIG = {
  [TIER_GOLD]: {
    name: "Gold",
    color: "#FFB800",
    bg: "from-yellow-500/20 to-amber-500/10",
    border: "border-yellow-500/30",
    mintFee: 100,
    minDisputes: 0,
    minReputation: 0,
    emoji: "🥇",
  },
  [TIER_DIAMOND]: {
    name: "Diamond",
    color: "#60A5FA",
    bg: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/30",
    mintFee: 500,
    minDisputes: 10,
    minReputation: 80,
    emoji: "💎",
  },
  [TIER_PLATINUM]: {
    name: "Platinum",
    color: "#E2E8F0",
    bg: "from-slate-400/20 to-gray-400/10",
    border: "border-slate-400/30",
    mintFee: 2000,
    minDisputes: 50,
    minReputation: 95,
    emoji: "🏆",
  },
};

// ─── Invoice Status ───────────────────────────────────────────────────────────

export const STATUS_CREATED = 0;
export const STATUS_PAID = 1;
export const STATUS_CANCELLED = 2;
export const STATUS_DISPUTED = 3;
export const STATUS_RESOLVED = 4;

export const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  [STATUS_CREATED]: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  [STATUS_PAID]: { label: "Paid", color: "text-blue-400", bg: "bg-blue-400/10" },
  [STATUS_CANCELLED]: { label: "Cancelled", color: "text-red-400", bg: "bg-red-400/10" },
  [STATUS_DISPUTED]: { label: "Disputed", color: "text-amber-400", bg: "bg-amber-400/10" },
  [STATUS_RESOLVED]: { label: "Resolved", color: "text-purple-400", bg: "bg-purple-400/10" },
};

// ─── Marketplace Fee ──────────────────────────────────────────────────────────

export const MARKETPLACE_FEE_BPS = 50; // 0.5%