"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  finalizeJournalSession,
  startJournalSession,
  submitJournalAnswer,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const questions = [
  {
    question: "Apa situasi yang paling sering membuat pikiranmu terasa berat akhir-akhir ini?",
    placeholder: "Ceritakan situasi yang paling terasa mengganggu...",
  },
  {
    question: "Pikiran apa yang biasanya langsung muncul ketika situasi itu terjadi?",
    placeholder: "Tuliskan kalimat yang muncul di kepalamu...",
  },
  {
    question: "Apa perasaan yang paling kuat kamu rasakan saat pikiran itu muncul?",
    placeholder: "Misalnya sedih, takut, marah, malu, atau campur aduk...",
  },
  {
    question: "Bagaimana biasanya kamu merespons situasi itu?",
    placeholder: "Ceritakan tindakan, reaksi, atau kebiasaanmu saat itu...",
  },
  {
    question: "Apakah kamu merasa ada pola yang berulang dari pengalaman ini?",
    placeholder: "Jika ada, jelaskan pola yang sering muncul...",
  },
  {
    question: "Apa bukti yang mendukung pikiranmu saat itu?",
    placeholder: "Tuliskan hal-hal yang membuat pikiran itu terasa benar...",
  },
  {
    question: "Apa bukti lain yang mungkin menunjukkan sudut pandang berbeda?",
    placeholder: "Coba tuliskan kemungkinan lain tanpa memaksa diri untuk positif...",
  },
  {
    question: "Jika teman dekatmu mengalami hal yang sama, apa yang akan kamu katakan padanya?",
    placeholder: "Tulis dengan bahasa yang lembut dan jujur...",
  },
  {
    question: "Apa langkah kecil yang terasa mungkin kamu lakukan setelah ini?",
    placeholder: "Tidak perlu besar. Cukup satu langkah yang realistis...",
  },
  {
    question: "Apa yang kamu harapkan dari psikolog saat meninjau jawabanmu?",
    placeholder: "Misalnya arahan, validasi, strategi, atau bantuan memahami pola pikir...",
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

export default function ScreeningQuestionPage() {
  const router = useRouter();
  const params = useParams<{ topic?: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [hasConsent, setHasConsent] = useState(false);
  const [journalSessionId, setJournalSessionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex] ?? "";
  const canContinue =
    currentAnswer.trim().length > 0 && (journalSessionId !== null || hasConsent);
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const topicSlug = useMemo(() => {
    const rawTopic = Array.isArray(params.topic) ? params.topic[0] : params.topic;
    return rawTopic ?? "screening";
  }, [params.topic]);

  const topic = useMemo(() => {
    return topicLabels[topicSlug] ?? topicSlug.replaceAll("-", " ");
  }, [topicSlug]);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("Session tidak ditemukan. Silakan login ulang.");
    }

    return accessToken;
  }

  async function ensureJournalSession(accessToken: string) {
    if (journalSessionId !== null) return journalSessionId;

    const session = await startJournalSession(accessToken, {
      konteks_pemicu: topicSlug,
      total_pertanyaan: questions.length,
      consent_ai_processing: hasConsent,
    });
    setJournalSessionId(session.id_sesi_jurnal);
    return session.id_sesi_jurnal;
  }

  async function saveAnswerByIndex(
    accessToken: string,
    idSesiJurnal: number,
    questionIndex: number,
  ) {
    const answer = answers[questionIndex]?.trim();
    if (!answer) {
      throw new Error(`Pertanyaan ${questionIndex + 1} belum dijawab.`);
    }

    await submitJournalAnswer(accessToken, idSesiJurnal, {
      urutan_pertanyaan: questionIndex + 1,
      teks_pertanyaan: questions[questionIndex].question,
      teks_jawaban: answer,
    });
  }

  function buildMissingAnswerMessage() {
    const missing = questions
      .map((_, index) => index + 1)
      .filter((order) => !(answers[order - 1] ?? "").trim());

    if (missing.length === 0) return "";
    return `Pertanyaan ${missing.join(", ")} belum dijawab.`;
  }

  const goPrevious = () => {
    if (isSubmitting) return;

    if (currentIndex === 0) {
      router.push("/pasien/dashboard");
      return;
    }

    setCurrentIndex((index) => index - 1);
  };

  const goNext = async () => {
    if (!canContinue || isSubmitting) return;

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const accessToken = await getAccessToken();
      const idSesiJurnal = await ensureJournalSession(accessToken);

      if (!isLastQuestion) {
        await saveAnswerByIndex(accessToken, idSesiJurnal, currentIndex);
        setCurrentIndex((index) => index + 1);
        return;
      }

      const missingAnswerMessage = buildMissingAnswerMessage();
      if (missingAnswerMessage) {
        setErrorMessage(missingAnswerMessage);
        return;
      }

      for (let questionIndex = 0; questionIndex < questions.length; questionIndex += 1) {
        await saveAnswerByIndex(accessToken, idSesiJurnal, questionIndex);
      }

      const result = await finalizeJournalSession(accessToken, idSesiJurnal);
      const params = new URLSearchParams({
        id_sesi_jurnal: String(result.session.id_sesi_jurnal),
        id_pra_asesmen: String(result.pra_asesmen.id_pra_asesmen),
        is_crisis: result.is_crisis ? "1" : "0",
      });
      router.push(`/pasien/screening/selesai?${params.toString()}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan screening.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface px-5 pb-36 pt-14 text-on-surface">
      <div className="absolute bottom-[-180px] right-[-140px] h-[520px] w-[520px] rounded-full bg-[#a98ad6]/25 blur-[2px]" />

      <div className="relative z-10 mx-auto max-w-[760px]">
        <header className="mb-12">
          <div className="mb-3 flex items-center justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-on-surface-variant">
                Progress Skrining
              </p>
              <p className="mt-1 text-sm font-semibold text-[#a98ad6]">{topic}</p>
            </div>
            <p className="text-[16px] font-medium text-on-surface-variant">
              Pertanyaan {currentIndex + 1} dari {questions.length}
            </p>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary-container transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[24px] bg-white px-8 py-8 shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)] sm:px-12">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-1 -top-3 text-[150px] font-extrabold leading-none text-[#a98ad6]/8"
          >
            {String(currentIndex + 1).padStart(2, "0")}
          </span>
          <div className="relative">
            <h1 className="max-w-[640px] text-[30px] font-medium leading-[1.18] tracking-[-0.02em] text-[#a98ad6]">
              {currentQuestion.question}
            </h1>
            <textarea
              value={currentAnswer}
              onChange={(event) =>
                setAnswers((prev) => ({
                  ...prev,
                  [currentIndex]: event.target.value,
                }))
              }
              rows={7}
              placeholder={currentQuestion.placeholder}
              className="mt-8 w-full resize-none rounded-[12px] border border-surface-variant bg-surface px-6 py-5 text-[16px] text-on-surface outline-none transition placeholder:text-on-surface-muted/45 focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
            />
            {journalSessionId === null ? (
              <label className="mt-5 flex items-start gap-3 rounded-[12px] border border-outline-variant bg-surface-container/60 px-4 py-4 text-[14px] leading-6 text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={hasConsent}
                  onChange={(event) => setHasConsent(event.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-outline-variant text-primary-container focus:ring-primary-container/20"
                />
                <span>
                  Saya setuju jawaban screening diproses oleh sistem AI CogniScan
                  untuk membuat pra-asesmen awal.
                </span>
              </label>
            ) : null}
            {errorMessage ? (
              <p className="mt-5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </section>

        <div className="mt-8 grid grid-cols-5 gap-2 sm:grid-cols-10" aria-label="Daftar status pertanyaan">
          {questions.map((_, index) => {
            const answered = (answers[index] ?? "").trim().length > 0;
            const active = index === currentIndex;

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (!isSubmitting) setCurrentIndex(index);
                }}
                className={cn(
                  "flex h-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  active && "border-[#a98ad6] bg-secondary-container text-[#6f5794]",
                  !active && answered && "border-primary-container bg-primary-container text-white",
                  !active && !answered && "border-outline-variant bg-white text-on-surface-muted",
                )}
                aria-label={`Pertanyaan ${index + 1}${answered ? " sudah dijawab" : " belum dijawab"}`}
              >
                {answered && !active ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </button>
            );
          })}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-surface-variant bg-surface/95 px-5 py-6 backdrop-blur">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-5">
          <button
            type="button"
            onClick={goPrevious}
            disabled={isSubmitting}
            className="inline-flex h-12 items-center gap-3 rounded-full border border-primary px-8 text-sm font-extrabold uppercase tracking-[0.12em] text-primary transition hover:bg-primary-container/10"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Sebelumnya
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canContinue || isSubmitting}
            className={cn(
              "inline-flex h-12 items-center gap-3 rounded-full px-10 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition",
              canContinue && !isSubmitting
                ? "bg-primary-container hover:bg-[#789477]"
                : "cursor-not-allowed bg-primary-container/45",
            )}
          >
            {isSubmitting
              ? isLastQuestion
                ? "Menganalisis"
                : "Menyimpan"
              : isLastQuestion
                ? "Selesai"
                : "Selanjutnya"}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </main>
  );
}
