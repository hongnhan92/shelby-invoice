"use client";

import { useState, useEffect, useRef } from "react";
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { APTOS_NETWORK, ARBITRATOR_ADDRESS, TIER_CONFIG } from "@/utils/constants";

type ArbitratorProfile = {
  owner: string;
  tier: number;
  disputes_resolved: number;
  disputes_total: number;
  reputation_score: number;
  shelby_url: string;
};

type Props = {
  value: string;
  onChange: (address: string) => void;
};

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function TierBadge({ tier }: { tier: number }) {
  const cfg = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];
  if (!cfg) return null;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
      style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}40` }}
    >
      {cfg.emoji} {cfg.name}
    </span>
  );
}

export function ArbitratorSelect({ value, onChange }: Props) {
  const [arbitrators, setArbitrators] = useState<ArbitratorProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchArbitrators() {
      setLoading(true);
      setError("");
      try {
        const apiKey = process.env.NEXT_PUBLIC_APTOS_API_KEY;

        const aptos = new Aptos(
          new AptosConfig({
            network: APTOS_NETWORK,
            ...(apiKey && {
              clientConfig: { HEADERS: { "x-api-key": apiKey } },
            }),
          })
        );

        const restHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(apiKey && { "x-api-key": apiKey }),
        };

        // ✅ Dùng REST API: lấy transactions của contract account
        // Endpoint này chỉ trả txs liên quan đến ARBITRATOR_ADDRESS — không scan toàn chain
        const mintFn = `${ARBITRATOR_ADDRESS}::arbitrator_nft::mint_gold`;
        const url = `https://api.testnet.aptoslabs.com/v1/accounts/${ARBITRATOR_ADDRESS}/transactions?limit=100`;

        const res = await fetch(url, { headers: restHeaders });

        if (!res.ok) {
          throw new Error(`REST transactions failed: ${res.status}`);
        }

        const txs: any[] = await res.json();

        const seen = new Set<string>();
        const profiles: ArbitratorProfile[] = [];

        for (const tx of txs) {
          // Chỉ lấy txs gọi mint_gold
          if (tx?.payload?.function !== mintFn) continue;

          const owner = tx.sender;
          if (!owner || seen.has(owner)) continue;
          seen.add(owner);

          try {
            const [profile] = await aptos.view({
              payload: {
                function: `${ARBITRATOR_ADDRESS}::arbitrator_nft::get_profile`,
                typeArguments: [],
                functionArguments: [ARBITRATOR_ADDRESS, owner],
              },
            });
            profiles.push(profile as ArbitratorProfile);
          } catch {
            // profile no longer valid, skip
          }
        }

        setArbitrators(profiles);
      } catch (e: any) {
        setError("Failed to load arbitrators");
        console.error("ArbitratorSelect error:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchArbitrators();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = arbitrators.find((a) => a.owner === value);

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-xs font-medium text-[#8888AA] uppercase tracking-wider">
        Arbitrator *
      </label>

      <div
        className="input-field font-mono text-xs cursor-pointer flex items-center justify-between gap-2 select-none"
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <TierBadge tier={selected.tier} />
            <span className="truncate">{shortAddr(selected.owner)}</span>
            <span className="text-[#44445A] shrink-0">
              ⭐ {selected.reputation_score}% · {selected.disputes_resolved} disputes
            </span>
          </div>
        ) : (
          <span className="text-[#44445A]">
            {loading ? "Loading arbitrators..." : "Select an arbitrator..."}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-[#44445A] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 rounded-xl border border-[#1A1A2E] bg-[#0D0D1A] shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
            {loading && (
              <div className="p-4 text-xs text-[#44445A] text-center">Loading...</div>
            )}
            {error && !loading && (
              <div className="p-3 text-xs text-[#FF4444]">{error}</div>
            )}
            {!loading && !error && arbitrators.length === 0 && (
              <div className="p-4 text-xs text-[#44445A] text-center">
                No registered arbitrators found
              </div>
            )}
            {!loading &&
              arbitrators.map((a) => {
                const isSelected = a.owner === value;
                return (
                  <div
                    key={a.owner}
                    onClick={() => {
                      onChange(a.owner);
                      setOpen(false);
                    }}
                    className={`p-3 cursor-pointer transition-colors hover:bg-[#1A1A2E] border-b border-[#1A1A2E] last:border-0 ${
                      isSelected ? "bg-[#1A1A2E]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <TierBadge tier={a.tier} />
                        <span className="font-mono text-xs text-[#CCCCDD] truncate">
                          {shortAddr(a.owner)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs text-[#8888AA]">
                        <span>⭐ {a.reputation_score}%</span>
                        <span>
                          {a.disputes_resolved}/{a.disputes_total} disputes
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-[#44445A] truncate">
                      {a.owner}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <input
        className="input-field font-mono text-xs w-full"
        placeholder="Or paste address manually: 0x..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-[#44445A]">Must be a registered arbitrator NFT holder</p>
    </div>
  );
}