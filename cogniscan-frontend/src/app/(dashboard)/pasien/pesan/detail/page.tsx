"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser as defaultPatientUser } from "@/components/patient";
import {
  fetchPatientBookings,
  fetchPreAssessmentReport,
  type BookingReceipt,
  type PreAssessment,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";

const rebookablePaymentStatuses = new Set(["gagal", "kedaluwarsa", "dibatalkan"]);
type FollowUpRecommendation = "lanjutkan" | "tidak-perlu";

const followUpCopy: Record<FollowUpRecommendation, { label: string }> = {
  lanjutkan: {
    label: "Konsultasi Disarankan",
  },
  "tidak-perlu": {
    label: "Konsultasi Belum Perlu",
  },
};

function normalizeFollowUpRecommendation(value?: string | null): FollowUpRecommendation | null {
  if (value === "lanjutkan" || value === "tidak-perlu") return value;
  return null;
}

function isPaidBooking(booking: BookingReceipt) {
  return booking.status_pembayaran === "dibayar" || booking.status_transaksi === "berhasil";
}

function isPendingBooking(booking: BookingReceipt) {
  return (
    booking.status_pembayaran === "belum_bayar" ||
    booking.status_transaksi === "menunggu" ||
    booking.status_transaksi === "proses"
  );
}

function isRebookableBooking(booking: BookingReceipt) {
  return (
    rebookablePaymentStatuses.has(booking.status_pembayaran || "") ||
    rebookablePaymentStatuses.has(booking.status_transaksi || "")
  );
}

function isRescheduleApprovedBooking(booking: BookingReceipt) {
  return (
    booking.status_konsultasi === "reschedule_disetujui" &&
    (booking.status_pembayaran === "dibayar" || booking.status_transaksi === "berhasil")
  );
}

function PatientMessageDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idPraAsesmenStr = searchParams.get("id_pra_asesmen");
  const backendUser = useBackendUser();
  const [report, setReport] = useState<PreAssessment | null>(null);
  const [bookings, setBookings] = useState<BookingReceipt[]>([]);
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
        const [dataReport, dataBookings] = await Promise.all([
          fetchPreAssessmentReport(accessToken, idPraAsesmen),
          fetchPatientBookings(accessToken),
        ]);
        if (isMounted) {
          setReport(dataReport);
          setBookings(dataBookings);
        }
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

  const hasFeedback = Boolean(
    report.status_validasi === "selesai" &&
      report.divalidasi_pada &&
      report.feedback_psikolog?.trim(),
  );
  const relatedBooking =
    bookings.find(
      (booking) =>
        booking.id_pra_asesmen === report.id_pra_asesmen &&
        !isRebookableBooking(booking),
    ) ?? null;
  const rescheduleBooking =
    relatedBooking && isRescheduleApprovedBooking(relatedBooking) ? relatedBooking : null;
  const paidBooking = relatedBooking && isPaidBooking(relatedBooking) ? relatedBooking : null;
  const pendingBooking =
    relatedBooking && !paidBooking && isPendingBooking(relatedBooking)
      ? relatedBooking
      : null;
  const followUpRecommendation = normalizeFollowUpRecommendation(
    report.rekomendasi_tindak_lanjut_psikolog,
  );

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
              {hasFeedback ? (
                <>
                  <p className="whitespace-pre-wrap">{report.feedback_psikolog}</p>

                  {followUpRecommendation ? (
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <span
                        className={[
                          "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[12px] font-extrabold uppercase tracking-[0.08em]",
                          followUpRecommendation === "lanjutkan"
                            ? "border-[#c2d8c6] bg-[#e5efe5] text-primary"
                            : "border-[#c7d5ec] bg-[#e8effb] text-[#47658f]",
                        ].join(" ")}
                      >
                        {followUpRecommendation === "lanjutkan" ? (
                          <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        )}
                        {followUpCopy[followUpRecommendation].label}
                      </span>
                      <span className="text-[13px] font-semibold text-on-surface-muted">
                        Rekomendasi tindak lanjut dari psikolog
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[12px] border border-dashed border-outline-variant bg-surface-container/30 px-6 py-8 text-center">
                  <p className="text-[15px] italic text-on-surface-muted">
                    Psikolog belum menuliskan tanggapan atau catatan feedback resmi untuk hasil screening ini.
                  </p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Hasil screening sudah tersimpan dan akan muncul sebagai feedback setelah proses review selesai.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-10 border-l-4 border-primary bg-[#eef8ef] px-6 py-6">
              <div className="flex gap-4">
                {hasFeedback ? (
                  <Lightbulb className="mt-1 h-6 w-6 shrink-0 fill-primary text-primary" aria-hidden="true" />
                ) : (
                  <Clock3 className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                )}
                <p className="text-[16px] leading-7 text-[#274f2b]">
                  {hasFeedback
                    ? "Lanjutkan sesi konsultasi untuk membahas strategi pengelolaan kondisi yang lebih personal dan terstruktur secara langsung."
                    : "Silakan cek kembali halaman Pesan nanti. Feedback resmi psikolog akan muncul setelah review selesai."}
                </p>
              </div>
            </div>

            {hasFeedback ? (
              <section className="mt-8 rounded-[14px] border border-outline-variant bg-surface-container/40 px-6 py-6">
                {rescheduleBooking ? (
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      <CalendarDays className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <h4 className="text-[18px] font-extrabold text-on-surface">
                          Reschedule untuk feedback ini sudah disetujui
                        </h4>
                        <p className="mt-2 text-[15px] leading-7 text-on-surface-variant">
                          Pilih slot baru dari halaman booking. Pembayaran lama tetap dipakai dan booking baru tidak perlu dibuat.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/pasien/booking/jadwal?reschedule_booking_id=${rescheduleBooking.id_pemesanan_konsultasi}`,
                        )
                      }
                      className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-extrabold text-white transition hover:bg-[#365f39]"
                    >
                      Pilih Jadwal Baru
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : paidBooking ? (
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <h4 className="text-[18px] font-extrabold text-on-surface">
                          Konsultasi untuk feedback ini sudah dibooking
                        </h4>
                        <p className="mt-2 text-[15px] leading-7 text-on-surface-variant">
                          Pembayaran sudah berhasil, jadi feedback ini tidak bisa dipakai untuk membuat booking baru.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/pasien/konsultasi")}
                      className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-extrabold text-white transition hover:bg-[#365f39]"
                    >
                      Lihat Jadwal
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : pendingBooking ? (
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      <CreditCard className="mt-1 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
                      <div>
                        <h4 className="text-[18px] font-extrabold text-on-surface">
                          Booking sudah dibuat, pembayaran belum selesai
                        </h4>
                        <p className="mt-2 text-[15px] leading-7 text-on-surface-variant">
                          Selesaikan pembayaran untuk mengaktifkan jadwal konsultasi dari feedback ini.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          pendingBooking.order_id
                            ? `/pasien/booking/receipt/detail?order_id=${encodeURIComponent(pendingBooking.order_id)}`
                            : "/pasien/booking",
                        )
                      }
                      className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-amber-600 px-6 text-sm font-extrabold text-white transition hover:bg-amber-700"
                    >
                      Lanjutkan Pembayaran
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : relatedBooking ? (
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      <Clock3 className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <h4 className="text-[18px] font-extrabold text-on-surface">
                          Booking untuk feedback ini sudah tercatat
                        </h4>
                        <p className="mt-2 text-[15px] leading-7 text-on-surface-variant">
                          Cek tab Booking untuk melihat status terbaru dari konsultasi ini.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/pasien/booking")}
                      className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-extrabold text-white transition hover:bg-[#365f39]"
                    >
                      Buka Booking
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      <CalendarDays
                        className={[
                          "mt-1 h-6 w-6 shrink-0",
                          followUpRecommendation === "tidak-perlu" ? "text-[#47658f]" : "text-primary",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                      <div>
                        <h4 className="text-[18px] font-extrabold text-on-surface">
                          {followUpRecommendation === "lanjutkan"
                            ? "Konsultasi lanjutan disarankan"
                            : followUpRecommendation === "tidak-perlu"
                              ? "Konsultasi lanjutan tetap tersedia"
                            : "Ingin lanjut konsultasi?"}
                        </h4>
                        <p className="mt-2 text-[15px] leading-7 text-on-surface-variant">
                          {followUpRecommendation === "lanjutkan"
                            ? "Pilih jadwal konsultasi dengan psikolog yang meninjau feedback ini."
                            : followUpRecommendation === "tidak-perlu"
                              ? "Psikolog menilai konsultasi belum terlalu diperlukan, tetapi kamu tetap bisa menjadwalkan sesi jika ingin membahas feedback ini lebih detail."
                            : "Pilih jadwal konsultasi jika kamu ingin membahas feedback ini lebih lanjut."}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => router.push("/pasien/pesan")}
                        className="inline-flex h-12 items-center justify-center rounded-full border border-outline-variant px-6 text-sm font-extrabold text-on-surface-variant transition hover:bg-white"
                      >
                        Belum Sekarang
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/pasien/booking/jadwal?id_pra_asesmen=${report.id_pra_asesmen}`,
                          )
                        }
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-extrabold text-white transition hover:bg-[#365f39]"
                      >
                        {followUpRecommendation === "tidak-perlu"
                          ? "Tetap Lanjut Konsultasi"
                          : "Lanjut Konsultasi"}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            <footer className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/pasien/pesan")}
                className="h-12 rounded-full px-6 text-[15px] font-medium text-on-surface-variant transition hover:bg-surface-container"
              >
                Kembali
              </button>
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
