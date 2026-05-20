"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  ClipboardList,
  Inbox,
  Loader2,
  MessageSquare,
} from "lucide-react";
import {
  DashboardCard,
  DashboardLayout,
  MetricCard,
  StatusBadge,
} from "@/components/dashboard";
import {
  getPsikologNav,
  psikologProfileHref,
  psikologUser as defaultPsikologUser,
} from "@/components/psikolog";
import { cn } from "@/lib/utils";
import {
  fetchPsikologDashboardSummary,
  type PsikologDashboardSummary,
} from "@/lib/auth";
import { useBackendUser } from "@/lib/useBackendUser";
import { useCachedApi } from "@/lib/useCachedApi";

type Priority = "high" | "medium" | "low";

const priorityBadge: Record<Priority, string> = {
  high: "bg-[#fbd6d4] text-[#a3372e]",
  medium: "bg-[#fbe8c5] text-[#a35a1a]",
  low: "bg-surface-container text-on-surface-variant",
};

const topicLabels: Record<string, string> = {
  pendidikan: "Pendidikan",
  keluarga: "Keluarga",
  hubungan: "Hubungan",
  keuangan: "Keuangan",
  "diri-sendiri": "Diri Sendiri",
  kesehatan: "Kesehatan",
};

function derivePriority(urgency: string | null | undefined): Priority {
  if (urgency === "critical" || urgency === "high" || urgency === "tinggi") {
    return "high";
  }
  if (urgency === "medium" || urgency === "sedang") return "medium";
  return "low";
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function PsikologDashboardPage() {
  const backendUser = useBackendUser();
  const displayUser = useMemo(
    () => ({
      ...defaultPsikologUser,
      name: backendUser?.nama_lengkap?.trim() || defaultPsikologUser.name,
    }),
    [backendUser],
  );

  const { data: summary, loading, error, refetch: loadData } = useCachedApi<PsikologDashboardSummary>(
    "psikolog-dashboard-summary",
    fetchPsikologDashboardSummary,
  );

  return (
    <DashboardLayout
      title={`Halo, ${displayUser.name} 👋`}
      navItems={getPsikologNav("dashboard")}
      user={displayUser}
      profileHref={psikologProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="space-y-8">
        {/* Metric Cards */}
        <section className="grid gap-6 lg:grid-cols-2">
          <MetricCard
            label="Feedback Belum Direspon"
            value={loading ? "…" : String(summary?.feedback_belum_direspon ?? 0)}
            icon={<MessageSquare />}
            iconTone="purple"
          />
          <MetricCard
            label="Total Laporan Ditugaskan"
            value={loading ? "…" : String(summary?.total_laporan ?? 0)}
            icon={<ClipboardList />}
            iconTone="green"
          />
        </section>

        {/* Recent Reports Section */}
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold text-[#6f5794]">
                Laporan Pre-Assessment Terbaru
              </h2>
              <p className="mt-1 text-[14px] text-on-surface-variant">
                Data screening pasien yang perlu ditinjau.
              </p>
            </div>
            <Link
              href="/psikolog/feedback"
              className="inline-flex items-center gap-1 text-[14px] font-semibold text-primary hover:underline"
            >
              Lihat Semua
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <DashboardCard className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#6f5794]" />
                <p className="text-[14px] font-medium text-on-surface-variant">
                  Memuat data dashboard...
                </p>
              </div>
            </DashboardCard>
          ) : error ? (
            <DashboardCard className="px-8 py-10 text-center">
              <p className="text-[15px] font-semibold text-red-700">{error}</p>
              <button
                onClick={loadData}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-[#3f5a3f] px-5 text-[13px] font-semibold text-white transition hover:bg-[#324a32]"
              >
                Coba Lagi
              </button>
            </DashboardCard>
          ) : summary && summary.laporan_terbaru.length === 0 ? (
            <DashboardCard className="flex flex-col items-center justify-center px-8 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-container text-[#6f5794] mb-4">
                <Inbox className="h-8 w-8" aria-hidden="true" />
              </div>
              <h3 className="text-[18px] font-bold text-on-surface mb-2">
                Belum Ada Laporan
              </h3>
              <p className="max-w-[440px] text-[15px] leading-7 text-on-surface-variant">
                Belum ada pasien yang menugaskan Anda untuk meninjau hasil screening mereka. Laporan akan muncul di sini setelah pasien memilih Anda sebagai psikolog.
              </p>
            </DashboardCard>
          ) : summary ? (
            <div className="space-y-4">
              {summary.laporan_terbaru.map((report) => {
                const priority = derivePriority(report.indikator_urgensi);
                const topicSlug = report.konteks_pemicu || "";
                const topicName =
                  topicLabels[topicSlug] ||
                  topicSlug.replace("-", " ") ||
                  "Umum";
                const initials = (report.nama_pasien || "?")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <DashboardCard
                    key={report.id_pra_asesmen}
                    className="px-7 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_50px_-24px_rgba(27,28,26,0.4)]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-[12px] font-bold text-[#6f5794]">
                          {initials}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-[16px] font-bold text-on-surface">
                              {report.nama_pasien || "Pasien Anonim"}
                            </h3>
                            <StatusBadge tone="purple" className="text-[11px]">
                              {topicName}
                            </StatusBadge>
                          </div>
                          <p className="mt-1 text-[13px] text-on-surface-muted">
                            {formatDate(report.dibuat_pada)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex h-7 items-center rounded-full px-3 text-[11px] font-bold uppercase tracking-widest",
                            priorityBadge[priority],
                          )}
                        >
                          {priority} priority
                        </span>

                        <span
                          className={cn(
                            "inline-flex h-7 items-center rounded-full px-3 text-[11px] font-bold uppercase tracking-widest",
                            report.feedback_tersedia
                              ? "bg-[#dfeedf] text-[#3f5a3f]"
                              : "bg-surface-container text-on-surface-variant",
                          )}
                        >
                          {report.feedback_tersedia
                            ? "Sudah Direspon"
                            : "Belum Direspon"}
                        </span>

                        <Link
                          href={`/psikolog/feedback/${report.id_pra_asesmen}`}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-outline-variant px-5 text-[13px] font-semibold text-on-surface transition hover:border-primary hover:text-primary"
                        >
                          Lihat Detail
                        </Link>
                      </div>
                    </div>
                  </DashboardCard>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </DashboardLayout>
  );
}
