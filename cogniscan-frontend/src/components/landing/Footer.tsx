import Link from "next/link";

const footerLinks = {
  produk: [
    { label: "Cara Kerja", href: "#cara-kerja" },
    { label: "Fitur", href: "#fitur" },
    { label: "Mulai Refleksi", href: "#mulai" },
  ],
  mitra: [
    { label: "Daftar sebagai psikolog", href: "#daftar-psikolog" },
    { label: "Pedoman etika klinis", href: "#" },
    { label: "Hubungi tim", href: "#" },
  ],
  kontak: [
    { label: "hello@cogniscan.id", href: "mailto:hello@cogniscan.id" },
    { label: "@cogniscan.id", href: "https://instagram.com/cogniscan.id" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-on-surface text-surface" style={{ padding: "96px 0 36px" }}>
      <div className="container-main">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]"
          style={{ gap: "56px", marginBottom: "64px" }}
        >
          {/* Brand */}
          <div>
            <div className="foot-brand">
              Cogni<em>Scan</em>
            </div>
            <div style={{ color: "rgba(251,249,245,0.65)", fontSize: "14.5px", lineHeight: 1.6, maxWidth: "320px" }}>
              Pikiranmu layak didengarkan. Refleksi terpandu untuk anak muda
              Indonesia, dikawal psikolog bersertifikasi HIMPSI.
            </div>
            <div
              className="inline-flex items-center gap-2.5 font-medium"
              style={{
                padding: "10px 16px",
                background: "rgba(251,249,245,0.05)",
                borderRadius: "var(--r-xl)",
                fontSize: "12px",
                color: "rgba(251,249,245,0.85)",
                marginTop: "20px",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-tertiary"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Disupervisi HIMPSI &middot; Himpunan Psikologi Indonesia
            </div>
          </div>

          {/* Produk */}
          <div>
            <h5
              className="font-sans text-tertiary"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "22px",
              }}
            >
              Produk
            </h5>
            <ul className="list-none" style={{ padding: 0 }}>
              {footerLinks.produk.map((link) => (
                <li key={link.label} style={{ marginBottom: "12px" }}>
                  <Link
                    href={link.href}
                    className="no-underline transition-colors hover:text-surface"
                    style={{ color: "rgba(251,249,245,0.75)", fontSize: "14px" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Mitra */}
          <div>
            <h5
              className="font-sans text-tertiary"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "22px",
              }}
            >
              Mitra
            </h5>
            <ul className="list-none" style={{ padding: 0 }}>
              {footerLinks.mitra.map((link) => (
                <li key={link.label} style={{ marginBottom: "12px" }}>
                  <Link
                    href={link.href}
                    className="no-underline transition-colors hover:text-surface"
                    style={{ color: "rgba(251,249,245,0.75)", fontSize: "14px" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h5
              className="font-sans text-tertiary"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "22px",
              }}
            >
              Kontak
            </h5>
            <ul className="list-none" style={{ padding: 0 }}>
              {footerLinks.kontak.map((link) => (
                <li key={link.label} style={{ marginBottom: "12px" }}>
                  <a
                    href={link.href}
                    className="no-underline transition-colors hover:text-surface"
                    style={{ color: "rgba(251,249,245,0.75)", fontSize: "14px" }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex justify-between items-center flex-wrap"
          style={{
            paddingTop: "36px",
            fontSize: "12px",
            color: "rgba(251,249,245,0.5)",
            gap: "16px",
          }}
        >
          <div>&copy; 2026 CogniScan. Penelitian capstone untuk kesehatan mental Indonesia.</div>
          <div className="flex" style={{ gap: "24px" }}>
            <a href="#" className="no-underline hover:text-surface" style={{ color: "rgba(251,249,245,0.5)" }}>
              Privasi
            </a>
            <a href="#" className="no-underline hover:text-surface" style={{ color: "rgba(251,249,245,0.5)" }}>
              Ketentuan
            </a>
            <a href="#" className="no-underline hover:text-surface" style={{ color: "rgba(251,249,245,0.5)" }}>
              Kebijakan data
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
