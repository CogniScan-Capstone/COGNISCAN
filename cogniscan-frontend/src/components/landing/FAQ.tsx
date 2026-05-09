"use client";

import { useState } from "react";
import { useReveal } from "@/hooks/useReveal";

const faqData = [
  {
    q: "Apakah hasilnya bisa dilihat keluarga atau orang lain?",
    a: "Tidak. Refleksi kamu dienkripsi dan hanya bisa diakses oleh kamu (lewat akun yang kamu buat sendiri) dan psikolog mitra yang kamu pilih untuk konsultasi. CogniScan tidak akan pernah memberikan data ke pihak ketiga termasuk keluarga, kampus, atau perusahaan tanpa persetujuan eksplisit dari kamu.",
  },
  {
    q: "Apa bedanya dengan terapi langsung dengan psikolog?",
    a: "CogniScan adalah alat skrining awal \u2014 bukan pengganti terapi. Kalau kamu sudah dalam terapi, sistem ini bisa kamu pakai sebagai journaling antar sesi. Kalau belum pernah ke psikolog, refleksi pertamamu di sini bisa jadi langkah pengenalan tanpa tekanan, sebelum memutuskan apakah perlu konsultasi lebih lanjut.",
  },
  {
    q: "Apakah saya harus bayar untuk pakai?",
    a: "Skrining awal gratis — cukup daftar akun untuk mulai. Konsultasi langsung dengan psikolog mitra mengikuti tarif praktek mandiri masing-masing psikolog (transparan di profil mereka, sebelum kamu booking).",
  },
  {
    q: "Berapa lama prosesnya?",
    a: "Refleksi awal sekitar 8\u201312 menit. Tidak ada batas waktu \u2014 kamu bisa berhenti kapan saja dan lanjut nanti. Sistem akan menyimpan progres kalau kamu pilih untuk login.",
  },
  {
    q: "Apakah AI bisa salah membaca pikiran saya?",
    a: "Ya \u2014 itu sebabnya kami menyebutnya refleksi terpandu, bukan diagnosis. AI hanya menampilkan pola pikir yang muncul dalam ceritamu sebagai bahan refleksi. Kamu yang menentukan apakah itu sesuai dengan dirimu. Untuk skrining yang lebih dalam, akan selalu ada psikolog mitra yang me-review.",
  },
  {
    q: "Siapa yang bisa pakai?",
    a: "Anak muda Indonesia usia 15+ yang ingin memahami pikirannya sendiri. Kamu tidak harus \u201Cmerasa sakit\u201D untuk mulai \u2014 banyak yang pakai untuk preventif, atau hanya untuk lebih kenal pola pikir sendiri.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);
  const sideRef = useReveal<HTMLDivElement>();
  const listRef = useReveal<HTMLDivElement>();

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? -1 : i);
  };

  return (
    <section id="faq" className="bg-surface" style={{ padding: "140px 0" }}>
      <div className="container-main">
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] items-start"
          style={{ gap: "80px" }}
        >
          {/* Left side */}
          <div ref={sideRef} className="reveal">
            <span className="eyebrow" style={{ marginBottom: "24px", display: "block" }}>
              Pertanyaan umum
            </span>
            <h2 className="section-title">
              Hal yang sering <em className="lilac">ditanyakan.</em>
            </h2>
            <p
              className="text-on-surface-muted"
              style={{ marginTop: "24px", fontSize: "14px", lineHeight: 1.6 }}
            >
              Tidak ketemu jawabanmu?{" "}
              <a
                href="mailto:hello@cogniscan.id"
                className="text-primary font-semibold no-underline"
                style={{ borderBottom: "1px solid var(--primary-fixed-dim)" }}
              >
                Tulis ke kami
              </a>
              .
            </p>
          </div>

          {/* FAQ list */}
          <div ref={listRef} className="reveal flex flex-col" style={{ gap: "12px" }}>
            {faqData.map((item, i) => (
              <div
                key={i}
                className={`bg-surface-lowest overflow-hidden transition-colors ${
                  openIndex === i ? "faq-item-open" : ""
                }`}
                style={{
                  borderRadius: "var(--r-default)",
                  boxShadow: openIndex === i ? "var(--shadow-ambient)" : "none",
                }}
              >
                <button className="faq-q" onClick={() => toggle(i)}>
                  {item.q}
                  <span className="faq-icon">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 1V13M1 7H13"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>
                <div className="faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
