"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Loader2,
  ReceiptText,
} from "lucide-react";

import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import {
  getPatientNav,
  patientProfileHref,
  patientUser as defaultPatientUser,
} from "@/components/patient";
import {
  fetchPatientBookings,
  fetchPatientPreAssessments,
  type BookingReceipt,
  type PreAssessment,
} from "@/lib/auth";
import { formatCurrency } from "@/lib/booking";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";

function hasFinalFeedback(report: PreAssessment) {
  return Boolean(
    report.id_psikolog &&
      report.status_validasi === "selesai" &&
      report.divalidasi_pada &&
      report.feedback_psikolog?.trim(),
  );
}

function isPaidBooking(booking: BookingReceipt) {
  return booking.status_pembayaran === "dibayar" || booking.status_transaksi === "berhasil";
}

function isPendingBooking(booking: BookingReceipt) {
  return booking.status_pembayaran === "belum_bayar" || booking.status_transaksi === "menunggu";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function methodLabel(method?: string | null) {
  if (method === "online") return "Online (Video Call)";
  if (method === "offline") return "Offline (Tatap Muka)";
  return method || "-";
}

function statusLabel(booking: BookingReceipt) {
  if (isPaidBooking(booking)) return "Sudah Dibayar";
  if (isPendingBooking(booking)) return "Menunggu Pembayaran";
  return booking.status_transaksi || booking.status_konsultasi || "Booking";
}

function amountNumber(value: BookingReceipt["jumlah_bayar"]) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export default function PatientBookingPage() {
  const backendUser = useBackendUser();
  const displayUser = {
    ...defaultPatientUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPatientUser.name,
  };

  const [activeTab, setActiveTab] = useState("buat");
  const [reports, setReports] = useState<PreAssessment[]>([]);
  const [bookings, setBookings] = useState<BookingReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadBookingContext() {
      setLoading(true);
      setError("");

      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        }

        const [dataReports, dataBookings] = await Promise.all([
          fetchPatientPreAssessments(accessToken),
          fetchPatientBookings(accessToken),
        ]);

        if (!mounted) return;
        setReports(dataReports);
        setBookings(dataBookings);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat data booking.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBookingContext();

    return () => {
      mounted = false;
    };
  }, []);

  const sortedReports = useMemo(
    () =>
      [...reports].sort(
        (a, b) =>
          new Date(b.divalidasi_pada || b.dibuat_pada || 0).getTime() -
          new Date(a.divalidasi_pada || a.dibuat_pada || 0).getTime(),
      ),
    [reports],
  );

  const eligibleReport = sortedReports.find(hasFinalFeedback) ?? null;
  const latestReport = sortedReports[0] ?? null;
  const paidBooking = bookings.find(isPaidBooking) ?? null;
  const pendingBooking = bookings.find(isPendingBooking) ?? null;

  return (
    <DashboardLayout
      title="Booking"
      navItems={getPatientNav("booking")}
      user={displayUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div>
        <div className="mb-8 border-b border-outline-variant">
          <div className="flex flex-wrap gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("buat")}
              className={`inline-flex h-14 items-center gap-2 border-b-2 px-6 text-[16px] font-semibold transition ${
                activeTab === "buat"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              Buat Booking
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("riwayat")}
              className={`inline-flex h-14 items-center gap-2 border-b-2 px-6 text-[16px] font-semibold transition ${
                activeTab === "riwayat"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <ReceiptText className="h-5 w-5" aria-hidden="true" />
              Riwayat & Receipt
            </button>
          </div>
        </div>

        {loading ? (
          <DashboardCard className="px-8 py-12 text-center">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary" aria-hidden="true" />
            <p className="mt-4 text-[15px] font-medium text-on-surface-variant">
              Memuat status booking...
            </p>
          </DashboardCard>
        ) : error ? (
          <DashboardCard className="px-8 py-12 text-center">
            <h2 className="text-[24px] font-bold text-on-surface">
              Data Booking Tidak Dapat Dimuat
            </h2>
            <p className="mx-auto mt-4 max-w-150 text-[15px] leading-7 text-red-700">
              {error}
            </p>
          </DashboardCard>
        ) : activeTab === "buat" ? (
          <BookingGate
            eligibleReport={eligibleReport}
            latestReport={latestReport}
            paidBooking={paidBooking}
            pendingBooking={pendingBooking}
          />
        ) : (
          <BookingHistory bookings={bookings} />
        )}
      </div>
    </DashboardLayout>
  );
}

function BookingGate({
  eligibleReport,
  latestReport,
  paidBooking,
  pendingBooking,
}: {
  eligibleReport: PreAssessment | null;
  latestReport: PreAssessment | null;
  paidBooking: BookingReceipt | null;
  pendingBooking: BookingReceipt | null;
}) {
  if (paidBooking) {
    return (
      <DashboardCard className="px-8 py-10 md:px-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dfeedf] text-primary">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-[30px] font-extrabold tracking-[-0.02em] text-primary">
              Jadwal konsultasi sudah aktif
            </h2>
            <p className="mt-4 max-w-170 text-[16px] leading-7 text-on-surface-variant">
              Pembayaran sudah tercatat. Kamu bisa melihat detail jadwal dan receipt dari halaman ini tanpa perlu masuk lewat pesan feedback.
            </p>
          </div>
          <BookingSummaryCard booking={paidBooking} />
        </div>
      </DashboardCard>
    );
  }

  if (pendingBooking) {
    return (
      <DashboardCard className="px-8 py-10 md:px-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Clock3 className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-[30px] font-extrabold tracking-[-0.02em] text-amber-800">
              Booking menunggu pembayaran
            </h2>
            <p className="mt-4 max-w-170 text-[16px] leading-7 text-on-surface-variant">
              Kamu sudah memilih jadwal. Lanjutkan pembayaran agar jadwal masuk ke kalender psikolog.
            </p>
          </div>
          <BookingSummaryCard booking={pendingBooking} />
        </div>
      </DashboardCard>
    );
  }

  if (eligibleReport) {
    return (
      <DashboardCard className="px-8 py-10 md:px-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dfeedf] text-primary">
              <CalendarDays className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-[30px] font-extrabold tracking-[-0.02em] text-primary">
              Konsultasi lanjutan tersedia
            </h2>
            <p className="mt-4 max-w-170 text-[16px] leading-7 text-on-surface-variant">
              Feedback psikolog sudah tersedia. Pilih tanggal, waktu, dan metode konsultasi langsung dari tab Booking.
            </p>
          </div>
          <div className="w-full max-w-[360px] rounded-[16px] border border-outline-variant bg-surface-container/40 p-5">
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
              Feedback Siap Booking
            </p>
            <h3 className="mt-2 text-[18px] font-extrabold text-on-surface">
              {eligibleReport.nama_psikolog || "Psikolog CogniScan"}
            </h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              {eligibleReport.konteks_pemicu || "Screening"} - {formatDateTime(eligibleReport.divalidasi_pada || eligibleReport.dibuat_pada)}
            </p>
            <Link
              href={`/pasien/booking/jadwal?id_pra_asesmen=${eligibleReport.id_pra_asesmen}`}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-white transition hover:bg-[#365f39]"
            >
              Pilih Jadwal Konsultasi
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className="px-8 py-12 text-center md:px-14">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-container text-[#765a9c]">
        <LockKeyhole className="h-8 w-8" aria-hidden="true" />
      </div>
      <h2 className="text-[30px] font-extrabold tracking-[-0.02em] text-[#a98ad6]">
        Konsultasi lanjutan belum tersedia
      </h2>
      <p className="mx-auto mt-4 max-w-160 text-[16px] leading-7 text-on-surface-variant">
        {latestReport
          ? "Hasil screening kamu sudah tercatat, tetapi feedback final psikolog belum tersedia untuk dibuat booking."
          : "Selesaikan screening awal terlebih dahulu agar psikolog dapat memberi feedback dan membuka akses booking konsultasi."}
      </p>

      <div className="mx-auto mt-8 grid max-w-175 gap-4 text-left md:grid-cols-3">
        {[
          "Selesaikan screening awal",
          "Tunggu feedback psikolog",
          "Pilih jadwal di tab Booking",
        ].map((step, index) => (
          <div
            key={step}
            className="flex items-start gap-3 rounded-[14px] bg-surface-container px-4 py-4"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-white">
              {index + 1}
            </div>
            <p className="pt-1.5 text-sm font-semibold leading-5 text-on-surface">
              {step}
            </p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function BookingSummaryCard({ booking }: { booking: BookingReceipt }) {
  return (
    <div className="w-full max-w-[380px] rounded-[16px] border border-outline-variant bg-white p-5 shadow-[0_18px_30px_-24px_rgba(27,28,26,0.35)]">
      <div className="flex items-start justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
            {statusLabel(booking)}
          </p>
          <h3 className="mt-1 text-[17px] font-extrabold text-on-surface">
            {booking.nama_psikolog || "Psikolog CogniScan"}
          </h3>
        </div>
        <span className="rounded-full bg-primary-container/20 px-3 py-1 text-[11px] font-bold uppercase text-primary">
          {booking.mode_konsultasi || booking.metode_konsultasi || "-"}
        </span>
      </div>
      <div className="space-y-2 py-4 text-[14px] text-on-surface-variant">
        <p>
          Jadwal: <span className="font-semibold text-on-surface">{formatDate(booking.tanggal_konsultasi)}, {booking.waktu_konsultasi || "-"}</span>
        </p>
        <p>
          Metode: <span className="font-semibold text-on-surface">{methodLabel(booking.mode_konsultasi || booking.metode_konsultasi)}</span>
        </p>
        <p>
          Total: <span className="font-semibold text-on-surface">{formatCurrency(amountNumber(booking.jumlah_bayar))}</span>
        </p>
      </div>
      {booking.order_id ? (
        <Link
          href={`/pasien/booking/receipt/detail?order_id=${encodeURIComponent(booking.order_id)}`}
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-primary px-5 text-[14px] font-semibold text-primary transition hover:bg-primary-container/10"
        >
          Lihat Detail & Receipt
        </Link>
      ) : null}
    </div>
  );
}

function BookingHistory({ bookings }: { bookings: BookingReceipt[] }) {
  if (bookings.length === 0) {
    return (
      <DashboardCard className="px-8 py-12 text-center md:px-14">
        <h2 className="text-[24px] font-bold text-on-surface">
          Riwayat & Receipt
        </h2>
        <p className="mt-4 text-on-surface-variant">
          Belum ada riwayat booking atau receipt.
        </p>
      </DashboardCard>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {bookings.map((booking) => (
        <DashboardCard key={booking.order_id || booking.id_pemesanan_konsultasi} className="px-6 py-6">
          <div className="flex items-start justify-between gap-4 border-b border-outline-variant pb-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                {statusLabel(booking)}
              </p>
              <h3 className="mt-1 text-[17px] font-extrabold text-on-surface">
                Order {booking.order_id || "-"}
              </h3>
            </div>
            <p className="text-[15px] font-extrabold text-on-surface">
              {formatCurrency(amountNumber(booking.jumlah_bayar))}
            </p>
          </div>
          <div className="space-y-1.5 py-4 text-sm text-on-surface-variant">
            <p>Psikolog: <span className="text-on-surface">{booking.nama_psikolog || "Psikolog CogniScan"}</span></p>
            <p>Jadwal: <span className="text-on-surface">{formatDate(booking.tanggal_konsultasi)}, {booking.waktu_konsultasi || "-"}</span></p>
            <p>Metode: <span className="text-on-surface">{methodLabel(booking.mode_konsultasi || booking.metode_konsultasi)}</span></p>
          </div>
          {booking.order_id ? (
            <Link
              href={`/pasien/booking/receipt/detail?order_id=${encodeURIComponent(booking.order_id)}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-[8px] border border-outline-variant text-sm font-extrabold text-on-surface transition hover:border-primary hover:text-primary"
            >
              Detail
            </Link>
          ) : null}
        </DashboardCard>
      ))}
    </div>
  );
}
