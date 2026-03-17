"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Header } from "@/components/Header";
import {
  CONTRACT_ADDRESS,
  ARBITRATOR_ADDRESS,
  TIER_CONFIG,
  TIER_GOLD,
  TIER_DIAMOND,
  TIER_PLATINUM,
} from "@/utils/constants";
import { formatAddress } from "@/utils/aptos";

export default function ArbitratorPage() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shelbyUrl, setShelbyUrl] = useState("");

  async function handleMintGold(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setError("");
    setLoading(true);
    setStatus("Minting Gold Arbitrator NFT...");

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::arbitrator_nft::mint_gold`,
          typeArguments: [],
          functionArguments: [ARBITRATOR_ADDRESS, shelbyUrl || ""],
        },
      });
      setStatus("Gold NFT minted! You are now a registered arbitrator. ✓");
      setShelbyUrl("");
    } catch (err: any) {
      setError(err?.message || "Mint failed");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(targetTier: number) {
    if (!account) return;
    setError("");
    setLoading(true);

    const fn =
      targetTier === TIER_DIAMOND
        ? "upgrade_to_diamond"
        : "upgrade_to_platinum";

    setStatus(`Upgrading to ${targetTier === TIER_DIAMOND ? "Diamond" : "Platinum"}...`);

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT_ADDRESS}::arbitrator_nft::${fn}`,
          typeArguments: [],
          functionArguments: [ARBITRATOR_ADDRESS],
        },
      });
      setStatus("Upgrade successful! ✓");
    } catch (err: any) {
      setError(err?.message || "Upgrade failed");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  const goldCfg = TIER_CONFIG[TIER_GOLD];
  const diamondCfg = TIER_CONFIG[TIER_DIAMOND];
  const platinumCfg = TIER_CONFIG[TIER_PLATINUM];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-4xl mb-2">Arbitrator Program</h1>
          <p className="text-[#8888AA] text-sm">
            Mint an NFT to become a registered arbitrator. Resolve disputes and earn fees.
          </p>
        </div>

        {!connected ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold mb-2">Connect your wallet</h3>
            <p className="text-[#8888AA] text-sm">
              Connect your Aptos wallet to mint an arbitrator NFT.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* How it works */}
            <div className="card p-5 bg-[#FFB800]/5 border-[#FFB800]/20">
              <div className="flex items-start gap-4">
                <div className="text-2xl">⚖️</div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">How Arbitration Works</h3>
                  <p className="text-xs text-[#8888AA] leading-relaxed">
                    When a dispute is raised on an invoice, the designated arbitrator reviews
                    evidence stored on Shelby and decides the outcome. Arbitrators earn fees
                    in USDC. Your reputation score is tracked on-chain — fair decisions earn
                    you higher tiers and more lucrative disputes.
                  </p>
                </div>
              </div>
            </div>

            {/* Tier cards */}
            <div className="grid md:grid-cols-3 gap-5">
              {/* Gold */}
              <div className={`card p-6 ${goldCfg.border} bg-gradient-to-br ${goldCfg.bg}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{goldCfg.emoji}</span>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: `${goldCfg.color}20`, color: goldCfg.color }}
                  >
                    {goldCfg.name}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-3">Gold Arbitrator</h3>
                <ul className="space-y-2 text-xs text-[#8888AA] mb-5">
                  <li>✓ Mint fee: {goldCfg.mintFee} USDC</li>
                  <li>✓ Handle disputes up to 1,000 USDC</li>
                  <li>✓ Earn fees per resolved dispute</li>
                  <li>✓ Build on-chain reputation</li>
                </ul>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
                      Shelby Metadata URL (optional)
                    </label>
                    <input
                      className="input-field text-xs"
                      placeholder="https://api.testnet.shelby.xyz/..."
                      value={shelbyUrl}
                      onChange={(e) => setShelbyUrl(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-primary w-full"
                    style={{ background: goldCfg.color }}
                    onClick={handleMintGold}
                    disabled={loading}
                  >
                    Mint Gold NFT
                  </button>
                </div>
              </div>

              {/* Diamond */}
              <div className={`card p-6 ${diamondCfg.border} bg-gradient-to-br ${diamondCfg.bg}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{diamondCfg.emoji}</span>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: `${diamondCfg.color}20`, color: diamondCfg.color }}
                  >
                    {diamondCfg.name}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-3">Diamond Arbitrator</h3>
                <ul className="space-y-2 text-xs text-[#8888AA] mb-5">
                  <li>✓ Upgrade fee: {diamondCfg.mintFee} USDC</li>
                  <li>✓ Requires: {diamondCfg.minDisputes} disputes resolved</li>
                  <li>✓ Requires: {diamondCfg.minReputation}% reputation</li>
                  <li>✓ Handle disputes up to 10,000 USDC</li>
                </ul>
                <button
                  className="btn-secondary w-full"
                  style={{ borderColor: `${diamondCfg.color}40`, color: diamondCfg.color }}
                  onClick={() => handleUpgrade(TIER_DIAMOND)}
                  disabled={loading}
                >
                  Upgrade to Diamond
                </button>
              </div>

              {/* Platinum */}
              <div className={`card p-6 ${platinumCfg.border} bg-gradient-to-br ${platinumCfg.bg}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{platinumCfg.emoji}</span>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: `${platinumCfg.color}20`, color: platinumCfg.color }}
                  >
                    {platinumCfg.name}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-3">Platinum Arbitrator</h3>
                <ul className="space-y-2 text-xs text-[#8888AA] mb-5">
                  <li>✓ Upgrade fee: {platinumCfg.mintFee} USDC</li>
                  <li>✓ Requires: {platinumCfg.minDisputes} disputes resolved</li>
                  <li>✓ Requires: {platinumCfg.minReputation}% reputation</li>
                  <li>✓ Unlimited dispute value</li>
                </ul>
                <button
                  className="btn-secondary w-full"
                  style={{ borderColor: `${platinumCfg.color}40`, color: platinumCfg.color }}
                  onClick={() => handleUpgrade(TIER_PLATINUM)}
                  disabled={loading}
                >
                  Upgrade to Platinum
                </button>
              </div>
            </div>

            {/* Status messages */}
            {(error || status) && (
              <div>
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

            {/* Reputation info */}
            <div className="card p-6">
              <h2 className="font-serif text-xl mb-4">Reputation System</h2>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                {[
                  {
                    title: "Fair Resolution",
                    desc: "Each dispute you resolve fairly increases your resolved count. Reputation = (resolved / total) × 100.",
                    color: "#00FF94",
                  },
                  {
                    title: "Slashing",
                    desc: "Admins can slash reputation for misconduct. Enough slashes will downgrade your tier.",
                    color: "#FF4444",
                  },
                  {
                    title: "Tier Benefits",
                    desc: "Higher tiers get access to larger disputes with higher fees. Platinum arbitrators are most trusted.",
                    color: "#FFB800",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-4 rounded-lg"
                    style={{ background: `${item.color}08`, border: `1px solid ${item.color}20` }}
                  >
                    <h3 className="font-medium mb-2" style={{ color: item.color }}>
                      {item.title}
                    </h3>
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
