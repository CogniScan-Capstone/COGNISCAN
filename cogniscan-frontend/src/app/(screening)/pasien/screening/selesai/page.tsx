"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchAvailablePsychologists,
  fetchPreAssessmentReport,
  type AvailablePsychologist,
  type PreAssessment,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

const crisisContacts = [
  {
    name: "Halo Kemenkes",
    detail: "119 ext 8",
  },
  {
    name: "Yayasan Pulih",
    detail: "Dukungan psikososial dan rujukan profesional",
  },
  {
    name: "Into The Light Indonesia",
    detail: "Sumber daya pencegahan bunuh diri",
  },
];

function formatPrice(value: AvailablePsychologist["tarif_konsultasi"]) {
  if (value === null || value === undefined || value === "") return "Tarif belum diatur";

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "Tarif belum diatur";

  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(numericValue);
}

function statusLabel(status: string | null | undefined) {
  if (status === "perlu_eskalasi") return "Perlu Eskalasi";
  if (status === "sedang_direview") return "Sedang Direview";
  if (status === "selesai") return "Selesai Direview";
  return "Menunggu Review";
}

function urgencyLabel(value: string | null | undefined) {
  if (value === "critical") return "Critical";
  if (value === "tinggi") return "Tinggi";
  if (value === "sedang") return "Sedang";
  if (value === "rendah") return "Rendah";
  return "Belum tersedia";
}

