"use client";

import { useReveal } from "@/hooks/useReveal";

interface BentoItem {
  span: string;
  tag: string;
  tagClass?: string;
  title: string;
  desc: React.ReactNode;
  pinned?: boolean;
  extra?: React.ReactNode;
  titleClass?: string;
  descClass?: string;
}

const bentoItems: BentoItem[] = [
  {
    span: "b-1",
    tag: "Inti",
    pinned: true,
    title: "Refleksi terpandu, bukan chatbot bebas.",
    titleClass: "text-[32px] max-w-[480px] leading-[1.15]",
    desc: (
      <>
        Kami sengaja tidak membangun chatbot percakapan bebas. Riset menunjukkan
        model bahasa generatif berisiko memberi respons yang tidak aman pada
        kasus krisis. Sebagai gantinya, kami menggunakan pertanyaan reflektif
        terstruktur berbasis{" "}
        <em className="font-serif italic">Socratic Questioning</em> dari
        pendekatan CBT.
      </>
    ),
    descClass: "text-base max-w-[480px]",
    extra: (
      <div className="flex gap-2.5 items-center flex-wrap" style={{ marginTop: "20px" }}>
        <span className="sev-pill sev-stable">Hijau &middot; Stabil</span>
        <span className="sev-pill sev-watch">Kuning &middot; Perhatikan</span>
        <span className="sev-pill sev-crisis">Merah &middot; Krisis</span>
      </div>
    ),
  },
  {
    span: "b-2",
    tag: "Bahasa",
    tagClass: "lilac",
    title: "\u201CPola pikir\u201D, bukan \u201Cdistorsi\u201D.",
    desc: "Bahasa empatik yang tidak menghakimi.",
  },
  {
    span: "b-3",
    tag: "Privasi",
    title: "Datamu hanya milikmu.",
    desc: "Terenkripsi dan hanya bisa diakses oleh kamu dan psikolog pilihanmu.",
  },
  {
    span: "b-4",
    tag: "Keamanan",
    tagClass: "gold",
    title: "Crisis-first safety protocol.",
    desc: "Sistem mendeteksi sinyal krisis dan mengarahkan langsung ke kontak darurat resmi: Into The Light, Yayasan Pulih, dan SEJIWA Kemenkes 119 ext. 8.",
  },
  {
    span: "b-5",
    tag: "Ilmiah",
    title: "Disupervisi psikolog bersertifikasi.",
    desc: "Setiap psikolog mitra terverifikasi STR aktif & terdaftar HIMPSI sebelum praktek.",
  },
];

export default function Features() {
  const headerRef = useReveal<HTMLDivElement>();
  const bentoRef = useReveal<HTMLDivElement>();

  return (
    <section id="fitur" className="bg-surface" style={{ padding: "100px 0" }}>
      <div className="container-main">
        {/* Header */}
        <div ref={headerRef} className="reveal" style={{ marginBottom: "80px" }}>
          <span className="eyebrow" style={{ marginBottom: "24px", display: "block" }}>
            Yang membuat berbeda
          </span>
          <h2 className="section-title">
            Dirancang untuk <em>didengarkan,</em>
            <br />
            bukan dinilai.
          </h2>
        </div>

        {/* Bento Grid */}
        <div ref={bentoRef} className="bento reveal">
          {bentoItems.map((item) => (
            <article
              key={item.tag}
              className={`bento-card ${item.span} ${item.pinned ? "pinned" : ""}`}
            >
              <span className={`feat-tag ${item.tagClass ?? ""}`}>
                {item.tag}
              </span>
              <h3
                className={`font-serif font-medium text-on-surface leading-[1.2] tracking-[-0.01em] ${
                  item.titleClass ?? "text-2xl"
                }`}
                style={{ marginBottom: "12px" }}
              >
                {item.title}
              </h3>
              <p
                className={`text-on-surface-variant leading-[1.6] ${
                  item.descClass ?? "text-[14.5px]"
                }`}
              >
                {item.desc}
              </p>
              {item.extra}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
