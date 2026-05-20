"use client";

import { useEffect, useState } from "react";
import { BriefcaseMedical, MessagesSquare, Info } from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import {
  getPatientNav,
  patientProfileHref,
  patientUser as defaultPatientUser,
  ScreeningTopicCard,
} from "@/components/patient";
import { fetchPatientDashboardSummary, type PatientDashboardSummary } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
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
  const [summary, setSummary] = useState<PatientDashboardSummary | null>(null);
  const displayUser = {
    ...defaultPatientUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPatientUser.name,
  };
  const patientUser = displayUser;

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        if (!accessToken) {
          throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        }

        const result = await fetchPatientDashboardSummary(accessToken);
        if (isMounted) setSummary(result);
      } catch {
        if (isMounted) {
          setSummary({ pesan_baru: 0, total_konsultasi: 0 });
        }
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

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
              <p className="text-[16px] font-semibold text-[#6f5794]">
                {summary ? summary.pesan_baru : "-"}
              </p>
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
              <p className="text-[16px] font-semibold text-primary">
                {summary ? summary.total_konsultasi : "-"}
              </p>
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
