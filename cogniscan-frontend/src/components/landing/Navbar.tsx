"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav
      className="sticky top-0 z-100"
      style={{
        background: "rgba(227, 224, 215, 0.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: "16px 32px",
          maxWidth: "1240px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* Logo */}
        <Link
          href="#"
          className="font-serif no-underline"
          style={{
            fontSize: "26px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--on-surface)",
          }}
        >
          Cogni<em className="italic" style={{ color: "var(--primary)", fontWeight: 500 }}>Scan</em>
        </Link>

        {/* Nav links */}
        <div className="flex items-center" style={{ gap: "36px" }}>
          <Link
            href="#cara-kerja"
            className="hidden md:inline no-underline transition-colors hover:text-primary"
            style={{ color: "var(--on-surface-variant)", fontSize: "14px", fontWeight: 500 }}
          >
            Cara Kerja
          </Link>
          <Link
            href="#fitur"
            className="hidden md:inline no-underline transition-colors hover:text-primary"
            style={{ color: "var(--on-surface-variant)", fontSize: "14px", fontWeight: 500 }}
          >
            Fitur
          </Link>
          <Link
            href="#untuk-siapa"
            className="hidden md:inline no-underline transition-colors hover:text-primary"
            style={{ color: "var(--on-surface-variant)", fontSize: "14px", fontWeight: 500 }}
          >
            Untuk Siapa
          </Link>
          <Link
            href="#faq"
            className="hidden md:inline no-underline transition-colors hover:text-primary"
            style={{ color: "var(--on-surface-variant)", fontSize: "14px", fontWeight: 500 }}
          >
            Pertanyaan
          </Link>
          <Link href="#mulai" className="nav-cta">
            Mulai Refleksi
          </Link>
        </div>
      </div>
    </nav>
  );
}
