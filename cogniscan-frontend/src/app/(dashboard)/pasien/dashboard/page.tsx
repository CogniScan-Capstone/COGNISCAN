"use client";

import { BriefcaseMedical, MessagesSquare, Info } from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import {
  getPatientNav,
  patientProfileHref,
  patientUser as defaultPatientUser,
  ScreeningTopicCard,
} from "@/components/patient";
import { useBackendUser } from "@/lib/useBackendUser";

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

export default function PasienDashboardPage() {
  const backendUser = useBackendUser();
  const displayUser = {
    ...defaultPatientUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPatientUser.name,
  };
  const patientUser = displayUser;

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
          <DashboardCard className="flex min-h-[110px] items-center gap-4 px-7 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-[#6f5794]">
              <MessagesSquare className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[16px] font-medium text-on-surface-variant">
                Pesan Baru
              </p>
              <p className="text-[16px] font-semibold text-[#6f5794]">3</p>
            </div>
          </DashboardCard>

          <DashboardCard className="flex min-h-[110px] items-center gap-4 px-7 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c8edc7] text-primary">
              <BriefcaseMedical className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[16px] font-medium text-on-surface-variant">
                Total Konsultasi
              </p>
              <p className="text-[16px] font-semibold text-primary">12</p>
            </div>
          </DashboardCard>
        </section>

        <section className="pb-5">
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
