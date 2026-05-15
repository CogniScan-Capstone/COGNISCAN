const quoteCards = [
  {
    className: "quote-1",
    tag: "Overgeneralization",
    text: "\u201CAku merasa selalu mengecewakan keluarga. Apa pun yang kulakukan, hasilnya tidak pernah cukup.\u201D",
  },
  {
    className: "quote-2",
    tag: "All-or-nothing",
    text: "\u201CKalau aku gagal kali ini, semuanya akan hancur.\u201D",
  },
  {
    className: "quote-3",
    tag: "Mind reading",
    text: "\u201CMereka pasti menganggapku membosankan.\u201D",
  },
  {
    className: "quote-4",
    tag: "Labeling",
    text: "\u201CAku memang bodoh. Dari dulu juga begitu, nggak pernah berubah.\u201D",
  },
  {
    className: "quote-5",
    tag: "Should statements",
    text: "\u201CAku seharusnya sudah bisa mandiri di umur segini. Kenapa aku masih begini?\u201D",
  },
];

const trustChips = [
  { dot: "bg-primary", label: "Data terenkripsi & rahasia" },
  { dot: "bg-secondary", label: "Disupervisi HIMPSI" },
  { dot: "bg-tertiary", label: "Gratis untuk skrining" },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden" style={{ padding: "96px 0 140px" }}>
      <div className="container-main">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-20 items-center">
          {/* Left column */}
          <div>
            {/* Eyebrow — slides in from left */}
            <div className="eyebrow flex items-center gap-3.5 hero-anim-eyebrow" style={{ marginBottom: "28px" }}>
              <span className="inline-block w-8 h-px bg-primary opacity-50" />
              Skrining kesehatan mental berbasis AI
            </div>

            {/* Headline — fades up with emphasis */}
            <h1
              className="font-serif font-normal text-on-surface hero-anim-h1"
              style={{
                fontSize: "clamp(48px, 6.2vw, 84px)",
                lineHeight: 1.02,
                letterSpacing: "-0.03em",
                marginBottom: "32px",
              }}
            >
              Pikiranmu layak{" "}
              <em className="italic text-primary font-light">didengarkan,</em>{" "}
              bukan dinilai.
            </h1>

            {/* Subheadline — fades up softer */}
            <p
              className="text-on-surface-variant hero-anim-sub"
              style={{
                fontSize: "19px",
                lineHeight: 1.55,
                maxWidth: "520px",
                marginBottom: "44px",
              }}
            >
              CogniScan adalah ruang refleksi terpandu untuk anak muda
              Indonesia. Cerita pikiran yang menggangguku — sistem akan
              membantumu mengenali pola pikir yang sering muncul, sebelum kamu
              memutuskan langkah berikutnya.
            </p>

          {/* Container Utama untuk semua CTA */}
            <div className="flex gap-[18px] items-center flex-wrap hero-anim-cta">
              <a
                href="/sign-up"
                className="rounded-xl bg-green-900 px-6 py-3 text-[15px] font-semibold text-white hover:bg-secondary-dark"
              >
                Mulai Refleksi
              </a>

              <a
                href="/sign-in"
                className="rounded-xl border border-tertiary-container bg-white px-6 py-3 text-[15px] font-semibold text-on-tertiary-container transition-colors hover:bg-tertiary-container"
              >
                Masuk
              </a>

            </div>

            {/* Trust chips — fade up last */}
            <div
              className="flex items-center gap-[18px] text-on-surface-muted flex-wrap hero-anim-trust"
              style={{ marginTop: "48px", fontSize: "13px" }}
            >
              {trustChips.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-2"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full inline-block ${chip.dot}`}
                  />
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right column — Quote cards fly in from right, staggered */}
          <div className="quote-stack hero-anim-cards">
            {quoteCards.map((card) => (
              <div key={card.tag} className={`quote-card ${card.className}`}>
                <span className="quote-tag">{card.tag}</span>
                {card.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
