"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Loader2, ReceiptText } from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser } from "@/components/patient";
import { fetchPatientBookings, type BookingReceipt } from "@/lib/auth";
import { formatCurrency } from "@/lib/booking";
import { supabase } from "@/lib/supabase/client";

function toAmount(value: BookingReceipt["jumlah_bayar"]) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatBookingDate(booking: BookingReceipt) {
  if (!booking.tanggal_konsultasi) return "-";

  return new Date(`${booking.tanggal_konsultasi}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function methodLabel(booking: BookingReceipt) {
  const method = booking.metode_konsultasi || booking.mode_konsultasi || "-";
  if (method === "online") return "Online (Video Call)";
  if (method === "offline") return "Offline (Tatap Muka)";
  return method;
}

function statusLabel(booking: BookingReceipt) {
  if (
    booking.status_pembayaran === "kedaluwarsa" ||
    booking.status_konsultasi === "payment_kedaluwarsa"
  ) {
    return "Pembayaran Kedaluwarsa";
  }
  if (booking.status_konsultasi === "dibatalkan_pasien") return "Dibatalkan Pasien";
  if (booking.status_konsultasi === "dibatalkan") return "Dibatalkan";
  if (booking.status_konsultasi === "ditutup") return "Ditutup";
  if (booking.status_konsultasi === "selesai") return "Selesai";
  if (booking.status_pembayaran === "dibayar" || booking.status_transaksi === "berhasil") {
    return "Terkonfirmasi";
  }
  if (booking.status_transaksi === "menunggu" || booking.status_pembayaran === "belum_bayar") {
    return "Menunggu Pembayaran";
  }
  return booking.status_transaksi || booking.status_konsultasi || "Booking";
}

export default function BookingReceiptPage() {
  const [bookings, setBookings] = useState<BookingReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadBookings() {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        }

        const dataBookings = await fetchPatientBookings(accessToken);
        if (mounted) setBookings(dataBookings);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat riwayat booking.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBookings();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardLayout
      title="Booking"
      navItems={getPatientNav("booking")}
      user={patientUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div>
        <div className="mb-6 border-b border-outline-variant">
          <div className="flex flex-wrap gap-6">
            <Link
              href="/pasien/booking/jadwal"
              className="inline-flex h-14 items-center gap-2 border-b-2 border-transparent px-6 text-[16px] font-semibold text-on-surface-muted transition-colors hover:text-primary"
            >
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              Booking
            </Link>
            <Link
              href="/pasien/booking/receipt"
              className="inline-flex h-14 items-center gap-2 border-b-2 border-primary px-6 text-[16px] font-semibold text-primary"
            >
              <ReceiptText className="h-5 w-5" aria-hidden="true" />
              Riwayat & Receipt
            </Link>
          </div>
        </div>

        <h2 className="mb-8  pt-2 text-[20px] font-bold text-on-surface-muted">
          Riwayat & Receipt
        </h2>

        {loading ? (
          <DashboardCard className="px-8 py-12 text-center">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary" aria-hidden="true" />
            <p className="mt-4 text-[15px] font-medium text-on-surface-variant">
              Memuat riwayat booking...
            </p>
          </DashboardCard>
        ) : error ? (
          <DashboardCard className="px-8 py-12 text-center">
            <h3 className="text-[22px] font-bold text-on-surface">
              Riwayat Tidak Dapat Dimuat
            </h3>
            <p className="mx-auto mt-3 max-w-120 text-[15px] leading-7 text-red-700">
              {error}
            </p>
          </DashboardCard>
        ) : bookings.length === 0 ? (
          <DashboardCard className="px-8 py-12 text-center">
            <h3 className="text-[22px] font-bold text-on-surface">
              Belum Ada Booking
            </h3>
            <p className="mx-auto mt-3 max-w-120 text-[15px] leading-7 text-on-surface-variant">
              Booking yang sudah dikonfirmasi akan muncul di sini.
            </p>
            <Link
              href="/pasien/booking/jadwal"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-[15px] font-semibold text-white transition hover:bg-[#365f39]"
            >
              Buat Booking
            </Link>
          </DashboardCard>
        ) : (
          <div className="grid gap-7 xl:grid-cols-2">
            {bookings.map((booking) => (
            <DashboardCard
              key={booking.order_id || booking.id_pemesanan_konsultasi}
              className="px-6 py-6"
            >
              <div className="flex items-start justify-between gap-4 border-b border-surface-variant pb-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#d9f6dd] text-[#0bbf5f]">
                    <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-on-surface-muted">
                      {statusLabel(booking)}
                    </p>
                    <h3 className="text-[15px] font-extrabold text-on-surface">
                      Order {booking.order_id || "-"}
                    </h3>
                  </div>
                </div>
                <p className="text-[15px] font-extrabold text-on-surface">
                  {formatCurrency(toAmount(booking.jumlah_bayar))}
                </p>
              </div>

              <div className="space-y-1 border-b border-surface-variant py-4 text-sm leading-6 text-on-surface-variant">
                <p>
                  Konsultasi: <span className="text-on-surface">{booking.nama_psikolog || "Psikolog CogniScan"}</span>
                </p>
                <p>
                  Tanggal: <span className="text-on-surface">{formatBookingDate(booking)}, {booking.waktu_konsultasi || "-"}</span>
                </p>
                <p>
                  Jenis Konsultasi: <span className="text-on-surface">{methodLabel(booking)}</span>
                </p>
              </div>

              <Link
                href={`/pasien/booking/receipt/detail?order_id=${encodeURIComponent(booking.order_id || "")}`}
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[8px] border border-outline-variant text-sm font-extrabold text-on-surface transition hover:border-primary hover:text-primary"
              >
                Detail
              </Link>
            </DashboardCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
