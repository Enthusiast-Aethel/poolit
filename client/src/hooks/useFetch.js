import { useCallback, useEffect, useState } from "react";
import api from "../api/client";

// const { data, loading, error, reload } = useFetch("/members/overview")
export default function useFetch(url, { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (skip || !url) return;
    setLoading(true);
    setError("");
    try {
      setData((await api.get(url)).data);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load this page. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [url, skip]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
