import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ApiError } from "./api";

type State<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
  refresh: () => void;
  setData: (data: T) => void;
};

/**
 * Loads async data on screen focus (so tab screens refresh when revisited),
 * with pull-to-refresh and error handling. Pass any fetcher — its identity is
 * captured in a ref, so callers don't need to memoize it.
 */
export function useAsyncData<T>(fn: () => Promise<T>): State<T> {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (mode: "load" | "refresh") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      setData(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      run("load");
    }, [run]),
  );

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => run("load"),
    refresh: () => run("refresh"),
    setData,
  };
}
