"use client";

import { useReveal } from "@/hooks/useReveal";
import { IconCrisis } from "@/components/icons";

const resources = [
  {
    name: "SEJIWA Kemenkes",
    desc: "Telepon 119 lalu tekan 8",
    contact: "119 ext. 8",
    priority: true,
  },
  {
    name: "Into The Light",
    desc: "Pencegahan bunuh diri & edukasi",
    contact: "Kunjungi \u2192",
    href: "https://www.intothelightid.org",
    external: true,
    priority: false,
  },
  {
    name: "Yayasan Pulih",
    desc: "Dukungan trauma & krisis psikologis",
    contact: "Kunjungi \u2192",
    href: "https://yayasanpulih.org",
    external: true,
    priority: false,
  },
];

export default function Crisis() {
  const leftRef = useReveal<HTMLDivElement>();
  const rightRef = useReveal<HTMLDivElement>();

  return (
    <section
      className="crisis-section bg-on-surface text-surface relative overflow-hidden"
      style={{ padding: "120px 0" }}
    >
      <div className="container-main">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-20 items-start relative">
          <div ref={leftRef} className="reveal">
            <IconCrisis />
            <div
              className="font-sans text-tertiary flex items-center gap-3"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              <span className="pulse-dot" />
              Butuh bantuan sekarang?
            </div>
            <h3
              className="font-serif font-normal"
              style={{
                fontSize: "clamp(36px, 4.4vw, 56px)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                marginBottom: "24px",
              }}
            >
              Kalau pikiranmu terasa{" "}
              <em className="italic text-tertiary font-light">tidak aman,</em>{" "}
              hubungi langsung.
            </h3>
            <p style={{ color: "rgba(251,249,245,0.7)", fontSize: "16px", maxWidth: "420px", lineHeight: 1.6 }}>
              Kamu tidak harus melewatinya sendirian. Tiga sumber resmi di
              samping siap merespons — gratis, rahasia, dan tersedia kapan saja.
            </p>
          </div>
          <div ref={rightRef} className="reveal flex flex-col gap-3.5">
            {resources.map((res) => (
              <div key={res.name} className={`crisis-card ${res.priority ? "priority" : ""}`}>
                <div>
                  <div
                    className="font-serif font-medium text-surface"
                    style={{ fontSize: "20px", marginBottom: "4px", letterSpacing: "-0.01em" }}
                  >
                    {res.name}
                  </div>
                  <div style={{ fontSize: "13px", color: "rgba(251,249,245,0.6)", lineHeight: 1.5 }}>
                    {res.desc}
                  </div>
                </div>
                {res.href ? (
                  <a
                    href={res.href}
                    {...(res.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="crisis-card-contact"
                  >
                    {res.contact}
                  </a>
                ) : (
                  <span className="crisis-card-contact" aria-label="Nomor kontak darurat">
                    {res.contact}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
