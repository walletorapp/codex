import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiList } from "../../../tests/fixtures";
import { TrendingPage } from "./TrendingPage";

describe("TrendingPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders normalized API data and a token route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(apiList()), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Trending on Solana" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /SOL/i })).toHaveAttribute(
      "href",
      "/tokens/So11111111111111111111111111111111111111112",
    );
    expect(screen.queryByText(/revenue pool/i)).not.toBeInTheDocument();
  });

  it("shows an honest configuration error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "MARKET_DATA_NOT_CONFIGURED",
              message: "Market data is not configured for this environment.",
              retryable: false,
            },
            meta: { requestId: "test-request" },
          }),
          { status: 503 },
        ),
      ),
    );
    renderPage();
    expect(
      await screen.findByText(
        "Market data is not configured for this environment.",
      ),
    ).toBeInTheDocument();
  });
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TrendingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
