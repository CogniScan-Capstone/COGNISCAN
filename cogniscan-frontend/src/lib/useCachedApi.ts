"use client";

import { useEffect, useRef, useState } from "react";
import { getCached, isFresh, setCached } from "@/lib/apiCache";
import { supabase } from "@/lib/supabase/client";

/**
 * Hook for fetching API data with instant cache.
 *
 * On mount:
 * 1. If cached data exists -> show it immediately (loading = false)
 * 2. If cache is stale -> refresh in background without showing loader
 * 3. If no cache -> show loading, fetch, then show data
 *
 * @param cacheKey  Unique key for this data (e.g. "psikolog-dashboard")
 * @param fetcher   Async function that takes accessToken and returns data
 * @param options   Optional: ttlMs (cache freshness), enabled (skip fetch)
 */
export function useCachedApi<T>(
  cacheKey: string,
  fetcher: (accessToken: string) => Promise<T>,
  options?: { ttlMs?: number; enabled?: boolean },
) {
  const ttlMs = options?.ttlMs ?? 30_000;
  const enabled = options?.enabled ?? true;

  const cached = ttlMs === 0 ? null : getCached<T>(cacheKey);
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const fetchData = async (showLoader = false) => {
    await Promise.resolve();
    if (!mountedRef.current) return;

    if (showLoader) setLoading(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
      }

      const result = await fetcher(accessToken);
      setCached(cacheKey, result);

      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Gagal memuat data.");
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (enabled && !(cached !== null && isFresh(cacheKey, ttlMs))) {
      timeoutId = setTimeout(() => {
        void fetchData(cached === null);
      }, 0);
    }

    return () => {
      mountedRef.current = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled]);

  return { data, loading, error, refetch: () => fetchData(true) };
}
