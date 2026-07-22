import { Clock3, Droplets, Radar, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/QueryState";
import { TokenAvatar } from "../../components/TokenAvatar";
import {
  formatAge,
  formatPercent,
  formatUsd,
  shortAddress,
} from "../../lib/format";
import { useNewTokens } from "./useTokens";

export function NewTokensPage() {
  const [query, setQuery] = useState("");
  const result = useNewTokens();
  const filtered =
    result.data?.filter((token) =>
      [token.name, token.symbol, token.address].some((value) =>
        value.toLowerCase().includes(query.toLowerCase()),
      ),
    ) ?? [];

  return (
    <section className="page-stack">
      <div className="hero hero--radar">
        <div>
          <p className="eyebrow eyebrow--accent">
            <Radar size={13} aria-hidden="true" /> New token radar
          </p>
          <h1>Fresh Solana listings</h1>
          <p>
            Recently listed tokens only. Walletor does not substitute unrelated
            tokens when this feed fails.
          </p>
        </div>
        <div className="radar-visual" aria-hidden="true">
          <span />
          <i />
          <b />
        </div>
      </div>
      <div className="section-heading">
        <div>
          <h2>Latest detections</h2>
          <p>Market data can be sparse immediately after listing.</p>
        </div>
        <label className="search-field">
          <Search size={16} />
          <span className="sr-only">Filter new tokens</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Filter radar"
          />
        </label>
      </div>
      {result.isPending ? (
        <LoadingState label="Scanning new listings" />
      ) : result.isError ? (
        <ErrorState
          error={result.error}
          onRetry={() => void result.refetch()}
        />
      ) : result.data.length === 0 ? (
        <EmptyState
          title="No new listings detected"
          body="The new-listing feed is healthy but currently empty."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching listings"
          body={`Nothing on the radar matches “${query}”.`}
        />
      ) : (
        <div className="token-grid">
          {filtered.map((token) => (
            <Link
              className="token-card"
              to={`/tokens/${token.address}`}
              key={token.address}
            >
              <div className="token-card__top">
                <TokenAvatar
                  logoUrl={token.logoUrl}
                  symbol={token.symbol}
                  size="lg"
                />
                <span>
                  <strong>{token.symbol}</strong>
                  <small>{token.name}</small>
                </span>
                <Sparkles size={15} className="token-card__spark" />
              </div>
              <code>{shortAddress(token.address)}</code>
              <div className="token-card__stats">
                <span>
                  <small>Price</small>
                  <strong>{formatUsd(token.priceUsd)}</strong>
                </span>
                <span>
                  <small>Liquidity</small>
                  <strong>{formatUsd(token.liquidityUsd)}</strong>
                </span>
                <span>
                  <small>24h move</small>
                  <strong
                    className={
                      token.priceChange24hPercent !== null &&
                      token.priceChange24hPercent < 0
                        ? "negative"
                        : "positive"
                    }
                  >
                    {formatPercent(token.priceChange24hPercent)}
                  </strong>
                </span>
              </div>
              <div className="token-card__foot">
                <span>
                  <Clock3 size={13} /> {formatAge(token.listedAt)} ago
                </span>
                <span>
                  <Droplets size={13} /> Birdeye
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
