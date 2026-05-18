"use client";

import { useEffect, useState } from "react";
import LoadingPage from "./page";

const INITIAL_LOADING_DURATION_MS = 700;

export function GlobalPageLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false);
    }, INITIAL_LOADING_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <LoadingPage
      isLoading={isLoading}
      text="Memuat..."
      onHidden={() => setShouldRender(false)}
    />
  );
}
