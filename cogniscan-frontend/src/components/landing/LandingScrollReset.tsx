"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export default function LandingScrollReset() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname !== "/" || window.location.hash) return;

    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/" || window.location.hash) return;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    let cancelled = false;
    let timeouts: number[] = [];

    const scrollToHero = () => {
      if (cancelled || window.location.hash) return;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    const cancelForcedScroll = () => {
      cancelled = true;
      timeouts.forEach(window.clearTimeout);
      timeouts = [];
    };

    scrollToHero();

    timeouts = [0, 50, 150, 350].map((delay) =>
      window.setTimeout(scrollToHero, delay),
    );

    const handlePageShow = () => {
      if (window.location.pathname === "/" && !window.location.hash) {
        scrollToHero();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("hashchange", cancelForcedScroll);
    window.addEventListener("pointerdown", cancelForcedScroll, { once: true });
    window.addEventListener("wheel", cancelForcedScroll, { once: true, passive: true });
    window.addEventListener("touchstart", cancelForcedScroll, { once: true, passive: true });
    window.addEventListener("keydown", cancelForcedScroll, { once: true });

    return () => {
      cancelForcedScroll();
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("hashchange", cancelForcedScroll);
      window.removeEventListener("pointerdown", cancelForcedScroll);
      window.removeEventListener("wheel", cancelForcedScroll);
      window.removeEventListener("touchstart", cancelForcedScroll);
      window.removeEventListener("keydown", cancelForcedScroll);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [pathname]);

  useEffect(() => {
    if (window.location.hash) return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return null;
}
