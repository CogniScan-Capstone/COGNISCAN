"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  Monitor,
  ReceiptText,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";

import { DashboardCard, DashboardLayout, StatusBadge } from "@/components/dashboard";
import {
  getPatientNav,
  patientProfileHref,
  patientUser as defaultPatientUser,
} from "@/components/patient";
import {
  cancelPatientBooking,
  closeMissedPatientBooking,
  fetchPatientBookings,
  requestPatientBookingReschedule,
  type BookingReceipt,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";

type ConsultationTab = "menunggu" | "selesai";
type ConsultationStatus =
  | "terjadwal"
  | "terlewat"
  | "menunggu_reschedule"
  | "reschedule_disetujui"
  | "reschedule_ditolak"
  | "selesai"
  | "ditutup"
  | "dibatalkan"
  | "dibatalkan_pasien"
  | "payment_kedaluwarsa";

function isPaid(booking: BookingReceipt) {
  return booking.status_pembayaran === "dibayar" || booking.status_transaksi === "berhasil";
}

function consultationTab(booking: BookingReceipt): ConsultationTab {
  const status = normalizeConsultationStatus(booking);
  return status === "selesai" ||
    status === "ditutup" ||
    status === "dibatalkan" ||
    status === "dibatalkan_pasien" ||
    status === "payment_kedaluwarsa"
    ? "selesai"
    : "menunggu";
}

function normalizeConsultationStatus(booking: BookingReceipt): ConsultationStatus {
  const status = booking.status_konsultasi;
  if (status === "selesai") return "selesai";
  if (status === "terlewat") return "terlewat";
  if (status === "menunggu_reschedule") return "menunggu_reschedule";
  if (status === "reschedule_disetujui") return "reschedule_disetujui";
  if (status === "reschedule_ditolak") return "reschedule_ditolak";
  if (status === "ditutup") return "ditutup";
  if (status === "dibatalkan") return "dibatalkan";
  if (status === "dibatalkan_pasien") return "dibatalkan_pasien";
  if (status === "payment_kedaluwarsa") return "payment_kedaluwarsa";
  return "terjadwal";
}

const statusCopy: Record<
  ConsultationStatus,
  {
    label: string;
    tone: "success" | "warning" | "danger" | "info" | "neutral" | "purple";
    icon: typeof Clock3;
  }
> = {
  terjadwal: { label: "Terjadwal", tone: "success", icon: Clock3 },
  terlewat: { label: "Terlewat", tone: "warning", icon: AlertTriangle },
  menunggu_reschedule: { label: "Menunggu Reschedule", tone: "warning", icon: RotateCcw },
  reschedule_disetujui: { label: "Reschedule Disetujui", tone: "success", icon: CheckCircle2 },
  reschedule_ditolak: { label: "Reschedule Ditolak", tone: "danger", icon: XCircle },
  selesai: { label: "Selesai", tone: "success", icon: CheckCircle2 },
  ditutup: { label: "Ditutup", tone: "neutral", icon: XCircle },
  dibatalkan: { label: "Dibatalkan", tone: "neutral", icon: XCircle },
  dibatalkan_pasien: { label: "Dibatalkan Pasien", tone: "neutral", icon: Ban },
  payment_kedaluwarsa: { label: "Pembayaran Kedaluwarsa", tone: "neutral", icon: XCircle },
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
}

function formatTimeRange(booking: BookingReceipt) {
  if (!booking.waktu_konsultasi) return "-";
  if (!booking.waktu_selesai) return `${booking.waktu_konsultasi} WIB`;
  return `${booking.waktu_konsultasi} - ${booking.waktu_selesai} WIB`;
}

function methodLabel(booking: BookingReceipt) {
  const method = booking.mode_konsultasi || booking.metode_konsultasi;
  if (method === "online") return `Online${booking.platform_pertemuan ? ` (${booking.platform_pertemuan})` : ""}`;
  if (method === "offline") return "Offline (Tatap Muka)";
  return method || "-";
}

function normalizedMeetingHref(value?: string | null) {
  if (!value?.trim()) return null;
  const link = value.trim();
  return link.startsWith("http://") || link.startsWith("https://") ? link : `https://${link}`;
}

function sortBySchedule(a: BookingReceipt, b: BookingReceipt) {
  const dateA = `${a.tanggal_konsultasi || ""}T${a.waktu_konsultasi || "00:00"}`;
  const dateB = `${b.tanggal_konsultasi || ""}T${b.waktu_konsultasi || "00:00"}`;
  return new Date(dateA).getTime() - new Date(dateB).getTime();
}

function parseBookingDateTime(date?: string | null, time?: string | null) {
  if (!date || !time) return null;
  const shortTime = time.slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(shortTime)) return null;

  const parsed = new Date(`${date}T${shortTime}:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function scheduledStart(booking: BookingReceipt) {
  return parseBookingDateTime(booking.tanggal_konsultasi, booking.waktu_konsultasi);
}

function scheduledEndWithGrace(booking: BookingReceipt) {
  const explicitEnd = parseBookingDateTime(booking.tanggal_konsultasi, booking.waktu_selesai);
  const fallbackStart = scheduledStart(booking);
  const end = explicitEnd ?? (fallbackStart ? new Date(fallbackStart.getTime() + 60 * 60 * 1000) : null);
  return end ? new Date(end.getTime() + 15 * 60 * 1000) : null;
}

function isMeetingWindowActive(booking: BookingReceipt, now: Date) {
  const start = scheduledStart(booking);
  const endWithGrace = scheduledEndWithGrace(booking);
  return Boolean(start && endWithGrace && start <= now && now <= endWithGrace);
}

function isScheduleFuture(booking: BookingReceipt, now: Date) {
  const start = scheduledStart(booking);
  return Boolean(start && start > now);
}

export default function PatientConsultationPage() {
  const backendUser = useBackendUser();
  const displayUser = {
    ...defaultPatientUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPatientUser.name,
  };

  const [activeTab, setActiveTab] = useState<ConsultationTab>("menunggu");
  const [bookings, setBookings] = useState<BookingReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let mounted = true;

    async function loadConsultations() {
      setLoading(true);
      setError("");

      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        }

        const dataBookings = await fetchPatientBookings(accessToken);
        if (mounted) setBookings(dataBookings.filter(isPaid).sort(sortBySchedule));
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat data konsultasi.");
          setBookings([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadConsultations();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  function replaceBooking(updatedBooking: BookingReceipt) {
    setBookings((current) =>
      current
        .map((booking) =>
          booking.id_pemesanan_konsultasi === updatedBooking.id_pemesanan_konsultasi
            ? updatedBooking
            : booking,
        )
        .filter(isPaid)
        .sort(sortBySchedule),
    );
  }

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
    }
    return accessToken;
  }

  async function handleRequestReschedule(bookingId: number, reason: string) {
    const accessToken = await getAccessToken();
    const updatedBooking = await requestPatientBookingReschedule(
      accessToken,
      bookingId,
      reason,
    );
    replaceBooking(updatedBooking);
  }

  async function handleCloseMissedBooking(bookingId: number) {
    const accessToken = await getAccessToken();
    const updatedBooking = await closeMissedPatientBooking(accessToken, bookingId);
    replaceBooking(updatedBooking);
  }

  async function handleCancelPaidBooking(bookingId: number, reason: string) {
    const accessToken = await getAccessToken();
    const updatedBooking = await cancelPatientBooking(accessToken, bookingId, {
      alasan_pasien: reason.trim() || null,
      konfirmasi_no_refund: true,
    });
    replaceBooking(updatedBooking);
  }

  const counts = useMemo(() => {
    const menunggu = bookings.filter((booking) => consultationTab(booking) === "menunggu").length;
    const selesai = bookings.filter((booking) => consultationTab(booking) === "selesai").length;
    return { menunggu, selesai };
  }, [bookings]);

  const filteredConsultations = useMemo(
    () => bookings.filter((booking) => consultationTab(booking) === activeTab),
    [activeTab, bookings],
  );

  return (
    <DashboardLayout
      title="Konsultasi"
      navItems={getPatientNav("konsultasi")}
      user={displayUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div>
        <header className="mb-9">
          <h2 className="text-[38px] font-extrabold tracking-[-0.03em] text-[#6f5794]">
            Konsultasi Saya
          </h2>
          <p className="mt-1 text-[16px] text-on-surface-variant">
            Lihat jadwal, akses link online, atau detail alamat konsultasi offline.
          </p>
        </header>

        <div className="mb-8 border-b border-outline-variant">
          <div className="flex flex-wrap gap-8">
            <button
              type="button"
              onClick={() => setActiveTab("menunggu")}
              className={`inline-flex h-12 items-center gap-2 border-b-2 text-[16px] font-extrabold ${
                activeTab === "menunggu"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant"
              }`}
            >
              Terjadwal
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#dfe9de] px-2 text-sm text-primary">
                {counts.menunggu}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("selesai")}
              className={`inline-flex h-12 items-center gap-2 border-b-2 text-[16px] font-extrabold ${
                activeTab === "selesai"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant"
              }`}
            >
              Selesai
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#dfe9de] px-2 text-sm text-primary">
                {counts.selesai}
              </span>
            </button>
          </div>
        </div>

        {loading ? (
          <DashboardCard className="px-8 py-12 text-center">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary" aria-hidden="true" />
            <p className="mt-4 text-[15px] font-medium text-on-surface-variant">
              Memuat jadwal konsultasi...
            </p>
          </DashboardCard>
        ) : error ? (
          <DashboardCard className="px-8 py-12 text-center">
            <p className="text-[15px] font-semibold text-red-700">{error}</p>
          </DashboardCard>
        ) : filteredConsultations.length === 0 ? (
          <DashboardCard className="px-8 py-12 text-center">
            <h3 className="text-[22px] font-bold text-on-surface">
              {activeTab === "menunggu"
                ? "Belum Ada Konsultasi Terjadwal"
                : "Belum Ada Konsultasi Selesai"}
            </h3>
            <p className="mx-auto mt-3 max-w-130 text-[15px] leading-7 text-on-surface-variant">
              {activeTab === "menunggu"
                ? "Konsultasi yang sudah dibayar akan muncul di sini."
                : "Riwayat konsultasi yang sudah selesai akan muncul di sini."}
            </p>
            {activeTab === "menunggu" ? (
              <Link
                href="/pasien/booking"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-[15px] font-semibold text-white transition hover:bg-[#365f39]"
              >
                Buka Booking
              </Link>
            ) : null}
          </DashboardCard>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {filteredConsultations.map((item) => (
              <ConsultationCard
                key={item.order_id || item.id_pemesanan_konsultasi}
                booking={item}
                now={now}
                onRequestReschedule={handleRequestReschedule}
                onCloseMissedBooking={handleCloseMissedBooking}
                onCancelPaidBooking={handleCancelPaidBooking}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ConsultationCard({
  booking,
  now,
  onRequestReschedule,
  onCloseMissedBooking,
  onCancelPaidBooking,
}: {
  booking: BookingReceipt;
  now: Date;
  onRequestReschedule: (bookingId: number, reason: string) => Promise<void>;
  onCloseMissedBooking: (bookingId: number) => Promise<void>;
  onCancelPaidBooking: (bookingId: number, reason: string) => Promise<void>;
}) {
  const isOnline = (booking.mode_konsultasi || booking.metode_konsultasi) === "online";
  const meetingHref = normalizedMeetingHref(booking.link_pertemuan);
  const status = normalizeConsultationStatus(booking);
  const statusInfo = statusCopy[status];
  const StatusIcon = statusInfo.icon;
  const [requestOpen, setRequestOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [noRefundAccepted, setNoRefundAccepted] = useState(false);
  const [actionLoading, setActionLoading] = useState<"request" | "close" | "cancel" | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const canRequestReschedule =
    status === "terjadwal" ||
    status === "terlewat" ||
    status === "reschedule_ditolak";
  const canCloseMissed = status === "terlewat";
  const canChooseNewSchedule = status === "reschedule_disetujui";
  const scheduleFuture = isScheduleFuture(booking, now);
  const canCancelPaid =
    scheduleFuture &&
    (status === "terjadwal" ||
      status === "menunggu_reschedule" ||
      status === "reschedule_disetujui" ||
      status === "reschedule_ditolak");
  const meetingWindowActive = isMeetingWindowActive(booking, now);
  const showMeetingLink =
    isOnline &&
    meetingHref &&
    meetingWindowActive &&
    status !== "terlewat" &&
    status !== "ditutup" &&
    status !== "dibatalkan" &&
    status !== "dibatalkan_pasien" &&
    status !== "reschedule_disetujui";

  async function submitRescheduleRequest() {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10 || actionLoading) {
      setActionError("Tuliskan alasan minimal 10 karakter.");
      return;
    }

    setActionLoading("request");
    setActionError("");
    setActionMessage("");
    try {
      await onRequestReschedule(booking.id_pemesanan_konsultasi, trimmedReason);
      setActionMessage("Pengajuan reschedule sudah dikirim ke psikolog.");
      setRequestOpen(false);
      setReason("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal mengajukan reschedule.");
    } finally {
      setActionLoading(null);
    }
  }

  async function submitCloseMissedBooking() {
    if (actionLoading) return;

    setActionLoading("close");
    setActionError("");
    setActionMessage("");
    try {
      await onCloseMissedBooking(booking.id_pemesanan_konsultasi);
      setActionMessage("Booking terlewat sudah ditutup.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menutup booking.");
    } finally {
      setActionLoading(null);
    }
  }

  async function submitCancelPaidBooking() {
    if (actionLoading) return;
    if (!noRefundAccepted) {
      setActionError("Centang konfirmasi no-refund sebelum membatalkan konsultasi.");
      return;
    }

    setActionLoading("cancel");
    setActionError("");
    setActionMessage("");
    try {
      await onCancelPaidBooking(booking.id_pemesanan_konsultasi, cancelReason);
      setActionMessage("Konsultasi berhasil dibatalkan. Slot jadwal sudah dilepas.");
      setCancelOpen(false);
      setCancelReason("");
      setNoRefundAccepted(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal membatalkan konsultasi.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <DashboardCard className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <StatusBadge
          tone={statusInfo.tone}
          className="h-7"
        >
          <StatusIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {statusInfo.label}
        </StatusBadge>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-[12px] font-semibold text-on-surface-variant">
          {isOnline ? (
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      <div className="mt-5 border-t border-surface-variant pt-5">
        <h3 className="text-[18px] font-extrabold text-on-surface">
          {booking.nama_psikolog || "Psikolog CogniScan"}
        </h3>

        <div className="mt-4 space-y-4 text-[16px] text-on-surface-variant">
          <p className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>{formatDate(booking.tanggal_konsultasi)}</span>
          </p>
          <p className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>{formatTimeRange(booking)}</span>
          </p>
          <p className="flex items-start gap-3">
            {isOnline ? (
              <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            )}
            <span>{methodLabel(booking)}</span>
          </p>
        </div>

        <div className="mt-5 rounded-[14px] bg-surface-container/60 px-4 py-4">
          {isOnline ? (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
                Link Konsultasi Online
              </p>
              {showMeetingLink ? (
                <a
                  href={meetingHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[14px] font-semibold text-white transition hover:bg-[#365f39]"
                >
                  Masuk Ruang Konsultasi
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : status === "terlewat" || status === "ditutup" ? (
                <p className="mt-2 text-[14px] leading-6 text-on-surface-variant">
                  Sesi online pada jadwal ini sudah lewat. Kamu bisa mengajukan
                  penjadwalan ulang jika masih membutuhkan sesi lanjutan.
                </p>
              ) : status === "dibatalkan" || status === "dibatalkan_pasien" ? (
                <p className="mt-2 text-[14px] leading-6 text-on-surface-variant">
                  Konsultasi ini sudah dibatalkan sehingga link meeting tidak dapat digunakan.
                </p>
              ) : status === "reschedule_disetujui" ? (
                <p className="mt-2 text-[14px] leading-6 text-on-surface-variant">
                  Reschedule sudah disetujui. Pilih slot baru agar link konsultasi
                  diperbarui.
                </p>
              ) : meetingHref && scheduleFuture ? (
                <p className="mt-2 text-[14px] leading-6 text-on-surface-variant">
                  Link meeting sudah disiapkan dan akan aktif saat jadwal konsultasi dimulai.
                </p>
              ) : meetingHref && !meetingWindowActive && status === "terjadwal" ? (
                <p className="mt-2 text-[14px] leading-6 text-on-surface-variant">
                  Waktu akses link pada jadwal ini sudah lewat. Muat ulang halaman untuk memperbarui status konsultasi.
                </p>
              ) : (
                <p className="mt-2 text-[14px] leading-6 text-on-surface-variant">
                  Link meeting sedang dibuat otomatis setelah pembayaran terkonfirmasi.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
                Lokasi Konsultasi Offline
              </p>
              <p className="mt-2 text-[15px] leading-6 text-on-surface">
                {booking.lokasi_konsultasi || "Alamat praktik psikolog belum diatur."}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-[14px] border border-outline-variant bg-white px-4 py-4">
          {(status === "dibatalkan" || status === "dibatalkan_pasien") &&
          booking.alasan_pembatalan_pasien ? (
            <div className="mb-4 rounded-[12px] bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Alasan pembatalan</p>
              <p className="mt-1 leading-6">{booking.alasan_pembatalan_pasien}</p>
            </div>
          ) : null}

          {booking.reschedule_request ? (
            <div className="mb-4 rounded-[12px] bg-surface-container/60 px-4 py-3 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">
                Pengajuan reschedule: {booking.reschedule_request.status}
              </p>
              <p className="mt-1 leading-6">{booking.reschedule_request.alasan_pasien}</p>
              {booking.reschedule_request.catatan_psikolog ? (
                <p className="mt-2 leading-6">
                  Catatan psikolog:{" "}
                  <span className="font-medium text-on-surface">
                    {booking.reschedule_request.catatan_psikolog}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {canChooseNewSchedule ? (
              <Link
                href={`/pasien/booking/jadwal?reschedule_booking_id=${booking.id_pemesanan_konsultasi}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[14px] font-semibold text-white transition hover:bg-[#365f39]"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Pilih Jadwal Baru
              </Link>
            ) : null}

            {canRequestReschedule ? (
              <button
                type="button"
                onClick={() => {
                  setRequestOpen((open) => !open);
                  setCancelOpen(false);
                  setActionError("");
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-primary px-5 text-[14px] font-semibold text-primary transition hover:bg-primary-container/10"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Ajukan Penjadwalan Ulang
              </button>
            ) : null}

            {canCancelPaid ? (
              <button
                type="button"
                onClick={() => {
                  setCancelOpen((open) => !open);
                  setRequestOpen(false);
                  setActionError("");
                }}
                disabled={actionLoading === "cancel"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-red-200 px-5 text-[14px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
              >
                {actionLoading === "cancel" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Ban className="h-4 w-4" aria-hidden="true" />
                )}
                Batalkan Konsultasi
              </button>
            ) : null}

            {canCloseMissed ? (
              <button
                type="button"
                onClick={submitCloseMissedBooking}
                disabled={actionLoading === "close"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-outline-variant px-5 text-[14px] font-semibold text-on-surface-variant transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-70"
              >
                {actionLoading === "close" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                )}
                Tutup Booking
              </button>
            ) : null}
          </div>

          {requestOpen ? (
            <div className="mt-4 rounded-[12px] border border-[#f0d36d] bg-[#fff9df] p-4">
              <label className="text-sm font-semibold text-on-surface">
                Alasan penjadwalan ulang
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  placeholder="Contoh: Saya lupa jadwal konsultasi dan ingin meminta kesempatan penjadwalan ulang."
                  className="mt-2 w-full resize-none rounded-[10px] border border-outline-variant bg-white px-3 py-3 text-sm font-medium leading-6 text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={submitRescheduleRequest}
                  disabled={actionLoading === "request"}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#7a9479] px-5 text-sm font-semibold text-white transition hover:bg-[#6a8669] disabled:cursor-wait disabled:opacity-70"
                >
                  {actionLoading === "request" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                  Kirim Pengajuan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestOpen(false);
                    setActionError("");
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-outline-variant px-5 text-sm font-semibold text-on-surface-variant transition hover:border-primary hover:text-primary"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : null}

          {cancelOpen ? (
            <div className="mt-4 rounded-[12px] border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Pembatalan konsultasi berbayar
              </p>
              <p className="mt-1 text-sm leading-6 text-red-700">
                Dana konsultasi tidak dikembalikan otomatis. Slot jadwal akan dilepas
                agar psikolog bisa menerima pasien lain.
              </p>
              <label className="mt-3 block text-sm font-semibold text-on-surface">
                Alasan pembatalan
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={3}
                  placeholder="Opsional, contoh: Ada jadwal mendadak dan saya belum bisa hadir."
                  className="mt-2 w-full resize-none rounded-[10px] border border-red-200 bg-white px-3 py-3 text-sm font-medium leading-6 text-on-surface placeholder:text-on-surface-muted focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
              </label>
              <label className="mt-3 flex items-start gap-2 text-sm font-medium leading-6 text-red-800">
                <input
                  type="checkbox"
                  checked={noRefundAccepted}
                  onChange={(event) => setNoRefundAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-red-300 text-red-700 focus:ring-red-200"
                />
                Saya memahami pembatalan ini tidak memproses refund otomatis.
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={submitCancelPaidBooking}
                  disabled={actionLoading === "cancel" || !noRefundAccepted}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-70"
                >
                  {actionLoading === "cancel" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Ban className="h-4 w-4" aria-hidden="true" />
                  )}
                  Konfirmasi Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCancelOpen(false);
                    setActionError("");
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : null}

          {actionMessage ? (
            <p className="mt-3 rounded-[10px] border border-[#c4ddc5] bg-[#eef7ef] px-4 py-3 text-sm font-semibold text-primary">
              {actionMessage}
            </p>
          ) : null}
          {actionError ? (
            <p className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {actionError}
            </p>
          ) : null}
        </div>

        {booking.order_id ? (
          <Link
            href={`/pasien/booking/receipt/detail?order_id=${encodeURIComponent(booking.order_id)}`}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-outline-variant px-5 text-[14px] font-semibold text-on-surface-variant transition hover:border-primary hover:text-primary"
          >
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
            Lihat Receipt
          </Link>
        ) : null}
      </div>
    </DashboardCard>
  );
}
