"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 520);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <button
      type="button"
      aria-label="Kembali ke atas"
      onClick={scrollToTop}
      className={[
        "fixed bottom-5 right-5 z-[90] inline-flex h-11 w-11 items-center justify-center rounded-full",
        "border border-primary/15 bg-white/90 text-primary shadow-[0_18px_36px_-18px_rgba(27,28,26,0.28)]",
        "backdrop-blur transition-all duration-300 hover:border-tertiary-container hover:bg-tertiary-container hover:text-on-tertiary-container",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      ].join(" ")}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
