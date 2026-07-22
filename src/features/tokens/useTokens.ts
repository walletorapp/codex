import { useQuery } from "@tanstack/react-query";

import { fetchNewTokens, fetchToken, fetchTrending } from "../../lib/api";

export function useTrending() {
  return useQuery({
    queryKey: ["tokens", "trending"],
    queryFn: ({ signal }) => fetchTrending(signal),
    refetchInterval: 45_000,
  });
}

export function useNewTokens() {
  return useQuery({
    queryKey: ["tokens", "new"],
    queryFn: ({ signal }) => fetchNewTokens(signal),
    refetchInterval: 60_000,
  });
}

export function useToken(address: string) {
  return useQuery({
    queryKey: ["tokens", "detail", address],
    queryFn: ({ signal }) => fetchToken(address, signal),
    enabled: Boolean(address),
    refetchInterval: 45_000,
  });
}
