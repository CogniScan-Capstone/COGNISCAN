"use client";

import Link from "next/link";
import { use, useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Save,
  Send,
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import {
  getPsikologNav,
  psikologProfileHref,
  psikologUser as defaultPsikologUser,
} from "@/components/psikolog";
import { cn } from "@/lib/utils";
import {
  fetchPsikologPreAssessmentReport,
  savePreAssessmentFeedbackDraft,
  type JournalAnswer,
  submitPreAssessmentFeedback,
  type PreAssessment,
} from "@/lib/auth";
import { getScreeningTopicLabel } from "@/config/screening-questions";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";

type AiAccuracy = "sangat-akurat" | "sebagian-akurat" | "tidak-akurat";
type SeverityLevel = "hijau" | "kuning" | "merah";
type Recommendation = "lanjutkan" | "tidak-perlu";
type Mode = "compose" | "view";

const topicToneClass: Record<string, string> = {
  peach: "border-[#f1d2c5] bg-[#fce6dc] text-[#a3553c]",
  orange: "border-[#fadcb5] bg-[#fdedd6] text-[#a35a1a]",
  lilac: "border-[#dbcfee] bg-[#e8e0f0] text-[#6f5794]",
  green: "border-[#c4ddc5] bg-[#dfeedf] text-[#3f5a3f]",
  blue: "border-[#c7d5ec] bg-[#e8effb] text-[#47658f]",
};

const severityLabel: Record<SeverityLevel, string> = {
  hijau: "Ringan",
  kuning: "Sedang",
  merah: "Tinggi",
};

const severityDot: Record<SeverityLevel, string> = {
  hijau: "bg-[#3f5a3f]",
  kuning: "bg-[#d37300]",
  merah: "bg-[#d13a31]",
};

const severityText: Record<SeverityLevel, string> = {
  hijau: "text-[#3f5a3f]",
  kuning: "text-[#d37300]",
  merah: "text-[#d13a31]",
};

const recommendationLabel: Record<Recommendation, string> = {
  lanjutkan: "Lanjutkan ke Sesi Konsultasi",
  "tidak-perlu": "Tidak Perlu Konsultasi Lanjutan",
};

const aiAccuracyOptions: AiAccuracy[] = [
  "sangat-akurat",
  "sebagian-akurat",
  "tidak-akurat",
];

const severityOptions: SeverityLevel[] = ["hijau", "kuning", "merah"];

const recommendationOptions: Recommendation[] = ["lanjutkan", "tidak-perlu"];

const recommendationFallback = [
  "Pertimbangkan psikoedukasi singkat yang membantu pasien memahami pola pikirnya dan memantau emosi harian.",
];

function cleanRecommendationText(value: string) {
  return value
    .replace(/^\s*(?:[-*]|\d+[.)])\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatAiRecommendations(value?: string | null) {
  if (!value?.trim()) return recommendationFallback;

  const normalized = value.replace(/\r/g, "\n").trim();
  const lineItems = normalized
    .split(/\n+/)
    .map(cleanRecommendationText)
    .filter(Boolean);

  if (lineItems.length > 1) return lineItems;

  const sentenceItems = normalized
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map(cleanRecommendationText)
    .filter(Boolean);

  return sentenceItems && sentenceItems.length > 0
    ? sentenceItems
    : recommendationFallback;
}

function buildDialogText(answers?: JournalAnswer[] | null, fallback?: string | null) {
  const filledAnswers = (answers ?? [])
    .filter((answer) => (answer.teks_jawaban ?? "").trim().length > 0)
    .sort((a, b) => (a.urutan_pertanyaan ?? 0) - (b.urutan_pertanyaan ?? 0));

  if (filledAnswers.length > 0) {
    return filledAnswers
      .map((answer, index) => {
        const order = answer.urutan_pertanyaan ?? index + 1;
        const question = answer.teks_pertanyaan?.trim() || `Pertanyaan ${order}`;
        const response = answer.teks_jawaban?.trim() || "-";
        return `Pertanyaan ${order}: ${question}\nJawaban: ${response}`;
      })
      .join("\n\n");
  }

  return fallback?.trim() || "Tidak ada sesi dialog yang tersimpan.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function hasFinalFeedback(report: PreAssessment) {
  return Boolean(
    report.status_validasi === "selesai" &&
      report.divalidasi_pada &&
      report.feedback_psikolog?.trim(),
  );
}

function isAiAccuracy(value?: string | null): value is AiAccuracy {
  return aiAccuracyOptions.includes(value as AiAccuracy);
}

function isSeverityLevel(value?: string | null): value is SeverityLevel {
  return severityOptions.includes(value as SeverityLevel);
}

function isRecommendation(value?: string | null): value is Recommendation {
  return recommendationOptions.includes(value as Recommendation);
}

function severityFromUrgency(value?: string | null): SeverityLevel {
  if (value === "critical" || value === "high" || value === "tinggi") return "merah";
  if (value === "medium" || value === "sedang") return "kuning";
  return "hijau";
}

export default function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const backendUser = useBackendUser();
  const displayUser = useMemo(() => ({
    ...defaultPsikologUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPsikologUser.name,
  }), [backendUser]);

  const [report, setReport] = useState<PreAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const [mode, setMode] = useState<Mode>("compose");
  const [aiAccuracy, setAiAccuracy] = useState<AiAccuracy | null>(null);
  const [severityFinal, setSeverityFinal] = useState<SeverityLevel>("hijau");
  const [recommendation, setRecommendation] = useState<Recommendation>("lanjutkan");
  const [feedbackText, setFeedbackText] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [savedDraft, setSavedDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  function hydrateFeedbackForm(dataReport: PreAssessment) {
    const hasFeedback = hasFinalFeedback(dataReport);

    if (hasFeedback) {
      setMode("view");
      setFeedbackText(dataReport.feedback_psikolog || "");
      setInternalNotes(dataReport.catatan_internal_psikolog || "");
      setAiAccuracy(
        isAiAccuracy(dataReport.akurasi_ai_psikolog)
          ? dataReport.akurasi_ai_psikolog
          : null,
      );
      setSeverityFinal(
        isSeverityLevel(dataReport.severity_final_psikolog)
          ? dataReport.severity_final_psikolog
          : severityFromUrgency(dataReport.indikator_urgensi),
      );
      setRecommendation(
        isRecommendation(dataReport.rekomendasi_tindak_lanjut_psikolog)
          ? dataReport.rekomendasi_tindak_lanjut_psikolog
          : "lanjutkan",
      );
      setDraftSavedAt(dataReport.draft_disimpan_pada ?? null);
      return;
    }

    setMode("compose");
    setFeedbackText(dataReport.draft_feedback_psikolog || "");
    setInternalNotes(dataReport.draft_catatan_internal || "");
    setAiAccuracy(
      isAiAccuracy(dataReport.draft_akurasi_ai)
        ? dataReport.draft_akurasi_ai
        : null,
    );
    setSeverityFinal(
      isSeverityLevel(dataReport.draft_severity_final)
        ? dataReport.draft_severity_final
        : severityFromUrgency(dataReport.indikator_urgensi),
    );
    setRecommendation(
      isRecommendation(dataReport.draft_rekomendasi_tindak_lanjut)
        ? dataReport.draft_rekomendasi_tindak_lanjut
        : "lanjutkan",
    );
    setDraftSavedAt(dataReport.draft_disimpan_pada ?? null);
  }

  const loadReport = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
      }
      const dataReport = await fetchPsikologPreAssessmentReport(accessToken, Number(id));
      setReport(dataReport);
      hydrateFeedbackForm(dataReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadInitialReport() {
      setLoading(true);
      setError("");
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        }
        const dataReport = await fetchPsikologPreAssessmentReport(accessToken, Number(id));
        if (!isMounted) return;

        setReport(dataReport);
        hydrateFeedbackForm(dataReport);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat detail feedback.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialReport();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const displayData = useMemo(() => {
    if (!report) return null;

    const topicToneMap: Record<string, "peach" | "orange" | "lilac" | "green" | "blue"> = {
      pendidikan: "orange",
      keluarga: "peach",
      hubungan: "blue",
      keuangan: "green",
      "diri-sendiri": "lilac",
      kesehatan: "lilac",
    };
    const topicTone = topicToneMap[report.konteks_pemicu?.toLowerCase() || ""] || "blue";

    const relativeTime = report.dibuat_pada
      ? new Date(report.dibuat_pada).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "-";

    const aiSummary = report.distorsi_terdeteksi && report.distorsi_terdeteksi.length > 0
      ? report.distorsi_terdeteksi.map((distortion, index) => ({
          id: String(distortion.id_distorsi_terdeteksi ?? `${index}-${distortion.tipe_distorsi ?? "distorsi"}`),
          type: distortion.tipe_distorsi?.trim() || "Distorsi kognitif",
          evidence: distortion.kalimat_bukti?.trim() || "",
          explanation: distortion.penjelasan?.trim() || "Penjelasan AI belum tersedia.",
        }))
      : [
          {
            id: "no-distortion",
            type: "Tidak ada distorsi spesifik",
            evidence: "",
            explanation: "AI tidak mendeteksi distorsi kognitif spesifik pada sesi ini.",
          },
        ];

    const aiRecommendations = formatAiRecommendations(report.rekomendasi);

    const tags = report.distorsi_terdeteksi
      ? Array.from(new Set(report.distorsi_terdeteksi.map(d => d.tipe_distorsi).filter(Boolean))) as string[]
      : [];

    const aiSeverity: SeverityLevel = report.indikator_urgensi === "critical" || report.indikator_urgensi === "high" || report.indikator_urgensi === "tinggi"
      ? "merah"
      : report.indikator_urgensi === "medium" || report.indikator_urgensi === "sedang"
        ? "kuning"
        : "hijau";

    return {
      name: report.nama_pasien || "Pasien Anonim",
      topic: getScreeningTopicLabel(report.konteks_pemicu),
      topicTone,
      relativeTime,
      dialogText: buildDialogText(report.jawaban_jurnal, report.dialog_jurnal),
      aiSummary,
      aiRecommendations,
      tags,
      aiSeverity,
      aiScore: report.skor_keparahan ?? null,
      answerCount: report.jawaban_jurnal?.filter(
        (answer) => (answer.teks_jawaban ?? "").trim().length > 0,
      ).length ?? 0,
    };
  }, [report]);

  const remaining = 500 - feedbackText.length;
  const feedbackReady = feedbackText.trim().length >= 10;
  const canClickSubmit = !submitting && !savingDraft;

  const handleSaveDraft = async () => {
    if (savingDraft || submitting) return;

    setSavingDraft(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
      }

      const updatedReport = await savePreAssessmentFeedbackDraft(
        accessToken,
        Number(id),
        {
          draft_feedback_psikolog: feedbackText,
          draft_catatan_internal: internalNotes,
          draft_akurasi_ai: aiAccuracy,
          draft_severity_final: severityFinal,
          draft_rekomendasi_tindak_lanjut: recommendation,
        },
      );

      setReport(updatedReport);
      setDraftSavedAt(updatedReport.draft_disimpan_pada ?? null);
      setSavedDraft(true);
      setTimeout(() => setSavedDraft(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!canClickSubmit) return;

    if (!feedbackReady) {
      setError("Feedback untuk pasien minimal 10 karakter sebelum bisa dikirim.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
      }
      await submitPreAssessmentFeedback(accessToken, Number(id), {
        feedback_psikolog: feedbackText,
        status_validasi: "selesai",
        catatan_internal_psikolog: internalNotes,
        akurasi_ai_psikolog: aiAccuracy,
        severity_final_psikolog: severityFinal,
        rekomendasi_tindak_lanjut_psikolog: recommendation,
      });
      setMode("view");
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    setMode("compose");
  };

  const handleDelete = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
      }
      await submitPreAssessmentFeedback(accessToken, Number(id), {
        feedback_psikolog: "",
        status_validasi: "sedang_direview",
        catatan_internal_psikolog: null,
        akurasi_ai_psikolog: null,
        severity_final_psikolog: null,
        rekomendasi_tindak_lanjut_psikolog: null,
      });
      setMode("compose");
      setFeedbackText("");
      setInternalNotes("");
      setAiAccuracy(null);
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Feedback"
      navItems={getPsikologNav("feedback")}
      user={displayUser}
      profileHref={psikologProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/psikolog/feedback"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-on-surface-variant transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Daftar Feedback
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary-container/60 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6f5794]">
            {mode === "compose" ? "Sedang Direspon" : "Sudah Direspon"}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[24px] border border-outline-variant shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-[#6f5794]" />
            <p className="mt-4 text-sm text-on-surface-muted">Memuat detail feedback...</p>
          </div>
        ) : error && !report ? (
          <div className="rounded-[24px] bg-white border border-red-200 p-8 text-center max-w-[600px] mx-auto mt-10 shadow-sm">
            <p className="text-sm font-semibold text-red-800 mb-4">{error}</p>
            <button
              onClick={loadReport}
              className="inline-flex h-10 items-center justify-center rounded-full bg-red-100 px-5 text-sm font-semibold text-red-800 hover:bg-red-200 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : displayData ? (
          <>
            {error && (
              <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              <DashboardCard className="overflow-hidden border-transparent bg-[#7d75a1] px-7 py-7 text-white shadow-[0_24px_48px_-24px_rgba(45,33,64,0.55)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      Analisis AI CogniScan
                    </span>

                    <h2 className="mt-4 text-[20px] font-bold text-white">
                      {displayData.name}
                    </h2>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-bold uppercase tracking-widest",
                          topicToneClass[displayData.topicTone],
                        )}
                      >
                        {displayData.topic}
                      </span>

                      <span className="text-[13px] text-white/80">
                        {displayData.relativeTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20">
                    <Brain className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-6 rounded-[20px] bg-[#efe7f6] p-5 text-[#2f2841] shadow-[0_18px_36px_-28px_rgba(20,16,35,0.85)] ring-1 ring-white/25">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-bold uppercase text-[#6f5794]">
                        Ringkasan AI
                      </p>
                      <h3 className="mt-1 text-[17px] font-bold text-[#2f2841]">
                        Distorsi kognitif yang perlu ditinjau
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold",
                          displayData.aiSeverity === "hijau" && "bg-[#dfeedf] text-[#3f5a3f]",
                          displayData.aiSeverity === "kuning" && "bg-[#fff1c7] text-[#9a5800]",
                          displayData.aiSeverity === "merah" && "bg-[#ffe0de] text-[#a3372e]",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            severityDot[displayData.aiSeverity],
                          )}
                        />
                        {severityLabel[displayData.aiSeverity]}
                      </span>

                      <span className="rounded-full bg-[#f3edf7] px-3 py-1.5 text-[12px] font-bold text-[#6f5794]">
                        {displayData.aiScore === null
                          ? "Skor belum tersedia"
                          : `Skor ${displayData.aiScore}/10`}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {displayData.aiSummary.map((item, index) => (
                      <li
                        key={item.id}
                        className="rounded-[14px] border border-[#d8cce8] bg-[#f8f3fc] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7d75a1] text-[12px] font-bold text-white">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-[14px] font-bold text-[#2f2841]">
                              {item.type}
                            </p>
                            <p className="mt-1 text-[13px] leading-5 text-[#5d556f]">
                              {item.explanation}
                            </p>
                          </div>
                        </div>

                        {item.evidence ? (
                          <div className="mt-3 rounded-[10px] border-l-4 border-[#7d75a1] bg-[#eee7f5] px-3 py-2">
                            <p className="text-[11px] font-bold uppercase text-[#6f5794]">
                              Kalimat bukti
                            </p>
                            <p className="mt-1 text-[13px] leading-5 text-[#4d465f]">
                              &quot;{item.evidence}&quot;
                            </p>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 rounded-[16px] bg-white/10 p-4 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                        Sesi Dialog Pasien
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-white/75">
                        {displayData.answerCount > 0
                          ? `${displayData.answerCount} jawaban pasien tersedia.`
                          : "Belum ada jawaban pasien yang tersimpan untuk laporan ini."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDialog((current) => !current)}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f3edf7] px-4 text-[13px] font-semibold text-[#6f5794] transition hover:bg-[#e8ddf2]"
                    >
                      {showDialog ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                      {showDialog ? "Sembunyikan Dialog" : "Tampilkan Dialog"}
                    </button>
                  </div>

                  {showDialog ? (
                    <div className="mt-4 max-h-[320px] overflow-y-auto rounded-[14px] bg-white/10 p-4 ring-1 ring-white/10">
                      <p className="whitespace-pre-wrap text-[14px] leading-7 text-white">
                        {displayData.dialogText}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 rounded-[16px] bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                    Rekomendasi Psikoedukasi AI
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-white/75">
                    Bahan awal untuk membantu psikolog menyusun feedback kepada pasien.
                  </p>

                  <ol className="mt-4 space-y-3">
                    {displayData.aiRecommendations.map((rec, idx) => (
                      <li
                        key={`${idx}-${rec}`}
                        className="rounded-[12px] bg-[#efe7f6] px-4 py-3 text-[#2f2841] ring-1 ring-white/20"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7d75a1] text-[12px] font-bold text-white">
                            {idx + 1}
                          </span>

                          <div>
                            <p className="text-[14px] leading-6 text-[#4d465f]">
                              {rec}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {displayData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white ring-1 ring-white/10"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

              </DashboardCard>

              {mode === "compose" ? (
                <DashboardCard className="px-7 py-7 lg:sticky lg:top-6">
                  <div className="mb-6 rounded-[14px] border border-[#d8c5f1] bg-secondary-container/35 px-4 py-3">
                    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#6f5794]">
                      Draft Feedback
                    </p>
                    <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
                      {draftSavedAt
                        ? `Draft terakhir disimpan ${formatDateTime(draftSavedAt)}. Draft belum terlihat oleh pasien.`
                        : "Draft belum disimpan. Pasien hanya akan melihat feedback setelah Anda mengirim versi final."}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                      1. Akurasi Hasil Analisis AI
                    </p>
                    <p className="mt-1 text-[13px] text-on-surface-variant">
                      Menurut Anda, seberapa akurat hasil screening AI di samping?
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {(
                        ["sangat-akurat", "sebagian-akurat", "tidak-akurat"] as const
                      ).map((opt) => {
                        const active = aiAccuracy === opt;
                        const labels = {
                          "sangat-akurat": "Sangat Akurat",
                          "sebagian-akurat": "Sebagian Akurat",
                          "tidak-akurat": "Tidak Akurat",
                        };
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAiAccuracy(opt)}
                            className={cn(
                              "inline-flex h-11 items-center justify-center rounded-full border text-[13px] font-semibold transition",
                              active
                                ? "border-[#3f5a3f] bg-[#dfeedf] text-[#3f5a3f]"
                                : "border-outline-variant bg-white text-on-surface hover:border-primary",
                            )}
                          >
                            {labels[opt]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                      2. Tingkat Keparahan Akhir (Validasi)
                    </p>
                    <p className="mt-1 text-[13px] text-on-surface-variant">
                      Sesuaikan tingkat keparahan berdasarkan penilaian klinis Anda.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {(["hijau", "kuning", "merah"] as const).map((opt) => {
                        const active = severityFinal === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSeverityFinal(opt)}
                            className={cn(
                              "inline-flex h-11 items-center justify-center gap-2 rounded-full border text-[13px] font-semibold transition",
                              active
                                ? "border-transparent text-white"
                                : "border-outline-variant bg-white text-on-surface hover:border-primary",
                              active && opt === "hijau" && "bg-[#3f5a3f]",
                              active && opt === "kuning" && "bg-[#d37300]",
                              active && opt === "merah" && "bg-[#d13a31]",
                            )}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                active
                                  ? "bg-white"
                                  : opt === "hijau"
                                    ? "bg-[#3f5a3f]"
                                    : opt === "kuning"
                                      ? "bg-[#d37300]"
                                      : "bg-[#d13a31]",
                              )}
                            />
                            {severityLabel[opt]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                      3. Rekomendasi Tindak Lanjut
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {(["lanjutkan", "tidak-perlu"] as const).map((opt) => {
                        const active = recommendation === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setRecommendation(opt)}
                            className={cn(
                              "rounded-[14px] border px-4 py-3 text-left text-[13px] font-semibold transition",
                              active
                                ? "border-[#3f5a3f] bg-[#dfeedf] text-[#3f5a3f]"
                                : "border-outline-variant bg-white text-on-surface-variant hover:border-primary",
                            )}
                          >
                            {recommendationLabel[opt]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="feedback-text"
                        className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted"
                      >
                        Feedback untuk Pasien
                      </label>
                      <span
                        className={cn(
                          "text-[12px] font-medium",
                          remaining < 0
                            ? "text-[#d13a31]"
                            : "text-on-surface-muted",
                        )}
                      >
                        {feedbackText.length}/500
                      </span>
                    </div>
                    <textarea
                      id="feedback-text"
                      value={feedbackText}
                      onChange={(e) =>
                        setFeedbackText(e.target.value.slice(0, 500))
                      }
                      rows={5}
                      placeholder="Tulis tanggapan empatik dan terstruktur untuk pasien…"
                      className="mt-2 w-full resize-none rounded-[14px] border border-outline-variant bg-white px-4 py-3 text-[14px] leading-6 text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="mt-5">
                    <label
                      htmlFor="internal-notes"
                      className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted"
                    >
                      Catatan Internal (Opsional)
                    </label>
                    <textarea
                      id="internal-notes"
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows={3}
                      placeholder="Catatan pribadi (tidak ditampilkan ke pasien)"
                      className="mt-2 w-full resize-none rounded-[14px] border border-outline-variant bg-white px-4 py-3 text-[14px] leading-6 text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    {savedDraft ? (
                      <span className="inline-flex h-11 items-center gap-2 rounded-full bg-[#dfeedf] px-4 text-[13px] font-semibold text-[#3f5a3f]">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Draft tersimpan
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={savingDraft || submitting}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-outline-variant bg-white px-5 text-[14px] font-semibold text-on-surface-variant transition hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60"
                    >
                      {savingDraft ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="h-4 w-4" aria-hidden="true" />
                      )}
                      {savingDraft ? "Menyimpan Draft..." : "Simpan Draft"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canClickSubmit}
                      className={cn(
                        "inline-flex h-11 items-center gap-2 rounded-full px-6 text-[14px] font-semibold text-white transition",
                        canClickSubmit
                          ? "bg-[#3f5a3f] hover:bg-[#324a32]"
                          : "bg-[#3f5a3f]/40 cursor-wait",
                      )}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin animate-infinite" aria-hidden="true" />
                      ) : (
                        <Send className="h-4 w-4" aria-hidden="true" />
                      )}
                      {submitting ? "Mengirim..." : "Kirim Feedback ke Pasien"}
                    </button>
                  </div>
                </DashboardCard>
              ) : (
                <DashboardCard className="px-7 py-7 lg:sticky lg:top-6">
                  <div className="flex items-center gap-2 rounded-full bg-[#dfeedf] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#3f5a3f] w-fit">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Feedback Terkirim
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[14px] border border-outline-variant px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
                        Severity Final
                      </p>
                      <p
                        className={cn(
                          "mt-2 inline-flex items-center gap-2 text-[15px] font-semibold",
                          severityText[severityFinal],
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            severityDot[severityFinal],
                          )}
                        />
                        {severityLabel[severityFinal]}
                      </p>
                    </div>
                    <div className="rounded-[14px] border border-outline-variant px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
                        Rekomendasi
                      </p>
                      <p className="mt-2 text-[14px] font-semibold text-on-surface">
                        {recommendationLabel[recommendation]}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[14px] bg-surface-container/60 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                      Catatan untuk Pasien
                    </p>
                    <p className="mt-2 text-[15px] leading-7 text-on-surface-variant whitespace-pre-wrap">
                      {feedbackText}
                    </p>
                  </div>

                  {internalNotes ? (
                    <div className="mt-4 rounded-[14px] border border-dashed border-outline-variant px-5 py-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                        Catatan Internal
                      </p>
                      <p className="mt-2 text-[14px] leading-6 text-on-surface-variant whitespace-pre-wrap">
                        {internalNotes}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={submitting}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-[#d13a31]/40 bg-white px-5 text-[14px] font-semibold text-[#a3372e] transition hover:border-[#d13a31] disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#a3372e]" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      Hapus
                    </button>
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-[#3f5a3f] px-6 text-[14px] font-semibold text-white transition hover:bg-[#324a32]"
                    >
                      <Edit3 className="h-4 w-4" aria-hidden="true" />
                      Edit Feedback
                    </button>
                  </div>
                </DashboardCard>
              )}
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
