"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 968) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navLinks = [
    { href: "#cara-kerja", label: "Cara Kerja" },
    { href: "#fitur", label: "Fitur" },
    { href: "#faq", label: "Pertanyaan" },
    { href: "#untuk-siapa", label: "Daftar Sebagai Psikolog" },
  ];

  return (
    <>
      <nav className={`landing-nav ${scrolled ? "landing-nav--scrolled" : ""}`}>
        <div className="landing-nav__inner">
          {/* Logo */}
          <Link href="#" className="landing-nav__logo">
            <Image
              src="/logo.png"
              alt="CogniScan Logo"
              width={160}
              height={44}
              priority
            />
          </Link>

          {/* Desktop nav links */}
          <div className="landing-nav__links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="landing-nav__link"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className={`landing-nav__hamburger ${mobileOpen ? "landing-nav__hamburger--open" : ""}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="landing-nav__mobile-overlay" onClick={() => setMobileOpen(false)}>
          <div
            className="landing-nav__mobile-menu"
            onClick={(e) => e.stopPropagation()}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="landing-nav__mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
