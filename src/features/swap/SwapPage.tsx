import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import {
  ArrowDownUp,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LoaderCircle,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchSwapOrder, submitSignedSwap } from "../../lib/swap";
import {
  fromAtomicAmount,
  SOL_TOKEN,
  SWAP_TOKENS,
  toAtomicAmount,
  type SwapToken,
  USDC_TOKEN,
} from "./tokens";

function bytesFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64FromBytes(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function TokenSelect({
  token,
  onChange,
  exclude,
}: {
  token: SwapToken;
  onChange: (token: SwapToken) => void;
  exclude: string;
}) {
  return (
    <label className="token-select">
      <span className="token-icon" style={{ background: token.color }}>
        {token.symbol.slice(0, 1)}
      </span>
      <select
        aria-label={`Select ${token.symbol} token`}
        value={token.mint}
        onChange={(event) => {
          const selected = SWAP_TOKENS.find(
            (item) => item.mint === event.target.value,
          );
          if (selected) onChange(selected);
        }}
      >
        {SWAP_TOKENS.filter((item) => item.mint !== exclude).map((item) => (
          <option key={item.mint} value={item.mint}>
            {item.symbol}
          </option>
        ))}
      </select>
      <ChevronDown size={17} aria-hidden="true" />
    </label>
  );
}

export function SwapPage() {
  const { publicKey, signTransaction, connected } = useWallet();
  const [inputToken, setInputToken] = useState(SOL_TOKEN);
  const [outputToken, setOutputToken] = useState(USDC_TOKEN);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<{
    key: string;
    output: string;
    meta: string;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const atomicAmount = useMemo(
    () => toAtomicAmount(amount, inputToken.decimals),
    [amount, inputToken.decimals],
  );
  const quoteKey = `${inputToken.mint}:${outputToken.mint}:${atomicAmount ?? ""}`;
  const quotedOutput = quote?.key === quoteKey ? quote.output : null;
  const quoteMeta = quote?.key === quoteKey ? quote.meta : null;

  useEffect(() => {
    if (!atomicAmount || atomicAmount === "0") return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setQuoteLoading(true);
      void fetchSwapOrder({
        inputMint: inputToken.mint,
        outputMint: outputToken.mint,
        amount: atomicAmount,
        signal: controller.signal,
      })
        .then((order) => {
          setQuote({
            key: quoteKey,
            output: fromAtomicAmount(order.outAmount, outputToken.decimals),
            meta: `${order.router ?? "Jupiter"} · ${order.priceImpactPct ?? "0"}% impact`,
          });
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
  }, [atomicAmount, inputToken, outputToken, quoteKey]);

  const reversePair = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setAmount(quotedOutput ?? "");
    setQuote(null);
    setError(null);
  };

  const execute = async () => {
    if (!publicKey || !signTransaction || !atomicAmount || atomicAmount === "0")
      return;
    setSubmitting(true);
    setError(null);
    setSignature(null);
    try {
      const order = await fetchSwapOrder({
        inputMint: inputToken.mint,
        outputMint: outputToken.mint,
        amount: atomicAmount,
        taker: publicKey.toBase58(),
      });
      if (!order.transaction)
        throw new Error("Jupiter did not build a transaction.");
      const transaction = VersionedTransaction.deserialize(
        bytesFromBase64(order.transaction),
      );
      const signed = await signTransaction(transaction);
      const result = await submitSignedSwap({
        signedTransaction: base64FromBytes(signed.serialize()),
        requestId: order.requestId,
      });
      if (result.status !== "Success" || !result.signature) {
        throw new Error(result.error ?? "The swap did not confirm.");
      }
      setSignature(result.signature);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The swap failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="swap-page">
      <section className="pool-stage" aria-labelledby="pool-heading">
        <div className="pool-stage__label">
          <span className="status-dot" /> WIN FROM THE POOL
        </div>
        <div className="pool-orbit">
          <div className="pool-orbit__inner">
            <p id="pool-heading">REVENUE POOL</p>
            <strong>$1,200,006.02</strong>
            <span>
              <Sparkles size={13} /> DEMO DISPLAY
            </span>
          </div>
        </div>
        <div className="distribution-countdown">
          <p>NEXT DISTRIBUTION</p>
          <div>
            <strong>02</strong>
            <i>:</i>
            <strong>14</strong>
            <i>:</i>
            <strong>16</strong>
          </div>
          <small>
            hrs &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; min
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; sec
          </small>
        </div>
        <div className="pool-progress">
          <span>
            <i />
          </span>
          <div>
            <small>Daily round</small>
            <small>91% complete</small>
          </div>
        </div>
        <div className="pool-metrics">
          <div>
            <strong>$1.20M</strong>
            <span>POOL SIZE</span>
          </div>
          <div>
            <strong>$30.00M</strong>
            <span>DISTRIBUTED</span>
          </div>
          <div>
            <strong>135.0K</strong>
            <span>TRADERS</span>
          </div>
        </div>
      </section>

      <section className="swap-card" aria-labelledby="swap-heading">
        <div className="network-row">
          <span>NETWORK</span>
          <div className="network-tabs">
            <button className="network-tab network-tab--active">
              <i className="solana-dot" /> SOL
            </button>
            <button disabled>
              <i className="bnb-dot" /> BNB
            </button>
            <button disabled>
              <i className="eth-dot" /> ETH
            </button>
          </div>
        </div>
        <div className="swap-card__tabs">
          <button className="active">Swap</button>
          <button disabled>
            <Clock3 size={15} /> History
          </button>
          <button className="settings-button" aria-label="Swap settings">
            <Settings2 size={19} />
          </button>
        </div>
        <h1 id="swap-heading" className="sr-only">
          Swap tokens with Jupiter
        </h1>

        <div className="amount-panel amount-panel--pay">
          <div className="amount-panel__label">
            <span>You pay</span>
            <span>Balance: —</span>
          </div>
          <div className="amount-panel__input">
            <input
              aria-label="Amount to pay"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
            />
            <TokenSelect
              token={inputToken}
              onChange={setInputToken}
              exclude={outputToken.mint}
            />
          </div>
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
            <span />
          </div>
          <div className="amount-panel__input">
            <output aria-label="Estimated amount received">
              {quoteLoading ? (
                <LoaderCircle className="spin" size={24} />
              ) : (
                (quotedOutput ?? "0.00")
              )}
            </output>
            <TokenSelect
              token={outputToken}
              onChange={setOutputToken}
              exclude={inputToken.mint}
            />
          </div>
        </div>

        <div className="quote-status">
          {error ??
            quoteMeta ??
            (amount
              ? "Finding the best Jupiter route…"
              : "Enter an amount to get a quote")}
        </div>

        {!connected ? (
          <WalletMultiButton className="swap-primary-button" />
        ) : (
          <button
            className="swap-primary-button"
            disabled={!quotedOutput || submitting}
            onClick={() => {
              void execute();
            }}
          >
            {submitting ? (
              <>
                <LoaderCircle className="spin" size={20} /> Waiting for wallet
              </>
            ) : (
              "Review swap"
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
          <ShieldCheck size={16} /> Powered by Jupiter · Best execution on
          Solana
        </div>
      </section>
    </div>
  );
}
