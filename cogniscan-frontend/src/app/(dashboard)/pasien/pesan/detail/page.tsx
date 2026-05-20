"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Lightbulb, Loader2 } from "lucide-react";
import { DashboardLayout, StatusBadge } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser as defaultPatientUser } from "@/components/patient";
import { fetchPreAssessmentReport, type PreAssessment } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";

function PatientMessageDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idPraAsesmenStr = searchParams.get("id_pra_asesmen");
  const backendUser = useBackendUser();
  const [report, setReport] = useState<PreAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayUser = {
    ...defaultPatientUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPatientUser.name,
  };

  const idPraAsesmen = idPraAsesmenStr ? Number(idPraAsesmenStr) : null;

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      if (!idPraAsesmen) {
        setError("ID Pra-Asesmen tidak valid.");
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        }
        const dataReport = await fetchPreAssessmentReport(accessToken, idPraAsesmen);
        if (isMounted) setReport(dataReport);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat detail feedback.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [idPraAsesmen]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Pesan"
        navItems={getPatientNav("pesan")}
        user={displayUser}
        profileHref={patientProfileHref}
        contentClassName="lg:px-10 xl:px-10"
      >
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#6f5794]" />
          <p className="mt-4 text-sm text-on-surface-muted">Memuat detail feedback...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !report) {
    return (
      <DashboardLayout
        title="Pesan"
        navItems={getPatientNav("pesan")}
        user={displayUser}
        profileHref={patientProfileHref}
        contentClassName="lg:px-10 xl:px-10"
      >
        <div className="rounded-[12px] border border-red-200 bg-red-50 p-8 text-center max-w-[600px] mx-auto mt-10">
          <p className="text-sm font-semibold text-red-800 mb-4">{error || "Detail feedback tidak ditemukan."}</p>
          <button
            onClick={() => router.push("/pasien/pesan")}
            className="inline-flex h-10 items-center justify-center rounded-full bg-red-100 px-5 text-sm font-semibold text-red-800 hover:bg-red-250"
          >
            Kembali ke Pesan
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const distortions = report.distorsi_terdeteksi?.map((d) => d.tipe_distorsi).filter(Boolean) || [];

  return (
    <DashboardLayout
      title="Pesan"
      navItems={getPatientNav("pesan")}
      user={displayUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div>
        <h2 className="mb-10 text-[34px] font-extrabold tracking-[-0.02em] text-[#6f5794]">
          Detail Pesan & Feedback
        </h2>

        <article className="overflow-hidden rounded-[14px] border border-outline-variant bg-white">
          <header className="flex flex-col gap-3 border-b border-outline-variant px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] font-medium uppercase text-[#6f5794]">
              Feedback dari Psikolog
            </p>
            <p className="text-[15px] text-on-surface-variant">
              Terakhir diperbarui: {formatDate(report.divalidasi_pada || report.dibuat_pada)}
            </p>
          </header>

          <div className="px-6 py-8">
            <div>
              <h3 className="text-[18px] font-extrabold text-on-surface">
                {report.nama_psikolog || "Psikolog CogniScan"}
              </h3>
              <p className="mt-1 text-sm text-on-surface-muted">
                Psikolog Klinis &bull; divalidasi pada {formatDate(report.divalidasi_pada || report.dibuat_pada)}
              </p>
            </div>

            <div className="mt-10 space-y-5 text-[16px] leading-8 text-on-surface-variant">
              <p className="whitespace-pre-wrap">{report.feedback_psikolog}</p>
            </div>

            {distortions.length > 0 && (
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
            )}

            <div className="mt-10 border-l-4 border-primary bg-[#eef8ef] px-6 py-6">
              <div className="flex gap-4">
                <Lightbulb className="mt-1 h-6 w-6 shrink-0 fill-primary text-primary" aria-hidden="true" />
                <p className="text-[16px] leading-7 text-[#274f2b]">
                  Lanjutkan sesi konsultasi untuk membahas strategi pengelolaan distorsi
                  kognitif yang lebih personal dan terstruktur secara langsung.
                </p>
              </div>
            </div>

            <footer className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/pasien/pesan")}
                className="h-12 rounded-full px-6 text-[15px] font-medium text-on-surface-variant transition hover:bg-surface-container"
              >
                Kembali
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

export default function PatientMessageDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-10 w-10 animate-spin text-[#6f5794]" />
      </div>
    }>
      <PatientMessageDetailContent />
    </Suspense>
  );
}
