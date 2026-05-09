"use client";

import { useEffect, useRef } from "react";

/**
 * Custom hook that adds IntersectionObserver-based reveal animation.
 * Elements with class "reveal" will get "in" class added when visible.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return ref;
}
