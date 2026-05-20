"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Inbox,
  Loader2,
  UserRound,
} from "lucide-react";
import { DashboardLayout, StatusBadge } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser as defaultPatientUser } from "@/components/patient";
import { fetchPatientPreAssessments, type PreAssessment } from "@/lib/auth";
import { useBackendUser } from "@/lib/useBackendUser";
import { useCachedApi } from "@/lib/useCachedApi";

const topicLabels: Record<string, string> = {
  pendidikan: "Pendidikan",
  keluarga: "Keluarga",
  hubungan: "Hubungan",
  keuangan: "Keuangan",
  "diri-sendiri": "Diri Sendiri",
  kesehatan: "Kesehatan",
};

function hasFeedback(report: PreAssessment) {
  return Boolean(report.feedback_psikolog && report.feedback_psikolog.trim().length > 0);
}

function reportStatusCopy(report: PreAssessment) {
  if (
    report.status_validasi === "perlu_eskalasi" ||
    report.indikator_urgensi === "critical"
  ) {
    return {
      badge: "Perlu Dukungan",
      description:
        "Hasil screening ini membutuhkan perhatian lebih cepat. Buka kembali hasil screening untuk melihat panduan bantuan.",
      href: `/pasien/screening/selesai?id_pra_asesmen=${report.id_pra_asesmen}`,
      icon: AlertTriangle,
      tone: "danger" as const,
    };
  }

  if (hasFeedback(report)) {
    return {
      badge: "Feedback Tersedia",
      description: report.feedback_psikolog || "Feedback psikolog sudah tersedia.",
      href: `/pasien/pesan/detail?id_pra_asesmen=${report.id_pra_asesmen}`,
      icon: CheckCircle2,
      tone: "success" as const,
    };
  }

  if (report.status_validasi === "sedang_direview") {
    return {
      badge: "Sedang Direview",
      description:
        "Hasil screening Anda sedang ditinjau. Feedback akan muncul di sini setelah psikolog selesai memeriksa.",
      href: `/pasien/screening/selesai?id_pra_asesmen=${report.id_pra_asesmen}`,
      icon: UserRound,
      tone: "info" as const,
    };
  }

  if (report.id_psikolog) {
    return {
      badge: "Menunggu Review",
      description:
        "Hasil screening Anda sudah masuk antrean peninjauan psikolog. Feedback akan muncul di sini setelah selesai.",
      href: `/pasien/screening/selesai?id_pra_asesmen=${report.id_pra_asesmen}`,
      icon: Clock3,
      tone: "warning" as const,
    };
  }

  return {
    badge: "Pilih Psikolog",
    description:
      "Hasil screening sudah tersimpan, tetapi belum ada psikolog yang dipilih untuk meninjau hasil ini.",
    href: `/pasien/screening/selesai?id_pra_asesmen=${report.id_pra_asesmen}`,
    icon: ClipboardCheck,
    tone: "purple" as const,
  };
}

