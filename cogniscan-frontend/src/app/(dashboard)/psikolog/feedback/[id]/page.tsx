"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Edit3,
  Loader2,
  PauseCircle,
  Save,
  Send,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import { getPsikologNav, psikologUser } from "@/components/psikolog";
import { cn } from "@/lib/utils";

type AiAccuracy = "sangat-akurat" | "sebagian-akurat" | "tidak-akurat";
type SeverityLevel = "hijau" | "kuning" | "merah";
type Recommendation = "lanjutkan" | "tidak-perlu";
type Mode = "compose" | "view";

type FeedbackData = {
  id: string;
  name: string;
  topic: string;
  topicTone: "peach" | "orange" | "lilac" | "green" | "blue";
  relativeTime: string;
  message: string;
  aiSummary: string[];
  aiRecommendations: string[];
  aiSeverity: SeverityLevel;
  aiScore: number;
  tags: string[];
};

const dataset: Record<string, FeedbackData> = {
  "rina-marlina": {
    id: "rina-marlina",
    name: "Rina Marlina",
    topic: "Keluarga",
    topicTone: "peach",
    relativeTime: "2 jam yang lalu",
    message:
      "Saya merasa kesulitan untuk berkomunikasi dengan anak saya belakangan ini. Setiap kali saya mencoba berbicara, dia justru menjauh. Mohon arahannya untuk sesi minggu depan apakah kita bisa fokus pada topik ini?",
    aiSummary: [
      "Pasien menunjukkan kekhawatiran terhadap relasi orang tua-anak.",
      "Terdapat indikasi stres ringan akibat komunikasi yang terputus.",
      "Pola interaksi keluarga berpotensi memengaruhi kondisi emosional.",
    ],
    aiRecommendations: [
      "Eksplorasi pola komunikasi keluarga pada sesi berikutnya.",
      "Sarankan teknik active listening untuk dipraktikkan di rumah.",
      "Pertimbangkan psikoedukasi singkat tentang fase remaja.",
    ],
    aiSeverity: "kuning",
    aiScore: 62,
    tags: ["komunikasi", "relasi keluarga", "stres ringan"],
  },
  "dimas-pratama": {
    id: "dimas-pratama",
    name: "Dimas Pratama",
    topic: "Kecemasan",
    topicTone: "lilac",
    relativeTime: "Kemarin, 09:15",
    message:
      "Beberapa hari ini saya susah tidur dan jantung sering berdebar kencang menjelang ujian. Saya butuh strategi cepat untuk menenangkan diri sebelum sesi ujian besok.",
    aiSummary: [
      "Pasien melaporkan gejala kecemasan fisik (insomnia, palpitasi).",
      "Pemicu utama: tekanan ujian dan ekspektasi performa.",
      "Membutuhkan strategi grounding jangka pendek.",
    ],
    aiRecommendations: [
      "Berikan teknik pernapasan 4-7-8 untuk meredakan palpitasi.",
      "Sarankan jurnal kecemasan harian menjelang ujian.",
      "Pertimbangkan sesi follow-up dalam 3 hari ke depan.",
    ],
    aiSeverity: "merah",
    aiScore: 78,
    tags: ["kecemasan", "insomnia", "ujian"],
  },
  "sari-wulandari": {
    id: "sari-wulandari",
    name: "Sari Wulandari",
    topic: "Pendidikan",
    topicTone: "orange",
    relativeTime: "Kemarin, 14:20",
    message:
      "Terima kasih atas sarannya dokter, saya sudah mulai menerapkan jadwal belajar baru dan merasa jauh lebih tenang.",
    aiSummary: [
      "Pasien menunjukkan progres positif dengan intervensi.",
      "Tingkat stres akademik menurun signifikan.",
      "Cocok untuk dipertahankan tanpa perubahan rencana.",
    ],
    aiRecommendations: [
      "Apresiasi konsistensi pasien dalam menjalankan jadwal baru.",
      "Lanjutkan monitoring ringan setiap 2 minggu.",
      "Dorong pasien mendokumentasikan keberhasilan kecil.",
    ],
    aiSeverity: "hijau",
    aiScore: 28,
    tags: ["progres positif", "manajemen waktu"],
  },
  "bagas-nugroho": {
    id: "bagas-nugroho",
    name: "Bagas Nugroho",
    topic: "Keuangan",
    topicTone: "green",
    relativeTime: "2 hari lalu",
    message:
      "Pekerjaan saya sedang tidak stabil dan saya merasa cemas memikirkan tagihan bulan depan. Apakah ada teknik untuk mengelola pikiran berulang seperti ini?",
    aiSummary: [
      "Pasien menunjukkan ruminasi terkait kestabilan finansial.",
      "Kekhawatiran berdampak pada konsentrasi harian.",
      "Membutuhkan teknik reframing dan grounding sederhana.",
    ],
    aiRecommendations: [
      "Latih cognitive reframing untuk pikiran berulang.",
      "Sarankan teknik grounding 5-4-3-2-1 saat ruminasi muncul.",
      "Diskusikan rencana finansial sederhana untuk menurunkan beban kognitif.",
    ],
    aiSeverity: "kuning",
    aiScore: 55,
    tags: ["ruminasi", "stres finansial"],
  },
  "lina-marlina": {
    id: "lina-marlina",
    name: "Lina Marlina",
    topic: "Hubungan",
    topicTone: "blue",
    relativeTime: "3 hari lalu",
    message:
      "Saya dan pasangan sudah mencoba teknik komunikasi yang dokter sarankan, perlahan terasa lebih lega. Terima kasih banyak.",
    aiSummary: [
      "Pasien menerapkan teknik komunikasi yang disarankan.",
      "Hubungan menunjukkan kualitas yang membaik.",
      "Direkomendasikan check-in ringan dalam 2 minggu.",
    ],
    aiRecommendations: [
      "Apresiasi penerapan teknik komunikasi yang konsisten.",
      "Sarankan ritual quality time mingguan bersama pasangan.",
      "Jadwalkan check-in singkat 2 minggu lagi.",
    ],
    aiSeverity: "hijau",
    aiScore: 30,
    tags: ["komunikasi pasangan", "progres positif"],
  },
};

