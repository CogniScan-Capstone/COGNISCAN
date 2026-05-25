"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Mic, PenLine, Square, Trash2 } from "lucide-react";
import {
  finalizeJournalSession,
  startJournalSession,
  submitJournalAnswer,
  submitJournalVoiceAnswer,
} from "@/lib/auth";
import {
  getScreeningQuestions,
  getScreeningTopicLabel,
} from "@/config/screening-questions";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const recordingMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
];

type InputMode = "text" | "voice";
const visualizerBarCount = 16;

function createIdleAudioLevels() {
  return Array.from({ length: visualizerBarCount }, (_, index) => 10 + (index % 4) * 4);
}

function getAudioContextConstructor() {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function getSupportedRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return recordingMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function formatRecordingSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function ScreeningQuestionPage() {
  const router = useRouter();
  const params = useParams<{ topic?: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [voiceAnswers, setVoiceAnswers] = useState<Record<number, Blob>>({});
  const [hasConsent, setHasConsent] = useState(false);
  const [journalSessionId, setJournalSessionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState("");
  const [audioLevels, setAudioLevels] = useState<number[]>(createIdleAudioLevels);
  const isVoiceUploading = false;
  const [voiceStatusMessage, setVoiceStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const visualizerFrameRef = useRef<number | null>(null);

  const topicSlug = useMemo(() => {
    const rawTopic = Array.isArray(params.topic) ? params.topic[0] : params.topic;
    return rawTopic ?? "screening";
  }, [params.topic]);

  const questions = useMemo(() => getScreeningQuestions(topicSlug), [topicSlug]);
  const topic = useMemo(() => getScreeningTopicLabel(topicSlug), [topicSlug]);
  const currentQuestion = questions[currentIndex] ?? questions[0];
  const currentAnswer = answers[currentIndex] ?? "";
  const currentAnsweredByVoice = Boolean(voiceAnswers[currentIndex]);
  const currentVoiceReady = Boolean(voiceBlob || currentAnsweredByVoice);
  const currentInputValid =
    inputMode === "text"
      ? currentAnswer.trim().length > 0
      : currentVoiceReady;
  const canContinue =
    currentInputValid &&
    hasConsent &&
    !isRecording &&
    !isVoiceUploading;
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const submitStatusText = isLastQuestion
    ? "Menganalisis jawaban..."
    : "Menyiapkan jawaban...";
  const submitButtonText = isSubmitting
    ? isLastQuestion
      ? "Menganalisis"
      : "Menyimpan"
    : isLastQuestion
      ? "Selesai Screening"
      : "Simpan & Lanjut";

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      stopAudioVisualizer(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    };
  }, [voicePreviewUrl]);

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

  function clearRecordingTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function stopActiveStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopAudioVisualizer(resetLevels = true) {
    if (visualizerFrameRef.current) {
      window.cancelAnimationFrame(visualizerFrameRef.current);
      visualizerFrameRef.current = null;
    }

    audioSourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    audioSourceRef.current = null;
    analyserRef.current = null;
    audioDataRef.current = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }

    if (resetLevels) setAudioLevels(createIdleAudioLevels());
  }

  function startAudioVisualizer(stream: MediaStream) {
    stopAudioVisualizer();

    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) return;

    try {
      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.76;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      audioSourceRef.current = source;
      analyserRef.current = analyser;
      audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);

      if (audioContext.state === "suspended") {
        void audioContext.resume().catch(() => undefined);
      }

      const updateLevels = () => {
        const currentAnalyser = analyserRef.current;
        const dataArray = audioDataRef.current;
        if (!currentAnalyser || !dataArray) return;

        currentAnalyser.getByteFrequencyData(dataArray);
        const bucketSize = Math.max(1, Math.floor(dataArray.length / visualizerBarCount));
        const nextLevels = Array.from({ length: visualizerBarCount }, (_, barIndex) => {
          const start = barIndex * bucketSize;
          const end = Math.min(start + bucketSize, dataArray.length);
          let total = 0;

          for (let index = start; index < end; index += 1) {
            total += dataArray[index];
          }

          const average = total / Math.max(1, end - start);
          return Math.max(8, Math.min(42, 8 + (average / 255) * 34));
        });

        setAudioLevels(nextLevels);
        visualizerFrameRef.current = window.requestAnimationFrame(updateLevels);
      };

      updateLevels();
    } catch {
      stopAudioVisualizer();
    }
  }

  function clearVoiceNote(nextStatusMessage = "") {
    setVoicePreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return "";
    });
    setVoiceBlob(null);
    setRecordingSeconds(0);
    setAudioLevels(createIdleAudioLevels());
    setVoiceStatusMessage(nextStatusMessage);
  }

  function removeCurrentVoiceAnswer() {
    setVoiceAnswers((prev) => {
      const nextVoiceAnswers = { ...prev };
      delete nextVoiceAnswers[currentIndex];
      return nextVoiceAnswers;
    });
    clearVoiceNote();
  }

  function selectInputMode(mode: InputMode) {
    if (isSubmitting || isVoiceUploading || isRecording) return;
    setErrorMessage("");
    setInputMode(mode);

    if (mode === "text") {
      removeCurrentVoiceAnswer();
      return;
    }

    setAnswers((prev) => {
      const nextAnswers = { ...prev };
      delete nextAnswers[currentIndex];
      return nextAnswers;
    });
  }

  function isQuestionAnswered(
    questionIndex: number,
    nextVoiceAnswers: Record<number, Blob> = voiceAnswers,
  ) {
    return Boolean((answers[questionIndex] ?? "").trim()) || Boolean(nextVoiceAnswers[questionIndex]);
  }

  async function startRecording() {
    if (isSubmitting || isVoiceUploading || isRecording) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Browser ini belum mendukung perekaman voice note.");
      return;
    }

    setInputMode("voice");
    setErrorMessage("");
    clearVoiceNote();
    audioChunksRef.current = [];
    setAnswers((prev) => {
      const nextAnswers = { ...prev };
      delete nextAnswers[currentIndex];
      return nextAnswers;
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      recorderRef.current = recorder;
      startAudioVisualizer(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        clearRecordingTimer();
        setIsRecording(false);
        stopAudioVisualizer();
        stopActiveStream();

        const recordedMimeType = recorder.mimeType || mimeType || "audio/webm";
        const recordedBlob = new Blob(audioChunksRef.current, {
          type: recordedMimeType,
        });
        audioChunksRef.current = [];

        if (recordedBlob.size === 0) {
          setErrorMessage("Voice note kosong. Coba rekam ulang.");
          return;
        }

        setVoiceBlob(recordedBlob);
        setVoicePreviewUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          return URL.createObjectURL(recordedBlob);
        });
        setVoiceStatusMessage("Voice note siap disimpan sementara.");
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => seconds + 1);
      }, 1000);
    } catch (error) {
      clearRecordingTimer();
      setIsRecording(false);
      stopAudioVisualizer();
      stopActiveStream();
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tidak bisa mengakses mikrofon. Periksa izin browser.",
      );
    }
  }

  function stopRecording() {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
  }

  async function saveAnswerByIndex(
    accessToken: string,
    idSesiJurnal: number,
    questionIndex: number,
    nextVoiceAnswers: Record<number, Blob> = voiceAnswers,
  ) {
    const voiceAnswer = nextVoiceAnswers[questionIndex];
    if (voiceAnswer) {
      await submitJournalVoiceAnswer(accessToken, idSesiJurnal, {
        urutan_pertanyaan: questionIndex + 1,
        teks_pertanyaan: questions[questionIndex].question,
        audio: voiceAnswer,
      });
      return;
    }

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

  function buildMissingAnswerMessage(
    nextVoiceAnswers: Record<number, Blob> = voiceAnswers,
  ) {
    const missing = questions
      .map((_, index) => index + 1)
      .filter((order) => !isQuestionAnswered(order - 1, nextVoiceAnswers));

    if (missing.length === 0) return "";
    return `Pertanyaan ${missing.join(", ")} belum dijawab.`;
  }

  async function finalizeScreening(nextVoiceAnswers: Record<number, Blob> = voiceAnswers) {
    const missingAnswerMessage = buildMissingAnswerMessage(nextVoiceAnswers);
    if (missingAnswerMessage) {
      setErrorMessage(missingAnswerMessage);
      return;
    }

    const accessToken = await getAccessToken();
    const idSesiJurnal = await ensureJournalSession(accessToken);

    for (let questionIndex = 0; questionIndex < questions.length; questionIndex += 1) {
      await saveAnswerByIndex(accessToken, idSesiJurnal, questionIndex, nextVoiceAnswers);
    }

    const result = await finalizeJournalSession(accessToken, idSesiJurnal);
    const params = new URLSearchParams({
      id_sesi_jurnal: String(result.session.id_sesi_jurnal),
      id_pra_asesmen: String(result.pra_asesmen.id_pra_asesmen),
      is_crisis: result.is_crisis ? "1" : "0",
    });
    router.push(`/pasien/screening/selesai?${params.toString()}`);
  }

  const goPrevious = () => {
    if (isSubmitting || isVoiceUploading || isRecording) return;

    if (currentIndex === 0) {
      router.push("/pasien/dashboard");
      return;
    }

    const targetIndex = currentIndex - 1;
    clearVoiceNote();
    setInputMode(voiceAnswers[targetIndex] ? "voice" : "text");
    setCurrentIndex(targetIndex);
  };

  const goNext = async () => {
    if (!canContinue || isSubmitting || isVoiceUploading || isRecording) return;

    setErrorMessage("");

    try {
      const nextVoiceAnswers = { ...voiceAnswers };

      if (inputMode === "voice") {
        if (voiceBlob) {
          nextVoiceAnswers[currentIndex] = voiceBlob;
          setVoiceAnswers(nextVoiceAnswers);
          setAnswers((prev) => {
            const nextAnswers = { ...prev };
            delete nextAnswers[currentIndex];
            return nextAnswers;
          });
        }
      } else if (nextVoiceAnswers[currentIndex]) {
        delete nextVoiceAnswers[currentIndex];
        setVoiceAnswers(nextVoiceAnswers);
      }

      if (!isLastQuestion) {
        const targetIndex = currentIndex + 1;
        clearVoiceNote();
        setInputMode(nextVoiceAnswers[targetIndex] ? "voice" : "text");
        setCurrentIndex(targetIndex);
        return;
      }

      setIsSubmitting(true);
      await finalizeScreening(nextVoiceAnswers);
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

        <section
          className="relative overflow-hidden rounded-[24px] bg-white px-8 py-8 shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)] sm:px-12"
          aria-busy={isSubmitting || isVoiceUploading}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-1 -top-3 text-[150px] font-extrabold leading-none text-[#a98ad6]/8"
          >
            {String(currentIndex + 1).padStart(2, "0")}
          </span>
          <div className="relative">
            <h1 className="max-w-[660px] text-[30px] font-semibold leading-[1.18] text-on-surface">
              {currentQuestion.question}
            </h1>

            <div className="mt-8 grid grid-cols-2 rounded-[12px] border border-outline-variant bg-surface-container p-1">
              <button
                type="button"
                onClick={() => selectInputMode("text")}
                disabled={isSubmitting || isVoiceUploading || isRecording}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-[8px] text-sm font-extrabold transition disabled:cursor-wait disabled:opacity-60",
                  inputMode === "text"
                    ? "bg-white text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                <PenLine className="h-4 w-4" aria-hidden="true" />
                Tulis Jawaban
              </button>
              <button
                type="button"
                onClick={() => selectInputMode("voice")}
                disabled={isSubmitting || isVoiceUploading || isRecording}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-[8px] text-sm font-extrabold transition disabled:cursor-wait disabled:opacity-60",
                  inputMode === "voice"
                    ? "bg-white text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                Rekam Suara
              </button>
            </div>

            <div className="mt-5">
              {inputMode === "text" ? (
                <textarea
                  value={currentAnswer}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setAnswers((prev) => ({
                      ...prev,
                      [currentIndex]: nextValue,
                    }));
                    if (voiceAnswers[currentIndex]) {
                      setVoiceAnswers((prev) => {
                        const nextVoiceAnswers = { ...prev };
                        delete nextVoiceAnswers[currentIndex];
                        return nextVoiceAnswers;
                      });
                    }
                  }}
                  disabled={isSubmitting || isVoiceUploading}
                  rows={8}
                  placeholder={currentQuestion.placeholder}
                  className="w-full resize-none rounded-[12px] border border-surface-variant bg-surface px-6 py-5 text-[16px] leading-7 text-on-surface outline-none transition placeholder:text-on-surface-muted/55 focus:border-primary-container focus:ring-4 focus:ring-primary-container/15 disabled:cursor-not-allowed disabled:opacity-70"
                />
              ) : (
                <div className="rounded-[14px] border border-outline-variant bg-surface-container/45 px-5 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-on-surface-variant">
                        Voice note
                      </p>
                      <p className="mt-1 text-sm font-semibold text-on-surface-muted" aria-live="polite">
                        {isRecording
                          ? `Merekam ${formatRecordingSeconds(recordingSeconds)}`
                          : voiceStatusMessage ||
                            (currentAnsweredByVoice
                              ? "Voice note pertanyaan ini sudah tersimpan sementara."
                              : "Audio direkam di RAM browser dan dikirim saat screening selesai.")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isRecording ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white shadow-[0_0_0_6px_rgba(220,38,38,0.12)] transition hover:bg-red-700"
                        >
                          <Square className="h-4 w-4" aria-hidden="true" />
                          Stop
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={isSubmitting || isVoiceUploading}
                          className="inline-flex h-11 items-center gap-2 rounded-full border border-primary px-5 text-sm font-bold text-primary transition hover:bg-primary-container/10 disabled:cursor-wait disabled:opacity-60"
                        >
                          <Mic className="h-4 w-4" aria-hidden="true" />
                          {currentAnsweredByVoice || voiceBlob ? "Rekam Ulang" : "Rekam"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={removeCurrentVoiceAnswer}
                        disabled={!voiceBlob && !voicePreviewUrl && !currentAnsweredByVoice}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-outline-variant px-3 text-on-surface-variant transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label="Hapus voice note"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[12px] bg-white px-4 py-4">
                    {isRecording ? (
                      <div className="flex items-center gap-4">
                        <span className="relative flex h-4 w-4">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                          <span className="relative inline-flex h-4 w-4 rounded-full bg-red-600" />
                        </span>
                        <div className="flex h-10 flex-1 items-end gap-1.5" aria-hidden="true">
                          {audioLevels.map((height, index) => (
                            <span
                              key={index}
                              className="w-full max-w-3 rounded-full bg-red-500/80 transition-[height] duration-75 ease-linear"
                              style={{
                                height: `${height}px`,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-extrabold tabular-nums text-red-700">
                          {formatRecordingSeconds(recordingSeconds)}
                        </span>
                      </div>
                    ) : voicePreviewUrl ? (
                      <audio controls src={voicePreviewUrl} className="w-full" />
                    ) : currentAnsweredByVoice ? (
                      <p className="text-sm font-semibold text-primary">
                        Voice note untuk pertanyaan ini sudah siap dikirim.
                      </p>
                    ) : (
                      <p className="text-sm leading-6 text-on-surface-variant">
                        Tekan Rekam, jawab dengan suara, lalu gunakan tombol global di bawah untuk menyimpan dan lanjut.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-[12px] border border-outline-variant bg-surface-container/60 px-4 py-4 text-[14px] leading-6 text-on-surface-variant">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(event) => setHasConsent(event.target.checked)}
                disabled={isSubmitting || isVoiceUploading}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-outline-variant text-primary-container focus:ring-primary-container/20"
              />
              <span>
                Saya setuju jawaban screening diproses oleh sistem AI CogniScan
                untuk membuat pra-asesmen awal.
              </span>
            </label>
            {isSubmitting ? (
              <div
                className="mt-5 inline-flex items-center gap-3 rounded-full border border-primary-container/40 bg-primary-container/10 px-4 py-2 text-sm font-semibold text-primary"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {submitStatusText}
              </div>
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
            const answered = isQuestionAnswered(index);
            const active = index === currentIndex;

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (!isSubmitting && !isVoiceUploading && !isRecording) {
                    clearVoiceNote();
                    setInputMode(voiceAnswers[index] ? "voice" : "text");
                    setCurrentIndex(index);
                  }
                }}
                disabled={isSubmitting || isVoiceUploading || isRecording}
                className={cn(
                  "flex h-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60",
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
            disabled={isSubmitting || isVoiceUploading || isRecording}
            className="inline-flex h-12 items-center gap-3 rounded-full border border-primary px-8 text-sm font-extrabold uppercase tracking-[0.12em] text-primary transition hover:bg-primary-container/10 disabled:cursor-wait disabled:opacity-60"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Sebelumnya
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canContinue || isSubmitting || isVoiceUploading || isRecording}
            className={cn(
              "inline-flex h-12 items-center gap-3 rounded-full px-10 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition",
              canContinue && !isSubmitting && !isVoiceUploading && !isRecording
                ? "bg-primary-container hover:bg-[#789477]"
                : "cursor-not-allowed bg-primary-container/45",
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : null}
            {submitButtonText}
            {!isSubmitting ? (
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            ) : null}
          </button>
        </div>
      </footer>
    </main>
  );
}
