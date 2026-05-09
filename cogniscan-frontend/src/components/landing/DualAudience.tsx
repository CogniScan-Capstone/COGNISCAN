"use client";

import { useReveal } from "@/hooks/useReveal";
import { ArrowRight } from "@/components/icons";

export default function DualAudience() {
  const headerRef = useReveal<HTMLDivElement>();
  const gridRef = useReveal<HTMLDivElement>();

  return (
    <section
      id="untuk-siapa"
      className="bg-surface-low"
      style={{ padding: "140px 0" }}
    >
      <div className="container-main">
        {/* Header */}
        <div ref={headerRef} className="reveal" style={{ marginBottom: "64px" }}>
          <span className="eyebrow" style={{ marginBottom: "24px", display: "block" }}>
            Untuk siapa
          </span>
          <h2 className="section-title">
            Dua sisi dari <em>satu</em> percakapan.
          </h2>
        </div>

        {/* Dual grid */}
        <div
          ref={gridRef}
          className="reveal grid grid-cols-1 lg:grid-cols-2"
          style={{ gap: "24px" }}
        >
          {/* Pasien Card */}
          <div className="dual-card bg-surface-lowest text-on-surface">
            <div>
              <span className="dual-tag text-primary">
                Untuk kamu yang sedang mencari ruang
              </span>
              <h3
                className="font-serif font-normal text-on-surface"
                style={{
                  fontSize: "38px",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  marginBottom: "24px",
                  maxWidth: "380px",
                }}
              >
                Tempat pribadi untuk memulai{" "}
                <em className="italic font-light text-primary">
                  percakapan dengan diri.
                </em>
              </h3>
              <p
                className="text-on-surface-variant"
                style={{
                  fontSize: "16.5px",
                  lineHeight: 1.6,
                  marginBottom: "32px",
                  maxWidth: "420px",
                }}
              >
                Kamu tidak perlu tahu apa yang sedang kamu rasakan untuk mulai.
                Cerita saja apa adanya — sistem akan membantumu menemukan
                kata-katanya.
              </p>
              <ul className="dual-list">
                <li>Daftar gratis, langsung mulai refleksi</li>
                <li>Hasil bisa kamu simpan, bagikan, atau lupakan</li>
                <li>Lanjut ke psikolog mitra hanya jika kamu mau</li>
              </ul>
            </div>
            <a
              href="#mulai"
              className="dual-cta"
              style={{
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)",
                color: "#ffffff",
                boxShadow: "0 12px 28px -12px rgba(81,99,78,0.4)",
              }}
            >
              Mulai refleksi
              <ArrowRight />
            </a>
          </div>

          {/* Psikolog Card */}
          <div className="dual-card bg-on-surface text-surface">
            <div>
              <span className="dual-tag text-tertiary">
                Untuk psikolog praktisi mandiri
              </span>
              <h3
                className="font-serif font-normal"
                style={{
                  fontSize: "38px",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  marginBottom: "24px",
                  maxWidth: "380px",
                }}
              >
                Mitra dalam menjangkau mereka yang{" "}
                <em className="italic font-light text-primary-fixed-dim">
                  belum siap datang.
                </em>
              </h3>
              <p
                style={{
                  fontSize: "16.5px",
                  lineHeight: 1.6,
                  marginBottom: "32px",
                  maxWidth: "420px",
                  color: "rgba(251,249,245,0.82)",
                }}
              >
                Klien datang dengan pre-assessment yang sudah diringkas AI.
                Anda fokus pada pekerjaan klinis, bukan administrasi awal.
              </p>
              <ul className="dual-list">
                <li>Verifikasi STR & SIPP otomatis lewat HIMPSI</li>
                <li>Dashboard klien dengan ringkasan refleksi terbaru</li>
                <li>Atur tarif & jadwal praktek mandiri sendiri</li>
              </ul>
            </div>
            <a
              href="#daftar-psikolog"
              className="dual-cta bg-surface text-on-surface hover:bg-tertiary-container"
            >
              Daftar sebagai mitra
              <ArrowRight />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
