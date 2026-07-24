import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  VersionedTransaction,
  type ParsedAccountData,
} from "@solana/web3.js";
import {
  ArrowDownUp,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Flame,
  LoaderCircle,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { SwapOrder } from "../../../shared/swap-contracts";
import { searchSwapTokens } from "../../lib/api";
import { fetchSwapOrder, submitSignedSwap } from "../../lib/swap";
import {
  loadSwapHistory,
  saveSwapHistory,
  type SwapHistoryEntry,
} from "./history";
import {
  fromAtomicAmount,
  SOL_TOKEN,
  SWAP_TOKENS,
  toAtomicAmount,
  type SwapToken,
  USDC_TOKEN,
} from "./tokens";

const QUOTE_LIFETIME_MS = 20_000;
const SOL_FEE_RESERVE = 5_000_000n;

function bytesFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64FromBytes(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function tokenFromSearch(
  result: Awaited<ReturnType<typeof searchSwapTokens>>[number],
): SwapToken {
  return {
    symbol: result.symbol,
    name: result.name,
    mint: result.address,
    decimals: result.decimals,
    color: "linear-gradient(135deg, #2b67ac, #10b981)",
    logoUrl: result.logoUrl,
    isVerified: result.isVerified,
    organicScore: result.organicScore,
  };
}

function TokenIcon({ token }: { token: SwapToken }) {
  return token.logoUrl ? (
    <img className="token-icon" src={token.logoUrl} alt="" />
  ) : (
    <span className="token-icon" style={{ background: token.color }}>
      {token.symbol.slice(0, 1)}
    </span>
  );
}

function TokenPicker({
  token,
  onChange,
  exclude,
}: {
  token: SwapToken;
  onChange: (token: SwapToken) => void;
  exclude: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SwapToken[]>(SWAP_TOKENS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const normalized = query.trim();
    if (!normalized) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      void searchSwapTokens(normalized, controller.signal)
        .then((tokens) => {
          setResults(tokens.map(tokenFromSearch));
          setError(tokens.length ? null : "No matching Solana tokens.");
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === "AbortError")
            return;
          setError(
            caught instanceof Error ? caught.message : "Token search failed.",
          );
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query]);

  return (
    <>
      <button
        type="button"
        className="token-select"
        aria-label={`Choose token, currently ${token.symbol}`}
        onClick={() => {
          setOpen(true);
        }}
      >
        <TokenIcon token={token} />
        <strong>{token.symbol}</strong>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      {open && (
        <div className="token-modal-backdrop" role="presentation">
          <section
            className="token-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="token-modal-title"
          >
            <header>
              <div>
                <small>JUPITER TOKENS V2</small>
                <h2 id="token-modal-title">Choose a Solana token</h2>
              </div>
              <button
                type="button"
                aria-label="Close token selector"
                onClick={() => {
                  setOpen(false);
                }}
              >
                <X />
              </button>
            </header>
            <label className="token-search-field">
              <Search size={18} />
              <input
                autoFocus
                value={query}
                placeholder="Search name, symbol, or mint"
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (!event.target.value.trim()) setError(null);
                }}
              />
              {loading && <LoaderCircle className="spin" size={18} />}
            </label>
            {error && <p className="token-search-error">{error}</p>}
            <div className="token-results">
              {(query.trim() ? results : SWAP_TOKENS)
                .filter((item) => item.mint !== exclude)
                .map((item) => (
                  <button
                    type="button"
                    key={item.mint}
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <TokenIcon token={item} />
                    <span>
                      <strong>
                        {item.symbol}
                        {item.isVerified && (
                          <i title="Verified by Jupiter">
                            <Check size={11} />
                          </i>
                        )}
                      </strong>
                      <small>{item.name}</small>
                    </span>
                    <code>
                      {item.mint.slice(0, 4)}…{item.mint.slice(-4)}
                    </code>
                  </button>
                ))}
            </div>
            <p className="token-risk-note">
              Anyone can create a token. Verify the mint and review unverified
              assets carefully.
            </p>
          </section>
        </div>
      )}
    </>
  );
}

function readParsedTokenAmount(data: ParsedAccountData): string | null {
  const parsed = data.parsed as {
    info?: { tokenAmount?: { amount?: unknown } };
  };
  const amount = parsed.info?.tokenAmount?.amount;
  return typeof amount === "string" && /^\d+$/.test(amount) ? amount : null;
}

function formatAge(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  if (seconds < 60) return `${String(seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${String(minutes)}m ago`;
  return `${String(Math.floor(minutes / 60))}h ago`;
}

function formatUsd(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: string | null): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "—";
  if (Math.abs(parsed) < 0.0001) return "<0.0001";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(parsed);
}