export default function PatientMessagesPage() {
  const backendUser = useBackendUser();
  const [activeTab, setActiveTab] = useState<"menunggu" | "selesai">("menunggu");

  const displayUser = {
    ...defaultPatientUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPatientUser.name,
  };

  const { data: fetchedReports, loading, error, refetch: loadData } = useCachedApi<PreAssessment[]>(
    "pasien-messages-list",
    fetchPatientPreAssessments,
  );
  const reports = fetchedReports ?? [];

  const feedbackReports = reports.filter(hasFeedback);
  const pendingReports = reports.filter((report) => !hasFeedback(report));
  const activeReports = activeTab === "menunggu" ? pendingReports : feedbackReports;

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
            Status hasil screening dan feedback dari psikolog.
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
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] bg-white px-8 py-16 text-center shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-container text-[#6f5794] mb-6">
              <Inbox className="h-10 w-10 animate-pulse" />
            </div>
            <h3 className="text-[22px] font-bold text-on-surface mb-3">
              Belum Ada Hasil Screening
            </h3>
            <p className="max-w-[500px] text-[15px] leading-7 text-on-surface-variant mb-8">
              Anda belum pernah melakukan screening mandiri. Selesaikan screening awal
              agar psikolog dapat memberikan analisis dan feedback pemulihan untuk Anda.
            </p>
            <Link
              href="/pasien/dashboard#topik-screening"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:bg-[#365f39]"
            >
              Mulai Screening
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-7">
            <div className="border-b border-outline-variant">
              <div className="flex flex-wrap gap-8">
                <button
                  type="button"
                  onClick={() => setActiveTab("menunggu")}
                  className={`inline-flex h-12 items-center gap-2 border-b-2 text-[16px] font-extrabold ${
                    activeTab === "menunggu"
                      ? "border-[#6f5794] text-[#6f5794]"
                      : "border-transparent text-on-surface-variant"
                  }`}
                >
                  Menunggu Review
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-secondary-container px-2 text-sm text-[#6f5794]">
                    {pendingReports.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("selesai")}
                  className={`inline-flex h-12 items-center gap-2 border-b-2 text-[16px] font-extrabold ${
                    activeTab === "selesai"
                      ? "border-[#6f5794] text-[#6f5794]"
                      : "border-transparent text-on-surface-variant"
                  }`}
                >
                  Selesai Review
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-secondary-container px-2 text-sm text-[#6f5794]">
                    {feedbackReports.length}
                  </span>
                </button>
              </div>
            </div>

            {activeReports.length === 0 ? (
              <div className="rounded-[18px] bg-white px-7 py-12 text-center shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)]">
                <Inbox className="mx-auto h-10 w-10 text-[#6f5794]" aria-hidden="true" />
                <h3 className="mt-4 text-[20px] font-bold text-on-surface">
                  {activeTab === "menunggu"
                    ? "Tidak Ada Screening yang Menunggu"
                    : "Belum Ada Feedback Selesai"}
                </h3>
                <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-7 text-on-surface-variant">
                  {activeTab === "menunggu"
                    ? "Hasil screening yang sedang diproses akan muncul di tab ini."
                    : "Feedback psikolog akan muncul di sini setelah proses review selesai."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeReports.map((report) => {
                  const topicSlug = report.konteks_pemicu || "";
                  const currentTopicName =
                    topicLabels[topicSlug] || topicSlug.replace("-", " ") || "Umum";
                  const copy = reportStatusCopy(report);
                  const StatusIcon = copy.icon;

                  return (
                    <article
                      key={report.id_pra_asesmen}
                      className="rounded-r-[12px] border-l-4 border-[#d8c5f1] bg-white px-7 py-6 shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_32px_55px_-28px_rgba(27,28,26,0.45)]"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-container text-[#6f5794]">
                            <StatusIcon className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div>
                            <div className="mb-3 flex flex-wrap items-center gap-3">
                              <h4 className="text-[18px] font-extrabold leading-6 text-on-surface">
                                {activeTab === "selesai"
                                  ? report.nama_psikolog || "Psikolog CogniScan"
                                  : currentTopicName}
                              </h4>
                              <StatusBadge tone={copy.tone} className="h-6 text-[11px] tracking-[0.08em]">
                                {activeTab === "selesai" ? "Selesai Review" : copy.badge}
                              </StatusBadge>
                              {activeTab === "selesai" ? (
                                <StatusBadge tone="neutral" className="h-6 bg-surface-container text-[11px] tracking-[0.08em]">
                                  {currentTopicName}
                                </StatusBadge>
                              ) : null}
                            </div>
                            <p className="text-sm text-on-surface-muted">
                              {activeTab === "selesai" ? "Psikolog Klinis - " : ""}
                              {formatDate(report.divalidasi_pada || report.dibuat_pada)}
                              {activeTab === "menunggu" && report.nama_psikolog
                                ? ` - ${report.nama_psikolog}`
                                : ""}
                            </p>
                            <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-on-surface-variant line-clamp-3">
                              {copy.description}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={copy.href}
                          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#6f5794] px-5 text-[13px] font-extrabold text-[#6f5794] transition hover:bg-secondary-container/50"
                        >
                          {activeTab === "selesai" ? "Lihat Feedback" : "Lihat Detail"}
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
