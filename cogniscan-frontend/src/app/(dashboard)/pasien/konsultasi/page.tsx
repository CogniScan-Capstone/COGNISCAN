"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  Monitor,
  ReceiptText,
} from "lucide-react";

import { DashboardCard, DashboardLayout, StatusBadge } from "@/components/dashboard";
import {
  getPatientNav,
  patientProfileHref,
  patientUser as defaultPatientUser,
} from "@/components/patient";
import { fetchPatientBookings, type BookingReceipt } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";

type ConsultationTab = "menunggu" | "selesai";

function isPaid(booking: BookingReceipt) {
  return booking.status_pembayaran === "dibayar" || booking.status_transaksi === "berhasil";
}

function consultationTab(booking: BookingReceipt): ConsultationTab {
  return booking.status_konsultasi === "selesai" ? "selesai" : "menunggu";
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
                activeTab={activeTab}
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
  activeTab,
}: {
  booking: BookingReceipt;
  activeTab: ConsultationTab;
}) {
  const isOnline = (booking.mode_konsultasi || booking.metode_konsultasi) === "online";
  const meetingHref = normalizedMeetingHref(booking.link_pertemuan);

  return (
    <DashboardCard className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <StatusBadge
          tone={activeTab === "menunggu" ? "warning" : "success"}
          className="h-7"
        >
          {activeTab === "menunggu" ? (
            <Clock3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          )}
          {activeTab === "menunggu" ? "Terjadwal" : "Selesai"}
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
              {meetingHref ? (
                <a
                  href={meetingHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[14px] font-semibold text-white transition hover:bg-[#365f39]"
                >
                  Masuk Ruang Konsultasi
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : (
                <p className="mt-2 text-[14px] leading-6 text-on-surface-variant">
                  Link meeting belum tersedia. Psikolog atau admin perlu mengisi link pertemuan sebelum sesi dimulai.
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
