"use client";

import { useReveal } from "@/hooks/useReveal";

const stats = [
  {
    num: "9.8",
    unit: "%",
    label: "remaja Indonesia 10\u201317 tahun mengalami gangguan mental",
    source: "I-NAMHS \u00B7 2022",
  },
  {
    num: "91",
    unit: "%",
    label: "tidak pernah mengakses layanan kesehatan mental apa pun",
    source: "I-NAMHS \u00B7 2022",
  },
  {
    num: "1 : 92",
    unit: "k",
    label: "rasio psikolog klinis terhadap penduduk Indonesia",
    source: "Kemenkes RI",
  },
  {
    num: "12",
    unit: "",
    label: "pola pikir yang dikenali sistem berbasis taksonomi Burns",
    source: "Burns \u00B7 1980",
  },
];

export default function Stats() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <section
      className="bg-on-surface text-surface"
      style={{ padding: "88px 0" }}
    >
      <div className="container-main">
        <div
          ref={ref}
          className="reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          style={{ gap: "56px" }}
        >
          {stats.map((stat) => (
            <div key={stat.source + stat.num}>
              <div className="stat-num">
                {stat.num}
                {stat.unit && <em>{stat.unit}</em>}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  lineHeight: 1.55,
                  color: "rgba(251,249,245,0.78)",
                  marginBottom: "14px",
                }}
              >
                {stat.label}
              </div>
              <div
                className="font-sans"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--tertiary)",
                  opacity: 0.85,
                }}
              >
                {stat.source}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