const LEVELS = [
  { name: "Scout", minimum: 0, next: 3 },
  { name: "Hunter", minimum: 3, next: 10 },
  { name: "Navigator", minimum: 10, next: 25 },
  { name: "Pathfinder", minimum: 25, next: 50 },
] as const;

const ACTIVITY_MILESTONES = [
  { swaps: 1, label: "First swap", icon: Flame },
  { swaps: 3, label: "Active trader", icon: Zap },
  { swaps: 5, label: "Committed", icon: Sparkles },
  { swaps: 10, label: "Round complete", icon: Trophy },
] as const;

export function SwapPage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const [searchParams, setSearchParams] = useSearchParams();
  const historyView = searchParams.get("view") === "history";
  const [inputToken, setInputToken] = useState(SOL_TOKEN);
  const [outputToken, setOutputToken] = useState(USDC_TOKEN);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<{
    key: string;
    order: SwapOrder;
    fetchedAt: number;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preparingReview, setPreparingReview] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<SwapOrder | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [history, setHistory] = useState<SwapHistoryEntry[]>(loadSwapHistory);
  const [inputBalance, setInputBalance] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [clock, setClock] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const atomicAmount = useMemo(
    () => toAtomicAmount(amount, inputToken.decimals),
    [amount, inputToken.decimals],
  );
  const quoteKey = `${inputToken.mint}:${outputToken.mint}:${atomicAmount ?? ""}`;
  const activeQuote = quote?.key === quoteKey ? quote : null;
  const quotedOutput = activeQuote
    ? fromAtomicAmount(activeQuote.order.outAmount, outputToken.decimals)
    : null;
  const quoteAge = activeQuote ? clock - activeQuote.fetchedAt : 0;
  const quoteExpired = Boolean(activeQuote && quoteAge >= QUOTE_LIFETIME_MS);
  const insufficientBalance = Boolean(
    atomicAmount && inputBalance && BigInt(atomicAmount) > BigInt(inputBalance),
  );
  const lowSolForFees = Boolean(
    connected && solBalance && BigInt(solBalance) < SOL_FEE_RESERVE,
  );

  useEffect(() => {
    const initial = window.setTimeout(() => {
      setClock(Date.now());
    }, 0);
    const interval = window.setInterval(() => {
      setClock(Date.now());
    }, 1_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!publicKey) {
      setInputBalance(null);
      setSolBalance(null);
      return;
    }
    setBalanceLoading(true);
    try {
      const lamports = await connection.getBalance(publicKey, "confirmed");
      setSolBalance(String(lamports));
      if (inputToken.mint === SOL_TOKEN.mint) {
        setInputBalance(String(lamports));
      } else {
        const accounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint: new PublicKey(inputToken.mint) },
          "confirmed",
        );
        const total = accounts.value.reduce((sum, item) => {
          if (!("parsed" in item.account.data)) return sum;
          const parsedAmount = readParsedTokenAmount(item.account.data);
          return parsedAmount ? sum + BigInt(parsedAmount) : sum;
        }, 0n);
        setInputBalance(String(total));
      }
    } catch {
      setInputBalance(null);
      setSolBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [connection, inputToken.mint, publicKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshBalances();
    }, 0);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [refreshBalances]);

  useEffect(() => {
    if (!atomicAmount || atomicAmount === "0") return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setQuoteLoading(true);
      setError(null);
      void fetchSwapOrder({
        inputMint: inputToken.mint,
        outputMint: outputToken.mint,
        amount: atomicAmount,
        signal: controller.signal,
      })
        .then((order) => {
          setQuote({ key: quoteKey, order, fetchedAt: Date.now() });
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === "AbortError")
            return;
          setError(
            caught instanceof Error ? caught.message : "Quote unavailable.",
          );
        })
        .finally(() => {
          setQuoteLoading(false);
        });
    }, 450);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [atomicAmount, inputToken.mint, outputToken.mint, quoteKey, refreshNonce]);

  const setFraction = (numerator: bigint, denominator: bigint) => {
    if (!inputBalance) return;
    let available = BigInt(inputBalance);
    if (inputToken.mint === SOL_TOKEN.mint) {
      available =
        available > SOL_FEE_RESERVE ? available - SOL_FEE_RESERVE : 0n;
    }
    const selected = (available * numerator) / denominator;
    setAmount(fromAtomicAmount(String(selected), inputToken.decimals));
    setError(null);
  };

  const reversePair = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setAmount(quotedOutput ?? "");
    setQuote(null);
    setError(null);
  };

  const prepareReview = async () => {
    if (
      !publicKey ||
      !atomicAmount ||
      atomicAmount === "0" ||
      insufficientBalance
    )
      return;
    setPreparingReview(true);
    setError(null);
    try {
      const order = await fetchSwapOrder({
        inputMint: inputToken.mint,
        outputMint: outputToken.mint,
        amount: atomicAmount,
        taker: publicKey.toBase58(),
      });
      if (!order.transaction)
        throw new Error("Jupiter did not build a transaction.");
      setReviewOrder(order);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The order could not load.",
      );
    } finally {
      setPreparingReview(false);
    }
  };

  const confirmSwap = async () => {
    if (!publicKey || !signTransaction || !reviewOrder?.transaction) return;
    setSubmitting(true);
    setError(null);
    setSignature(null);
    try {
      const transaction = VersionedTransaction.deserialize(
        bytesFromBase64(reviewOrder.transaction),
      );
      const signed = await signTransaction(transaction);
      const result = await submitSignedSwap({
        signedTransaction: base64FromBytes(signed.serialize()),
        requestId: reviewOrder.requestId,
      });
      if (result.status !== "Success" || !result.signature) {
        throw new Error(result.error ?? "The swap did not confirm.");
      }
      const entry: SwapHistoryEntry = {
        signature: result.signature,
        confirmedAt: new Date().toISOString(),
        wallet: publicKey.toBase58(),
        inputToken: {
          symbol: inputToken.symbol,
          mint: inputToken.mint,
        },
        outputToken: {
          symbol: outputToken.symbol,
          mint: outputToken.mint,
        },
        inputAmount: fromAtomicAmount(
          result.inputAmountResult ?? reviewOrder.inAmount,
          inputToken.decimals,
        ),
        outputAmount: fromAtomicAmount(
          result.outputAmountResult ?? reviewOrder.outAmount,
          outputToken.decimals,
        ),
        inputUsdValue: reviewOrder.inUsdValue,
      };
      const nextHistory = [
        entry,
        ...history.filter((item) => item.signature !== entry.signature),
      ].slice(0, 50);
      setHistory(nextHistory);
      saveSwapHistory(nextHistory);
      setSignature(result.signature);
      setReviewOrder(null);
      setAmount("");
      setQuote(null);
      await refreshBalances();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The swap failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const uniqueTokens = new Set(
    history.flatMap((item) => [item.inputToken.mint, item.outputToken.mint]),
  ).size;
  const lastSwap = history[0]
    ? formatAge(clock - new Date(history[0].confirmedAt).getTime())
    : "None yet";
  const currentWalletHistory = publicKey
    ? history.filter((item) => item.wallet === publicKey.toBase58())
    : history;
  const cutoff = clock - 24 * 60 * 60 * 1_000;
  const roundSwaps = currentWalletHistory.filter(
    (item) => new Date(item.confirmedAt).getTime() >= cutoff,
  ).length;
  const totalSwaps = currentWalletHistory.length;
  const levelIndex = LEVELS.reduce(
    (selected, candidate, index) =>
      totalSwaps >= candidate.minimum ? index : selected,
    0,
  );
  const level = LEVELS[levelIndex] ?? LEVELS[0];
  const levelProgress =
    level.next === level.minimum
      ? 100
      : Math.min(
          100,
          ((totalSwaps - level.minimum) / (level.next - level.minimum)) * 100,
        );
  const roundProgress = Math.min(100, (roundSwaps / 10) * 100);
  const nextMilestone = ACTIVITY_MILESTONES.find(
    (milestone) => roundSwaps < milestone.swaps,
  );

  return (
    <div className="swap-page">
      <section className="engine-card" aria-labelledby="activity-heading">
        <header className="engine-card__header">
          <div>
            <small>CONFIRMED ACTIVITY</small>
            <h2 id="activity-heading">WALLETOR ACTIVITY ENGINE</h2>
          </div>
          <span className={`engine-status ${roundSwaps ? "active" : ""}`}>
            <i /> {roundSwaps ? "ACTIVE" : "INACTIVE"}
          </span>
        </header>

        <div className="engine-level">
          <div>
            <Sparkles size={18} />
            <strong>
              Level {levelIndex + 1} — {level.name}
            </strong>
            <span>
              XP: {totalSwaps} / {level.next} swaps
            </span>
          </div>
          <progress
            aria-label={`Level progress: ${String(Math.round(levelProgress))}%`}
            max="100"
            value={levelProgress}
          />
        </div>

        <div className="engine-pool">
          <span>
            <ShieldCheck size={19} />
            <span>
              <strong>REVENUE POOL</strong>
              <small>
                {roundSwaps
                  ? "Activity recorded; rewards are not enabled"
                  : "Complete a confirmed swap to become active"}
              </small>
            </span>
          </span>
          <strong>NOT ENABLED</strong>
        </div>

        <div className="engine-metrics">
          <div>
            <small>SWAPS IN LAST 24 HOURS</small>
            <strong>{roundSwaps}</strong>
            <span>{roundSwaps ? "VERIFIED" : "NO ACTIVITY YET"}</span>
          </div>
          <div>
            <small>ACTIVITY XP</small>
            <strong>{totalSwaps}</strong>
            <span>1 XP PER CONFIRMED SWAP</span>
          </div>
        </div>

        <div className="engine-ladder">
          <header>
            <small>24-HOUR ACTIVITY LADDER</small>
            <span>{roundSwaps} / 10</span>
          </header>
          {ACTIVITY_MILESTONES.map((milestone) => {
            const unlocked = roundSwaps >= milestone.swaps;
            const Icon = milestone.icon;
            return (
              <div
                className={`engine-milestone ${unlocked ? "unlocked" : ""}`}
                key={milestone.swaps}
              >
                <span>
                  <Icon size={16} />
                  <strong>
                    {milestone.swaps} {milestone.swaps === 1 ? "SWAP" : "SWAPS"}
                  </strong>
                </span>
                <span>{unlocked ? "UNLOCKED" : milestone.label}</span>
              </div>
            );
          })}
          <progress
            aria-label={`24-hour activity: ${String(Math.round(roundProgress))}%`}
            max="100"
            value={roundProgress}
          />
          <div className="engine-ladder__progress">
            <span>
              {nextMilestone
                ? `${String(nextMilestone.swaps - roundSwaps)} to ${nextMilestone.label}`
                : "All activity milestones reached"}
            </span>
            <span>{roundSwaps} / 10</span>
          </div>
        </div>

        <button
          type="button"
          className="engine-cta"
          onClick={() => {
            setSearchParams({});
            window.setTimeout(() => {
              document.querySelector<HTMLInputElement>("#swap-amount")?.focus();
            }, 0);
          }}
        >
          <Zap size={18} /> Swap &amp; Level Up
        </button>

        <div className="engine-proof">
          <div>
            <strong>{history.length}</strong>
            <span>CONFIRMED</span>
          </div>
          <div>
            <strong>{uniqueTokens}</strong>
            <span>TOKENS TRADED</span>
          </div>
          <div>
            <strong>{lastSwap}</strong>
            <span>LAST ACTIVITY</span>
          </div>
        </div>
        <p className="engine-disclosure">
          Device-local activity only. XP has no monetary value. Pool balances,
          boosts, airdrops, and payouts remain disabled until verified treasury
          accounting is deployed.
        </p>
      </section>

      <section className="swap-card" aria-labelledby="swap-heading">
        <div className="network-row">
          <span>NETWORK</span>
          <div className="network-tabs" aria-label="Selected network">
            <button className="network-tab network-tab--active">
              <i className="solana-dot" /> SOLANA
            </button>
          </div>
        </div>
        <div className="swap-card__tabs">
          <button
            className={historyView ? "" : "active"}
            onClick={() => {
              setSearchParams({});
            }}
          >
            Swap
          </button>
          <button
            className={historyView ? "active" : ""}
            onClick={() => {
              setSearchParams({ view: "history" });
            }}
          >
            <Clock3 size={15} /> History
          </button>
          {!historyView && (
            <button
              className={`settings-button ${settingsOpen ? "active" : ""}`}
              aria-label="Swap settings"
              aria-expanded={settingsOpen}
              onClick={() => {
                setSettingsOpen((value) => !value);
              }}
            >
              <Settings2 size={19} />
            </button>
          )}
        </div>
        <h1 id="swap-heading" className="sr-only">
          Swap tokens with Jupiter
        </h1>

        {historyView ? (
          <div className="swap-history-panel">
            <header>
              <h2>Confirmed swaps</h2>
              <small>Stored privately on this device</small>
            </header>
            {history.length ? (
              history.map((item) => (
                <a
                  key={item.signature}
                  href={`https://solscan.io/tx/${encodeURIComponent(item.signature)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>
                    <strong>
                      {item.inputAmount} {item.inputToken.symbol} →{" "}
                      {item.outputAmount} {item.outputToken.symbol}
                    </strong>
                    <small>
                      {new Date(item.confirmedAt).toLocaleString()} ·{" "}
                      {formatUsd(item.inputUsdValue)}
                    </small>
                  </span>
                  <ExternalLink size={16} />
                </a>
              ))
            ) : (
              <div className="history-empty">
                <Clock3 />
                <strong>No confirmed swaps yet</strong>
                <p>Completed Walletor swaps will be counted and listed here.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {settingsOpen && (
              <div className="swap-settings-panel">
                <strong>Automatic execution protection</strong>
                <p>
                  Jupiter RTSE optimizes slippage and priority fees for current
                  network conditions. Walletor shows the final minimum received
                  before you sign.
                </p>
              </div>
            )}
            <div className="amount-panel amount-panel--pay">
              <div className="amount-panel__label">
                <span>You pay</span>
                <span>
                  Balance:{" "}
                  {balanceLoading
                    ? "Loading…"
                    : inputBalance
                      ? `${fromAtomicAmount(inputBalance, inputToken.decimals)} ${inputToken.symbol}`
                      : "—"}
                </span>
              </div>
              <div className="amount-panel__input">
                <input
                  id="swap-amount"
                  aria-label="Amount to pay"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setError(null);
                  }}
                />
                <TokenPicker
                  token={inputToken}
                  onChange={(selected) => {
                    setInputToken(selected);
                    setAmount("");
                    setQuote(null);
                  }}
                  exclude={outputToken.mint}
                />
              </div>
              {connected && (
                <div className="balance-actions">
                  <button
                    onClick={() => {
                      setFraction(1n, 4n);
                    }}
                  >
                    25%
                  </button>
                  <button
                    onClick={() => {
                      setFraction(1n, 2n);
                    }}
                  >
                    50%
                  </button>
                  <button
                    onClick={() => {
                      setFraction(1n, 1n);
                    }}
                  >
                    MAX
                  </button>
                </div>
              )}
            </div>
            <button
              className="reverse-button"
              onClick={reversePair}
              aria-label="Reverse token pair"
            >
              <ArrowDownUp size={18} />
            </button>
            <div className="amount-panel amount-panel--receive">
              <div className="amount-panel__label">
                <span>You receive</span>
                <span>
                  {outputToken.isVerified
                    ? "Verified token"
                    : "Unverified token"}
                </span>
              </div>
              <div className="amount-panel__input">
                <output aria-label="Estimated amount received">
                  {quoteLoading ? (
                    <LoaderCircle className="spin" size={24} />
                  ) : (
                    (quotedOutput ?? "0.00")
                  )}
                </output>
                <TokenPicker
                  token={outputToken}
                  onChange={(selected) => {
                    setOutputToken(selected);
                    setQuote(null);
                  }}
                  exclude={inputToken.mint}
                />
              </div>
            </div>

            {(insufficientBalance || lowSolForFees) && (
              <div className="balance-warning">
                {insufficientBalance
                  ? `Insufficient ${inputToken.symbol} balance.`
                  : "Your SOL balance is low; the wallet may need SOL for network fees."}
              </div>
            )}

            <div className="quote-status">
              <span>
                {error ??
                  (activeQuote
                    ? `${activeQuote.order.router ?? "Jupiter"} route · ${formatPercent(activeQuote.order.priceImpactPct)}% impact`
                    : amount
                      ? "Finding the best Jupiter route…"
                      : "Enter an amount to get a quote")}
              </span>
              {activeQuote && (
                <button
                  className={quoteExpired ? "expired" : ""}
                  onClick={() => {
                    setRefreshNonce((value) => value + 1);
                  }}
                >
                  {quoteExpired
                    ? "Refresh quote"
                    : `Updated ${String(Math.floor(quoteAge / 1_000))}s ago`}
                </button>
              )}
            </div>

            {activeQuote && (
              <div className="quote-details">
                <span>
                  <small>Minimum received</small>
                  <strong>
                    {activeQuote.order.otherAmountThreshold
                      ? `${fromAtomicAmount(
                          activeQuote.order.otherAmountThreshold,
                          outputToken.decimals,
                        )} ${outputToken.symbol}`
                      : "Protected by RTSE"}
                  </strong>
                </span>
                <span>
                  <small>Value</small>
                  <strong>{formatUsd(activeQuote.order.outUsdValue)}</strong>
                </span>
                <span>
                  <small>Jupiter fee</small>
                  <strong>
                    {activeQuote.order.feeBps !== null
                      ? `${String(activeQuote.order.feeBps)} bps`
                      : "Included"}
                  </strong>
                </span>
              </div>
            )}

            {!connected ? (
              <WalletModalButton className="swap-primary-button">
                Connect Wallet
              </WalletModalButton>
            ) : (
              <button
                className="swap-primary-button"
                disabled={
                  !quotedOutput ||
                  quoteExpired ||
                  insufficientBalance ||
                  preparingReview
                }
                onClick={() => {
                  void prepareReview();
                }}
              >
                {preparingReview ? (
                  <>
                    <LoaderCircle className="spin" size={20} /> Preparing final
                    order
                  </>
                ) : (
                  "Review final order"
                )}
              </button>
            )}

            {signature && (
              <a
                className="swap-success"
                href={`https://solscan.io/tx/${encodeURIComponent(signature)}`}
                target="_blank"
                rel="noreferrer"
              >
                <CheckCircle2 size={17} /> Swap confirmed · View on Solscan
              </a>
            )}
            <div className="jupiter-credit">
              <ShieldCheck size={16} /> Powered by Jupiter · Walletor never
              holds your funds
            </div>
          </>
        )}
      </section>

      {reviewOrder && (
        <div className="review-modal-backdrop" role="presentation">
          <section
            className="review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
          >
            <header>
              <div>
                <small>FINAL JUPITER ORDER</small>
                <h2 id="review-title">Review before signing</h2>
              </div>
              <button
                aria-label="Close final order"
                onClick={() => {
                  if (!submitting) setReviewOrder(null);
                }}
              >
                <X />
              </button>
            </header>
            <div className="review-route">
              <span>
                <TokenIcon token={inputToken} />
                <strong>
                  {fromAtomicAmount(reviewOrder.inAmount, inputToken.decimals)}{" "}
                  {inputToken.symbol}
                </strong>
              </span>
              <ArrowDownUp />
              <span>
                <TokenIcon token={outputToken} />
                <strong>
                  {fromAtomicAmount(
                    reviewOrder.outAmount,
                    outputToken.decimals,
                  )}{" "}
                  {outputToken.symbol}
                </strong>
              </span>
            </div>
            <dl>
              <div>
                <dt>Minimum received</dt>
                <dd>
                  {reviewOrder.otherAmountThreshold
                    ? `${fromAtomicAmount(
                        reviewOrder.otherAmountThreshold,
                        outputToken.decimals,
                      )} ${outputToken.symbol}`
                    : "Protected by Jupiter RTSE"}
                </dd>
              </div>
              <div>
                <dt>Price impact</dt>
                <dd>{formatPercent(reviewOrder.priceImpactPct)}%</dd>
              </div>
              <div>
                <dt>Route</dt>
                <dd>{reviewOrder.router ?? "Jupiter"}</dd>
              </div>
              <div>
                <dt>Jupiter fee</dt>
                <dd>
                  {reviewOrder.feeBps !== null
                    ? `${String(reviewOrder.feeBps)} bps · included`
                    : "Included in order"}
                </dd>
              </div>
            </dl>
            <p>
              Your wallet will show the transaction for approval. Walletor
              cannot move funds without your signature.
            </p>
            <button
              className="swap-primary-button"
              disabled={submitting}
              onClick={() => {
                void confirmSwap();
              }}
            >
              {submitting ? (
                <>
                  <LoaderCircle className="spin" size={20} /> Waiting for wallet
                </>
              ) : (
                "Confirm in wallet"
              )}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
