"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseMedical,
  Info,
  MessagesSquare,
} from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import {
  getPatientNav,
  patientProfileHref,
  patientUser as defaultPatientUser,
  ScreeningTopicCard,
} from "@/components/patient";
import {
  fetchPatientDashboardSummary,
  type PatientDashboardSummary,
  type PatientLatestScreeningStatus,
} from "@/lib/auth";
import { useBackendUser } from "@/lib/useBackendUser";
import { useCachedApi } from "@/lib/useCachedApi";

const topics = [
  {
    title: "Pendidikan",
    description: "Tekanan akademik & performa belajar",
    icon: "🎓",
    href: "/pasien/screening/pendidikan",
  },
  {
    title: "Keluarga",
    description: "Dinamika dan hubungan keluarga",
    icon: "👨‍👩‍👧",
    href: "/pasien/screening/keluarga",
  },
  {
    title: "Hubungan",
    description: "Relasi romantis & pertemanan",
    icon: "💕",
    href: "/pasien/screening/hubungan",
  },
  {
    title: "Keuangan",
    description: "Stres finansial & kekhawatiran ekonomi",
    icon: "💰",
    href: "/pasien/screening/keuangan",
  },
  {
    title: "Diri Sendiri",
    description: "Perasaan, identitas, dan cara memandang diri",
    icon: "🌱",
    href: "/pasien/screening/diri-sendiri",
  },
  {
    title: "Kesehatan",
    description: "Kondisi mental & kesehatan umum",
    icon: "🩺",
    href: "/pasien/screening/kesehatan",
  },
];

const topicLabels: Record<string, string> = {
  pendidikan: "Pendidikan",
  keluarga: "Keluarga",
  hubungan: "Hubungan",
  keuangan: "Keuangan",
  "diri-sendiri": "Diri Sendiri",
  kesehatan: "Kesehatan",
};

function topicName(slug?: string | null) {
  if (!slug) return "Screening";
  return topicLabels[slug] || slug.replace(/-/g, " ");
}

function screeningStatusText(latest: PatientLatestScreeningStatus) {
  if (latest.status === "feedback_tersedia") return "Selesai review";
  if (latest.status === "sedang_direview") return "Sedang direview";
  if (latest.status === "menunggu_review") return "Menunggu review";
  if (latest.status === "perlu_eskalasi") return "Perlu dukungan segera";
  return "Menunggu pilih psikolog";
}

function formatShortDate(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function PasienDashboardPage() {
  const backendUser = useBackendUser();
  const { data: summary } = useCachedApi<PatientDashboardSummary>(
    "pasien-dashboard-summary",
    fetchPatientDashboardSummary,
  );
  const displayUser = {
    ...defaultPatientUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPatientUser.name,
  };
  const patientUser = displayUser;
  const latestScreening = summary?.screening_terakhir ?? null;
  const latestScreeningDate = formatShortDate(latestScreening?.dibuat_pada);

  return (
    <DashboardLayout
      title={`Halo, ${patientUser.name} 👋`}
      navItems={getPatientNav("dashboard")}
      user={displayUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"

      

      
    >
      <div className="space-y-8">
        <section className="grid gap-6 lg:grid-cols-2">
          <DashboardCard className="flex min-h-[150px] items-center justify-between gap-4 px-7 py-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-container text-[#6f5794]">
                <MessagesSquare className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[16px] font-medium text-on-surface-variant">
                  Pesan Baru
                </p>
                <p className="text-[16px] font-semibold text-[#6f5794]">
                  {summary ? summary.pesan_baru : "-"}
                </p>
                {latestScreening ? (
                  <p className="mt-2 max-w-[320px] text-[13px] leading-5 text-on-surface-muted">
                    Screening terakhir:{" "}
                    <span className="font-semibold text-on-surface-variant">
                      {topicName(latestScreening.konteks_pemicu)}
                    </span>
                    {" - "}
                    {screeningStatusText(latestScreening)}
                    {latestScreeningDate ? ` - ${latestScreeningDate}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
            <Link
              href="/pasien/pesan"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#6f5794] px-4 text-[13px] font-extrabold text-[#6f5794] transition hover:bg-secondary-container/50"
            >
              Lihat Pesan
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </DashboardCard>

          <DashboardCard className="flex min-h-[110px] items-center gap-4 px-7 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c8edc7] text-primary">
              <BriefcaseMedical className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[16px] font-medium text-on-surface-variant">
                Total Konsultasi
              </p>
              <p className="text-[16px] font-semibold text-primary">
                {summary ? summary.total_konsultasi : "-"}
              </p>
            </div>
          </DashboardCard>
        </section>

        <section id="topik-screening" className="scroll-mt-24 pb-5">
          <h2 className="mb-7 text-[17px] font-semibold text-[#6f5794]">
            Pilih Topik Screening
          </h2>
          <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => (
              <ScreeningTopicCard key={topic.title} {...topic} />
            ))}
          </div>
        </section>

        <section className="rounded-[12px] border-l-4 border-[#765a9c] bg-secondary-container/70 px-7 py-6">
          <div className="flex gap-4">
            <Info
              className="mt-0.5 h-5 w-5 shrink-0 fill-[#765a9c] text-white"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-[16px] font-semibold text-on-surface">
                Pemberitahuan Penting
              </h2>
              <p className="mt-2 text-[16px] leading-7 text-on-surface-variant">
                Hasil screening bersifat rahasia dan hanya dapat dilihat oleh
                psikolog terpercaya kami. Untuk screening awal bersifat gratis
                namun untuk konsultasi selanjutnya dikenakan biaya.
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