const topicToneClass: Record<FeedbackData["topicTone"], string> = {
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

const severityBg: Record<SeverityLevel, string> = {
  hijau: "bg-[#dfeedf]",
  kuning: "bg-[#fbe8c5]",
  merah: "bg-[#fbd6d4]",
};

const recommendationLabel: Record<Recommendation, string> = {
  lanjutkan: "Lanjutkan ke Sesi Konsultasi",
  "tidak-perlu": "Tidak Perlu Konsultasi Lanjutan",
};

export default function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const data = useMemo(
    () => dataset[id] ?? dataset["rina-marlina"],
    [id],
  );

  const [mode, setMode] = useState<Mode>("compose");
  const [aiAccuracy, setAiAccuracy] = useState<AiAccuracy | null>(null);
  const [severityFinal, setSeverityFinal] = useState<SeverityLevel>(
    data.aiSeverity,
  );
  const [recommendation, setRecommendation] = useState<Recommendation>(
    "lanjutkan",
  );
  const [feedbackText, setFeedbackText] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [savedDraft, setSavedDraft] = useState(false);

  const remaining = 500 - feedbackText.length;
  const canSubmit = feedbackText.trim().length >= 20 && aiAccuracy !== null;

  const handleSaveDraft = () => {
    setSavedDraft(true);
    setTimeout(() => setSavedDraft(false), 1800);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setMode("view");
  };

  const handleEdit = () => {
    setMode("compose");
  };

  const handleDelete = () => {
    setMode("compose");
    setFeedbackText("");
    setInternalNotes("");
    setAiAccuracy(null);
    setRecommendation("lanjutkan");
    setSeverityFinal(data.aiSeverity);
  };

  return (
    <DashboardLayout
      title="Feedback"
      navItems={getPsikologNav("feedback")}
      user={psikologUser}
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <DashboardCard className="overflow-hidden border-transparent bg-[#2d2140] px-7 py-7 text-white shadow-[0_24px_48px_-24px_rgba(45,33,64,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d8c9f0] backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Analisis AI CogniScan
                </span>
                <h2 className="mt-4 text-[20px] font-bold text-white">
                  {data.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-bold uppercase tracking-[0.1em]",
                      topicToneClass[data.topicTone],
                    )}
                  >
                    {data.topic}
                  </span>
                  <span className="text-[13px] text-white/60">
                    {data.relativeTime}
                  </span>
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#a98ad6]/20 text-[#d8c9f0] ring-1 ring-white/10">
                <Brain className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-6 rounded-[18px] bg-white/[0.06] p-5 ring-1 ring-white/10">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                Pesan Pasien
              </p>
              <p className="mt-2 text-[15px] leading-7 text-white/85">
                {data.message}
              </p>
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                Ringkasan AI
              </p>
              <ul className="mt-3 space-y-2">
                {data.aiSummary.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2 text-[14px] text-white/85"
                  >
                    <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-[#a98ad6]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                Rekomendasi AI
              </p>
              <ol className="mt-3 space-y-2">
                {data.aiRecommendations.map((rec, idx) => (
                  <li
                    key={rec}
                    className="flex items-start gap-3 rounded-[12px] bg-white/[0.05] px-3 py-2 text-[14px] text-white/85 ring-1 ring-white/10"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a98ad6]/25 text-[11px] font-bold text-[#d8c9f0]">
                      {idx + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-[#d8c9f0] ring-1 ring-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] bg-white/[0.06] p-4 ring-1 ring-white/10">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                  Severity AI
                </p>
                <p
                  className={cn(
                    "mt-2 inline-flex items-center gap-2 text-[15px] font-semibold",
                    data.aiSeverity === "hijau" && "text-[#9ec79d]",
                    data.aiSeverity === "kuning" && "text-[#f0c46a]",
                    data.aiSeverity === "merah" && "text-[#f59390]",
                  )}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      severityDot[data.aiSeverity],
                    )}
                  />
                  {severityLabel[data.aiSeverity]}
                </p>
              </div>
              <div className="rounded-[14px] bg-white/[0.06] p-4 ring-1 ring-white/10">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                  Score
                </p>
                <p className="mt-2 text-[20px] font-bold text-white">
                  {data.aiScore}%
                </p>
              </div>
            </div>
          </DashboardCard>

          {mode === "compose" ? (
            <DashboardCard className="px-7 py-7">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                  Konfirmasi Akurasi AI
                </p>
                <p className="mt-1 text-[13px] text-on-surface-variant">
                  Seberapa akurat analisis AI dibandingkan penilaian Anda?
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {([
                    {
                      value: "sangat-akurat",
                      label: "Sangat Akurat",
                      icon: CheckCircle2,
                      activeClass:
                        "border-[#3f5a3f] bg-[#dfeedf] text-[#3f5a3f]",
                    },
                    {
                      value: "sebagian-akurat",
                      label: "Sebagian Akurat",
                      icon: PauseCircle,
                      activeClass:
                        "border-[#d37300] bg-[#fbe8c5] text-[#a35a1a]",
                    },
                    {
                      value: "tidak-akurat",
                      label: "Tidak Akurat",
                      icon: XCircle,
                      activeClass:
                        "border-[#d13a31] bg-[#fbd6d4] text-[#a3372e]",
                    },
                  ] as const).map((opt) => {
                    const Icon = opt.icon;
                    const active = aiAccuracy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAiAccuracy(opt.value)}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-[14px] border px-3 py-2.5 text-[13px] font-semibold transition",
                          active
                            ? opt.activeClass
                            : "border-outline-variant bg-white text-on-surface-variant hover:border-primary",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                  Severity Final
                </p>
                <p className="mt-1 text-[13px] text-on-surface-variant">
                  Tentukan tingkat keparahan akhir setelah meninjau.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {(["hijau", "kuning", "merah"] as SeverityLevel[]).map(
                    (level) => {
                      const active = severityFinal === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setSeverityFinal(level)}
                          aria-pressed={active}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition",
                            active
                              ? cn(severityBg[level], severityText[level], "border-transparent")
                              : "border-outline-variant bg-white text-on-surface-variant hover:border-primary",
                          )}
                        >
                          <span
                            className={cn(
                              "h-3 w-3 rounded-full",
                              severityDot[level],
                            )}
                          />
                          {severityLabel[level]}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                  Rekomendasi
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(
                    ["lanjutkan", "tidak-perlu"] as Recommendation[]
                  ).map((opt) => {
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
                  Catatan Internal
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
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-outline-variant bg-white px-5 text-[14px] font-semibold text-on-surface transition hover:border-primary hover:text-primary"
                >
                  {savedDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  {savedDraft ? "Tersimpan" : "Simpan Draft"}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full px-6 text-[14px] font-semibold text-white transition",
                    canSubmit
                      ? "bg-[#3f5a3f] hover:bg-[#324a32]"
                      : "bg-[#3f5a3f]/40 cursor-not-allowed",
                  )}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Kirim Feedback ke Pasien
                </button>
              </div>
              {!canSubmit ? (
                <p className="mt-2 text-right text-[12px] text-on-surface-muted">
                  Lengkapi konfirmasi akurasi & tulis feedback minimal 20 karakter.
                </p>
              ) : null}
            </DashboardCard>
          ) : (
            <DashboardCard className="px-7 py-7">
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
                <p className="mt-2 text-[15px] leading-7 text-on-surface-variant">
                  {feedbackText}
                </p>
              </div>

              {internalNotes ? (
                <div className="mt-4 rounded-[14px] border border-dashed border-outline-variant px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                    Catatan Internal
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-on-surface-variant">
                    {internalNotes}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[#d13a31]/40 bg-white px-5 text-[14px] font-semibold text-[#a3372e] transition hover:border-[#d13a31]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
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
      </div>
    </DashboardLayout>
  );
}
