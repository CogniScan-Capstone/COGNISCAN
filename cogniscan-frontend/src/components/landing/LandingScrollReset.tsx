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

    const scrollToHero = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    scrollToHero();

    const timeouts = [0, 50, 150, 350].map((delay) =>
      window.setTimeout(scrollToHero, delay),
    );

    const handlePageShow = () => {
      if (window.location.pathname === "/" && !window.location.hash) {
        scrollToHero();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener("pageshow", handlePageShow);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [pathname]);

  useEffect(() => {
    if (window.location.hash) return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return null;
}
