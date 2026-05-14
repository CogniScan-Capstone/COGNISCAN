"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
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

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex] ?? "";
  const canContinue = currentAnswer.trim().length > 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const topic = useMemo(() => {
    const rawTopic = Array.isArray(params.topic) ? params.topic[0] : params.topic;
    if (!rawTopic) return "Screening";
    return topicLabels[rawTopic] ?? rawTopic.replaceAll("-", " ");
  }, [params.topic]);

  const goPrevious = () => {
    if (currentIndex === 0) {
      router.push("/pasien/dashboard");
      return;
    }

    setCurrentIndex((index) => index - 1);
  };

  const goNext = () => {
    if (!canContinue) return;

    if (isLastQuestion) {
      router.push("/pasien/screening/selesai");
      return;
    }

    setCurrentIndex((index) => index + 1);
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
                onClick={() => setCurrentIndex(index)}
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
            className="inline-flex h-12 items-center gap-3 rounded-full border border-primary px-8 text-sm font-extrabold uppercase tracking-[0.12em] text-primary transition hover:bg-primary-container/10"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Sebelumnya
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canContinue}
            className={cn(
              "inline-flex h-12 items-center gap-3 rounded-full px-10 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition",
              canContinue
                ? "bg-primary-container hover:bg-[#789477]"
                : "cursor-not-allowed bg-primary-container/45",
            )}
          >
            {isLastQuestion ? "Selesai" : "Selanjutnya"}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </main>
  );
}
