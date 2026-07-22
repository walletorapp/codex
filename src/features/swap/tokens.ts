export interface SwapToken {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  color: string;
}

export const SOL_TOKEN: SwapToken = {
  symbol: "SOL",
  name: "Solana",
  mint: "So11111111111111111111111111111111111111112",
  decimals: 9,
  color: "linear-gradient(135deg, #9945ff, #14f195)",
};

export const USDC_TOKEN: SwapToken = {
  symbol: "USDC",
  name: "USD Coin",
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
  color: "#2775ca",
};

export const SWAP_TOKENS: SwapToken[] = [
  SOL_TOKEN,
  USDC_TOKEN,
  {
    symbol: "USDT",
    name: "Tether USD",
    mint: "Es9vMFrzaCERmJfrF4H2FYDwwfK6K8NbTqDqWxSg6MZ",
    decimals: 6,
    color: "#26a17b",
  },
];

export function toAtomicAmount(value: string, decimals: number): string | null {
  const normalized = value.trim();
  if (!/^(?:\d+)(?:\.\d*)?$/.test(normalized)) return null;
  const [whole = "0", fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) return null;
  const atomic = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+/, "");
  return atomic || "0";
}

export function fromAtomicAmount(value: string, decimals: number): string {
  const padded = value.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}
