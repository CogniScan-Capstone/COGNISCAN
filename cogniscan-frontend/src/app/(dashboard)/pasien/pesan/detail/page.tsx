import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { DashboardLayout, StatusBadge } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser } from "@/components/patient";

const distortions = ["Self-criticism", "Overgeneralization", "Mind Reading"];

export default function PatientMessageDetailPage() {
  return (
    <DashboardLayout
      title="Pesan"
      navItems={getPatientNav("pesan")}
      user={patientUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div>
        <h2 className="mb-10 text-[34px] font-extrabold tracking-[-0.02em] text-[#6f5794]">
          Detail Pesan
        </h2>

        <article className="overflow-hidden rounded-[14px] border border-outline-variant bg-white">
          <header className="flex flex-col gap-3 border-b border-outline-variant px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] font-medium uppercase text-[#6f5794]">
              Feedback dari Psikolog
            </p>
            <p className="text-[15px] text-on-surface-variant">
              Terakhir diperbarui: 2 jam yang lalu
            </p>
          </header>

          <div className="px-6 py-8">
            <div>
              <h3 className="text-[18px] font-extrabold text-on-surface">
                Dr. Anisa Rahma, M.Psi
              </h3>
              <p className="mt-1 text-sm text-on-surface-muted">Psikolog Klinis &bull; 14 Mei 2026</p>
            </div>

            <div className="mt-10  space-y-5 text-[16px] leading-8 text-on-surface-variant">
              <p>
                Halo! Berdasarkan hasil screening yang telah kamu selesaikan, saya melihat
                beberapa pola pikir yang menarik untuk kita eksplorasi lebih lanjut. Kamu
                menunjukkan kemajuan pesat dalam mengenali pemicu kecemasan harian, namun
                masih ada kecenderungan untuk memproses informasi dengan cara yang kurang
                objektif saat berada di bawah tekanan keluarga.
              </p>
            </div>

            <section className="mt-10">
              <h4 className="mb-4 text-[16px] font-extrabold text-[#6f5794]">
                Distorsi Kognitif Terdeteksi:
              </h4>
              <div className="flex flex-wrap gap-2">
                {distortions.map((distortion) => (
                  <StatusBadge
                    key={distortion}
                    tone="purple"
                    className="h-10 min-w-37.5 border-[#d4b7ff] bg-[#ead9ff] px-5 text-[15px] font-medium"
                  >
                    {distortion}
                  </StatusBadge>
                ))}
              </div>
            </section>

            <div className="mt-10 border-l-4 border-primary bg-[#eef8ef] px-6 py-6">
              <div className="flex gap-4">
                <Lightbulb className="mt-1 h-6 w-6 shrink-0 fill-primary text-primary" aria-hidden="true" />
                <p className="text-[16px] leading-7 text-[#274f2b]">
                  Lanjutkan sesi konsultasi untuk membahas strategi pengelolaan distorsi
                  kognitif yang lebih personal dan terstruktur.
                </p>
              </div>
            </div>

            <footer className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="h-12 rounded-full px-6 text-[15px] font-medium text-on-surface-variant transition hover:bg-surface-container"
              >
                Batalkan Konsultasi
              </button>
              <Link
                href="/pasien/booking/jadwal"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-primary px-10 text-[16px] font-extrabold text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:-translate-y-0.5 hover:bg-[#365f39]"
              >
                Lanjutkan Konsultasi
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </footer>
          </div>
        </article>
      </div>
    </DashboardLayout>
  );
}