export default function ScreeningCompletePage() {
  const [report, setReport] = useState<PreAssessment | null>(null);
  const [psychologists, setPsychologists] = useState<AvailablePsychologist[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadScreeningResult() {
      setIsLoading(true);
      setErrorMessage("");

      const searchParams = new URLSearchParams(window.location.search);
      const idPraAsesmen = Number(searchParams.get("id_pra_asesmen"));

      if (!idPraAsesmen) {
        if (isMounted) {
          setErrorMessage("ID hasil screening tidak ditemukan.");
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (isMounted) {
          setErrorMessage(error.message);
          setIsLoading(false);
        }
        return;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        if (isMounted) {
          setErrorMessage("Session tidak ditemukan. Silakan login ulang.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const [reportResult, psychologistResult] = await Promise.all([
          fetchPreAssessmentReport(accessToken, idPraAsesmen),
          fetchAvailablePsychologists(accessToken),
        ]);

        if (!isMounted) return;

        setReport(reportResult);
        setPsychologists(psychologistResult);
        setSelectedId(psychologistResult[0]?.id_psikolog ?? null);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal mengambil hasil screening.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadScreeningResult();

    return () => {
      isMounted = false;
    };
  }, []);

  const isCrisis = useMemo(() => {
    return (
      report?.status_validasi === "perlu_eskalasi" ||
      report?.indikator_urgensi === "critical"
    );
  }, [report]);

  const selectedPsychologist = psychologists.find(
    (psychologist) => psychologist.id_psikolog === selectedId,
  );
  const submitHref = selectedPsychologist
    ? `/pasien/konsultasi?id_pra_asesmen=${report?.id_pra_asesmen ?? ""}&id_psikolog=${
        selectedPsychologist.id_psikolog
      }`
    : "/pasien/konsultasi";

  return (
    <main className="min-h-screen bg-surface px-5 py-12 text-on-surface">
      <section className="mx-auto max-w-145 rounded-[24px] bg-white px-8 py-12 shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)] sm:px-10">
        <div className="text-center">
          <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-secondary-container text-[#a98ad6]">
            <Image
              src="/ilustrasi.png"
              alt="Screening completion"
              width={112}
              height={112}
            />
          </div>
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em] text-[#a98ad6]">
            Terima Kasih!
          </h1>
          <p className="mt-3 text-[16px] font-semibold text-on-surface">
            Kamu sudah menyelesaikan semua pertanyaan screening.
          </p>
          <p className="mx-auto mt-2 max-w-115 text-[15px] leading-6 text-on-surface-muted">
            Hasil screening awalmu sudah tersimpan dan akan ditinjau oleh psikolog.
          </p>
        </div>

        <div className="my-9 border-t border-outline-variant" />

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-[16px] border border-outline-variant px-5 py-8 text-on-surface-variant">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Memuat hasil screening...
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="rounded-[16px] border border-red-200 bg-red-50 px-5 py-5 text-sm leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!isLoading && report ? (
          <div className="space-y-6">
            <section
              className={`rounded-[16px] border px-5 py-5 ${
                isCrisis
                  ? "border-red-200 bg-red-50"
                  : "border-[#c4ddc5] bg-[#eef7ef]"
              }`}
            >
              <div className="flex items-start gap-3">
                {isCrisis ? (
                  <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                )}
                <div>
                  <p className="text-[15px] font-extrabold text-on-surface">
                    Status: {statusLabel(report.status_validasi)}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    Urgensi: {urgencyLabel(report.indikator_urgensi)}
                    {typeof report.skor_keparahan === "number"
                      ? ` · Skor ${report.skor_keparahan}`
                      : ""}
                  </p>
                </div>
              </div>

              {report.ringkasan_kondisi ? (
                <p className="mt-4 text-[15px] leading-7 text-on-surface-variant">
                  {report.ringkasan_kondisi}
                </p>
              ) : null}

              {report.rekomendasi ? (
                <p className="mt-3 text-[15px] leading-7 text-on-surface-variant">
                  {report.rekomendasi}
                </p>
              ) : null}
            </section>

            {isCrisis ? (
              <section className="rounded-[16px] border border-red-200 bg-white px-5 py-5">
                <h2 className="text-[18px] font-extrabold text-red-700">
                  Bantuan Segera
                </h2>
                <p className="mt-2 text-[15px] leading-6 text-on-surface-variant">
                  Jika kamu merasa dalam bahaya atau punya dorongan menyakiti diri,
                  hubungi bantuan darurat atau orang tepercaya sekarang.
                </p>
                <div className="mt-4 space-y-3">
                  {crisisContacts.map((contact) => (
                    <div
                      key={contact.name}
                      className="rounded-[12px] bg-red-50 px-4 py-3"
                    >
                      <p className="font-semibold text-red-700">{contact.name}</p>
                      <p className="text-sm text-red-700/80">{contact.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {report.distorsi_terdeteksi?.length ? (
              <section>
                <h2 className="mb-3 text-[18px] font-extrabold text-[#a98ad6]">
                  Pola yang Terdeteksi
                </h2>
                <div className="flex flex-wrap gap-2">
                  {report.distorsi_terdeteksi.map((distortion) => (
                    <span
                      key={distortion.id_distorsi_terdeteksi}
                      className="rounded-full bg-secondary-container px-4 py-2 text-sm font-semibold text-[#6f5794]"
                    >
                      {distortion.tipe_distorsi ?? "Distorsi kognitif"}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="mb-6 text-[18px] font-extrabold text-[#a98ad6]">
                Pilih Psikolog Kamu
              </h2>

              {psychologists.length === 0 ? (
                <div className="rounded-[16px] border border-outline-variant px-5 py-5 text-[15px] leading-6 text-on-surface-variant">
                  Belum ada psikolog terverifikasi yang tersedia. Hasil screening tetap
                  tersimpan dan bisa ditinjau setelah psikolog tersedia.
                </div>
              ) : (
                <div className="space-y-4">
                  {psychologists.map((psychologist) => {
                    const isSelected = selectedId === psychologist.id_psikolog;
                    return (
                      <article
                        key={psychologist.id_psikolog}
                        className={`rounded-[18px] border px-6 py-6 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-outline-variant"
                        }`}
                      >
                        <h3 className="text-[18px] font-medium text-on-surface">
                          {psychologist.nama_lengkap}
                        </h3>
                        <p className="mt-1 text-[14px] text-on-surface-muted">
                          {psychologist.spesialisasi ?? "Psikolog"}
                          {psychologist.kota ? ` · ${psychologist.kota}` : ""}
                        </p>
                        <p className="mt-1 text-[15px] font-medium text-on-surface-muted">
                          {formatPrice(psychologist.tarif_konsultasi)}
                        </p>
                        {psychologist.bio_singkat ? (
                          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                            {psychologist.bio_singkat}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedId(isSelected ? null : psychologist.id_psikolog)
                          }
                          className={`mt-5 h-10 rounded-full px-7 text-[14px] font-semibold transition ${
                            isSelected
                              ? "bg-primary text-white hover:bg-primary/90"
                              : "border border-primary text-primary hover:bg-primary-container/10"
                          }`}
                        >
                          {isSelected ? "Dipilih" : "Pilih"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : null}

        <div className="mt-8 rounded-[10px] border-l-4 border-[#a98ad6] bg-secondary-container/45 px-5 py-4 text-[15px] leading-6 text-on-surface-variant">
          Jawabanmu bersifat rahasia dan hanya dapat diakses oleh psikolog yang
          berwenang meninjau hasil screening.
        </div>

        <Link
          href={submitHref}
          className={`mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full px-8 text-[18px] font-medium text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition ${
            selectedPsychologist
              ? "bg-primary-container hover:-translate-y-0.5 hover:bg-[#4d734d]"
              : "pointer-events-none bg-primary-container/45"
          }`}
        >
          Lanjutkan
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
