import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardLayout, StatusBadge } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser } from "@/components/patient";

const messages = [
  {
    doctor: "Dr. Sarah Wijaya",
    topic: "Keluarga",
    date: "10 Mei 2026",
    body: "Berdasarkan hasil screening kamu, terlihat adanya pola pikir yang perlu diperhatikan terkait hubungan keluarga. Disarankan untuk mulai menuliskan jurnal harian mengenai interaksi harian...",
    highlighted: true,
  },
  {
    doctor: "Dr. Andi Pratama",
    topic: "Keuangan",
    date: "08 Mei 2026",
    body: "Kecemasan terkait finansial dapat diredam dengan perencanaan yang lebih terstruktur. Mari kita bahas lebih lanjut pada sesi berikutnya bagaimana mengelola emosi saat menghadapi tagihan bulanan.",
  },
  {
    doctor: "Dr. Rina Sari",
    topic: "Keluarga",
    date: "05 Mei 2026",
    body: "Perkembangan komunikasi kamu dengan orang tua menunjukkan kemajuan positif. Terus pertahankan batasan yang telah kita diskusikan pada sesi pertama, terutama saat akhir pekan.",
  },
];

export default function PatientMessagesPage() {
  return (
    <DashboardLayout
      title="Pesan"
      navItems={getPatientNav("pesan")}
      user={patientUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="max-w-[920px]">
        <header className="mb-10">
          <h2 className="text-[34px] font-extrabold tracking-[-0.02em] text-[#6f5794]">
            Pesan & Feedback
          </h2>
          <p className="mt-1 text-[16px] text-on-surface-variant">
            Feedback dari psikolog setelah sesi konsultasimu.
          </p>
        </header>

        <div className="space-y-6">
          {messages.map((message) => (
            <article
              key={`${message.doctor}-${message.date}`}
              className="rounded-r-[12px] border-l-4 border-[#a98ad6] bg-white px-7 py-6 shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)] transition-colors hover:bg-secondary-container/60"
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h3 className="text-[20px] font-extrabold leading-6 text-on-surface">
                  {message.doctor}
                </h3>
                <StatusBadge tone="neutral" className="h-6 bg-surface-container text-[11px] tracking-[0.08em]">
                  {message.topic}
                </StatusBadge>
                {message.highlighted ? (
                  <span className="h-2 w-2 rounded-full bg-[#6f5794]" aria-label="Pesan baru" />
                ) : null}
              </div>

              <p className="mb-5 text-sm text-on-surface-muted">
                Psikolog Klinis &bull; {message.date}
              </p>
              <p className="max-w-[820px] text-[16px] leading-7 text-on-surface">
                {message.body}
              </p>

              <Link
                href="/pasien/pesan/detail"
                className="mt-6 inline-flex items-center gap-1 text-[15px] font-extrabold text-primary transition-colors hover:text-primary-container"
              >
                Lihat Selengkapnya
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
