import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./AppShell";
import { NewTokensPage } from "../features/tokens/NewTokensPage";
import { TokenDetailPage } from "../features/tokens/TokenDetailPage";
import { TrendingPage } from "../features/tokens/TrendingPage";
import { NotFoundPage } from "../features/tokens/NotFoundPage";
import { SolanaProvider } from "../features/swap/SolanaProvider";
import { SwapPage } from "../features/swap/SwapPage";
import { UnavailablePage } from "./UnavailablePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: (failureCount, error) =>
        error instanceof Error &&
        "retryable" in error &&
        error.retryable === true &&
        failureCount < 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <SolanaProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/swap" replace />} />
              <Route path="swap" element={<SwapPage />} />
              <Route
                path="revenue-pool"
                element={<UnavailablePage title="Revenue Pool" />}
              />
              <Route
                path="rewards"
                element={<UnavailablePage title="Rewards" />}
              />
              <Route
                path="history"
                element={<Navigate to="/swap?view=history" replace />}
              />
              <Route path="trending" element={<TrendingPage />} />
              <Route path="new-tokens" element={<NewTokensPage />} />
              <Route path="tokens/:address" element={<TokenDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </SolanaProvider>
  );
}
