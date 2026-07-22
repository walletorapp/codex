import { Activity, Clock3, Database, Search } from "lucide-react";
import { useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/QueryState";
import { TokenTable } from "./TokenTable";
import { useTrending } from "./useTokens";

export function TrendingPage() {
  const [query, setQuery] = useState("");
  const result = useTrending();

  return (
    <section className="page-stack">
      <div className="hero">
        <div>
          <p className="eyebrow eyebrow--accent">
            <Activity size={13} aria-hidden="true" /> Market pulse
          </p>
          <h1>Trending on Solana</h1>
          <p>Ranked market activity from Jupiter, normalized by Walletor.</p>
        </div>
        <div className="source-pill">
          <span className="status-dot" /> Jupiter · refreshes every 45s
        </div>
      </div>

      <div className="metric-grid">
        <Metric
          icon={Database}
          label="Tokens in view"
          value={result.data ? String(result.data.length) : "—"}
        />
        <Metric icon={Activity} label="Data mode" value="Live API" />
        <Metric icon={Clock3} label="Refresh cadence" value="45 seconds" />
      </div>

      <div className="section-heading">
        <div>
          <h2>Market leaderboard</h2>
          <p>Select a row to inspect the token.</p>
        </div>
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search tokens</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Search name, symbol, or mint"
          />
        </label>
      </div>

      {result.isPending ? (
        <LoadingState />
      ) : result.isError ? (
        <ErrorState
          error={result.error}
          onRetry={() => void result.refetch()}
        />
      ) : result.data.length === 0 ? (
        <EmptyState
          title="No trending tokens"
          body="Jupiter returned an empty ranked list. Try again shortly."
        />
      ) : (
        <TokenTable tokens={result.data} query={query} />
      )}
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <span className="metric-card__icon">
        <Icon size={17} />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
