"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Inbox, Loader2 } from "lucide-react";
import { DashboardLayout, StatusBadge } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser as defaultPatientUser } from "@/components/patient";
import { fetchPatientPreAssessments, type PreAssessment } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";

const topicLabels: Record<string, string> = {
  pendidikan: "Pendidikan",
  keluarga: "Keluarga",
  hubungan: "Hubungan",
  keuangan: "Keuangan",
  "diri-sendiri": "Diri Sendiri",
  kesehatan: "Kesehatan",
};

export default function PatientMessagesPage() {
  const backendUser = useBackendUser();
  const [reports, setReports] = useState<PreAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayUser = {
    ...defaultPatientUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPatientUser.name,
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
      }
      const dataReports = await fetchPatientPreAssessments(accessToken);
      setReports(dataReports);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pesan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        }
        const dataReports = await fetchPatientPreAssessments(accessToken);
        if (isMounted) setReports(dataReports);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat pesan.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const feedbackReports = reports.filter(
    (r) => r.feedback_psikolog && r.feedback_psikolog.trim().length > 0
  );

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <DashboardLayout
      title="Pesan"
      navItems={getPatientNav("pesan")}
      user={displayUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div>
        <header className="mb-10">
          <h2 className="text-[34px] font-extrabold tracking-[-0.02em] text-[#6f5794]">
            Pesan & Feedback
          </h2>
          <p className="mt-1 text-[16px] text-on-surface-variant">
            Feedback dari psikolog setelah sesi konsultasimu.
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#6f5794]" />
            <p className="mt-4 text-sm text-on-surface-muted">Memuat pesan & feedback...</p>
          </div>
        ) : error ? (
          <div className="rounded-[12px] border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={loadData}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-red-100 px-5 text-sm font-semibold text-red-800 hover:bg-red-200 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : feedbackReports.length === 0 ? (
          /* Empty State UX Premium */
          <div className="flex flex-col items-center justify-center rounded-[24px] bg-white px-8 py-16 text-center shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-container text-[#6f5794] mb-6">
              <Inbox className="h-10 w-10 animate-pulse" />
            </div>
            <h3 className="text-[22px] font-bold text-on-surface mb-3">
              Belum Ada Feedback dari Psikolog
            </h3>
            <p className="max-w-[500px] text-[15px] leading-7 text-on-surface-variant mb-8">
              {reports.length > 0
                ? "Hasil screening Anda saat ini sedang dalam antrean peninjauan oleh psikolog klinis kami. Masukan profesional dan panduan pemulihan akan muncul di sini segera setelah divalidasi."
                : "Anda belum pernah melakukan screening mandiri. Mari selesaikan screening awal agar psikolog kami dapat memberikan analisis dan feedback pemulihan untuk Anda."}
            </p>
            {reports.length > 0 ? (
              <Link
                href="/pasien/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-primary px-8 text-sm font-extrabold uppercase tracking-[0.12em] text-[#6f5794] border-[#6f5794] transition hover:bg-secondary-container/50"
              >
                Kembali ke Dashboard
              </Link>
            ) : (
              <Link
                href="/pasien/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:bg-[#365f39]"
              >
                Mulai Screening
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {feedbackReports.map((report) => {
              const topicSlug = report.konteks_pemicu || "";
              const topicName = topicLabels[topicSlug] || topicSlug.replace("-", " ") || "Umum";

              return (
                <article
                  key={report.id_pra_asesmen}
                  className="rounded-r-[12px] border-l-4 border-[#a98ad6] bg-white px-7 py-6 shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_32px_55px_-28px_rgba(27,28,26,0.45)]"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h3 className="text-[20px] font-extrabold leading-6 text-on-surface">
                      {report.nama_psikolog || "Psikolog CogniScan"}
                    </h3>
                    <StatusBadge tone="neutral" className="h-6 bg-surface-container text-[11px] tracking-[0.08em]">
                      {topicName}
                    </StatusBadge>
                  </div>

                  <p className="mb-5 text-sm text-on-surface-muted">
                    Psikolog Klinis &bull; {formatDate(report.divalidasi_pada || report.dibuat_pada)}
                  </p>
                  <p className="max-w-[820px] text-[16px] leading-7 text-on-surface line-clamp-3">
                    {report.feedback_psikolog}
                  </p>

                  <Link
                    href={`/pasien/pesan/detail?id_pra_asesmen=${report.id_pra_asesmen}`}
                    className="mt-6 inline-flex items-center gap-1 text-[15px] font-extrabold text-primary transition-colors hover:text-primary-container"
                  >
                    Lihat Selengkapnya
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
