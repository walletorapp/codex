import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./AppShell";
import { NewTokensPage } from "../features/tokens/NewTokensPage";
import { TokenDetailPage } from "../features/tokens/TokenDetailPage";
import { TrendingPage } from "../features/tokens/TrendingPage";
import { NotFoundPage } from "../features/tokens/NotFoundPage";

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/trending" replace />} />
            <Route path="trending" element={<TrendingPage />} />
            <Route path="new-tokens" element={<NewTokensPage />} />
            <Route path="tokens/:address" element={<TokenDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
