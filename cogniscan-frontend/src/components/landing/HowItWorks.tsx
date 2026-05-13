"use client";

import { useReveal } from "@/hooks/useReveal";
import {
  IconChoose,
  IconStory,
  IconReflect,
  IconContinue,
} from "@/components/icons";

interface Step {
  num: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  reflect?: boolean;
}

const steps: Step[] = [
  {
    num: "01 \u2014 Pilih",
    title: "Pilih konteks yang menggangguku",
    desc: "Akademik, pekerjaan, hubungan, keluarga, atau diri sendiri.",
    icon: <IconChoose />,
  },
  {
    num: "02 \u2014 Cerita",
    title: "Jawab pertanyaan terbuka",
    desc: "3\u20135 pertanyaan reflektif berbasis Socratic Questioning.",
    icon: <IconStory />,
  },
  {
    num: "03 \u2014 Refleksi",
    title: "Lihat pola pikirmu",
    desc: "AI menampilkan pola pikir yang muncul \u2014 sebagai cermin, bukan vonis.",
    icon: <IconReflect />,
    reflect: true,
  },
  {
    num: "04 \u2014 Lanjut",
    title: "Pilih langkah berikutnya",
    desc: "Pelajari mandiri, simpan untuk nanti, atau bicara dengan psikolog mitra.",
    icon: <IconContinue />,
  },
];

export default function HowItWorks() {
  const headerRef = useReveal<HTMLDivElement>();
  const stepsRef = useReveal<HTMLDivElement>();

  return (
    <section
      id="cara-kerja"
      className="bg-surface-low"
      style={{ padding: "140px 0 120px" }}
    >
      <div className="container-main">
        {/* Header */}
        <div ref={headerRef} className="reveal">
          <span className="eyebrow" style={{ marginBottom: "24px", display: "block" }}>
            Cara kerja
          </span>
          <h2 className="section-title">
            Empat langkah <em>tanpa beban.</em>
          </h2>
          <p
            className="text-on-surface-variant"
            style={{
              fontSize: "19px",
              maxWidth: "600px",
              lineHeight: 1.55,
              marginBottom: "80px",
            }}
          >
            Tidak ada kuesioner kaku. Tidak ada vonis di akhir. Hanya
            percakapan terpandu yang membantumu melihat pikiranmu sendiri dari
            sudut pandang baru.
          </p>
        </div>

        {/* Steps */}
        <div
          ref={stepsRef}
          className="reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          style={{ gap: "20px" }}
        >
          {steps.map((step) => (
            <div
              key={step.num}
              className={`bg-surface-lowest transition-all duration-200 hover:-translate-y-1 ${
                step.reflect ? "step-reflect" : ""
              }`}
              style={{
                padding: "36px 28px 40px",
                borderRadius: "var(--r-default)",
                boxShadow: "var(--shadow-ambient)",
                border: "1px solid var(--outline-variant)",
              }}
            >
              <span className="step-num">{step.num}</span>
              <div className="step-icon">{step.icon}</div>
              <h3
                className="font-serif font-medium text-on-surface"
                style={{
                  fontSize: "22px",
                  marginBottom: "12px",
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                }}
              >
                {step.title}
              </h3>
              <p
                className="text-on-surface-muted"
                style={{ fontSize: "14.5px", lineHeight: 1.6 }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
