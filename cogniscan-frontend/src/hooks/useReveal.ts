"use client";

import { useEffect, useRef } from "react";

/**
 * Adds IntersectionObserver-based reveal animation.
 * Content stays visible by default; the hook opts it into the hidden
 * animation state so browser back/restore can never leave sections blank.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.classList.add("reveal-observed");

    const reveal = () => {
      el.classList.add("in");
    };

    const revealIfAlreadyReached = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.92 || rect.bottom < 0) {
        reveal();
        return true;
      }

      return false;
    };

    const handlePageShow = () => {
      revealIfAlreadyReached();
    };

    if (revealIfAlreadyReached()) {
      window.addEventListener("pageshow", handlePageShow);
      return () => {
        window.removeEventListener("pageshow", handlePageShow);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            reveal();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px 80px 0px" }
    );

    observer.observe(el);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      observer.disconnect();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return ref;
}
