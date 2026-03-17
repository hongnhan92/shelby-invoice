import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { APTOS_NETWORK } from "./constants";

export const aptosConfig = new AptosConfig({
  network: APTOS_NETWORK,
  clientConfig: {
    API_KEY: process.env.NEXT_PUBLIC_APTOS_API_KEY,
  },
});

export const aptos = new Aptos(aptosConfig);

export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatUSDC(amount: number | bigint): string {
  const n = typeof amount === "bigint" ? Number(amount) : amount;
  return (n / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseUSDC(amount: string): number {
  return Math.round(parseFloat(amount) * 1_000_000);
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateToUnix(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export function unixToDateInput(unix: number): string {
  if (!unix) return "";
  return new Date(unix * 1000).toISOString().split("T")[0];
}
