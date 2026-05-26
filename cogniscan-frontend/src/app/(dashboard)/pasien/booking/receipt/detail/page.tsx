"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import {
  fetchPaymentReceipt,
  initiatePaymentForBooking,
  type BookingReceipt,
} from "@/lib/auth";
import { formatCurrency } from "@/lib/booking";
import { supabase } from "@/lib/supabase/client";

type SnapResult = Record<string, unknown>;

type SnapPayOptions = {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: SnapPayOptions) => void;
    };
  }
}

type ReceiptContext = "booking" | "reschedule";

function getReceiptContext(): ReceiptContext {
  if (typeof window === "undefined") return "booking";
  const context = new URLSearchParams(window.location.search).get("context");
  return context === "reschedule" ? "reschedule" : "booking";
}

function loadMidtransSnap(scriptUrl: string, clientKey: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-midtrans-snap='true']",
    );

    if (window.snap && existing?.dataset.clientKey === clientKey) {
      resolve();
      return;
    }

    existing?.remove();
    window.snap = undefined;

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.dataset.midtransSnap = "true";
    script.dataset.clientKey = clientKey;
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat tampilan pembayaran Midtrans."));

    document.body.appendChild(script);
  });
}

function toAmount(value: BookingReceipt["jumlah_bayar"]) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function methodLabel(receipt: BookingReceipt) {
  const method = receipt.metode_konsultasi || receipt.mode_konsultasi || "-";
  if (method === "online") return "Online (Video Call)";
  if (method === "offline") return "Offline (Tatap Muka)";
  return method;
}

function statusLabel(receipt: BookingReceipt) {
  if (
    receipt.status_pembayaran === "kedaluwarsa" ||
    receipt.status_konsultasi === "payment_kedaluwarsa"
  ) {
    return "Pembayaran Kedaluwarsa";
  }
  if (receipt.status_konsultasi === "dibatalkan_pasien") return "Konsultasi Dibatalkan";
  if (receipt.status_konsultasi === "dibatalkan") return "Booking Dibatalkan";
  if (receipt.status_konsultasi === "ditutup") return "Konsultasi Ditutup";
  if (receipt.status_konsultasi === "selesai") return "Konsultasi Selesai";
  if (receipt.status_konsultasi === "menunggu_konfirmasi_psikolog") {
    return "Menunggu Konfirmasi Psikolog";
  }
  if (receipt.status_pembayaran === "dibayar" || receipt.status_transaksi === "berhasil") {
    return "Pembayaran Berhasil";
  }
  if (receipt.status_transaksi === "menunggu" || receipt.status_pembayaran === "belum_bayar") {
    return "Menunggu Pembayaran";
  }
  if (receipt.status_transaksi === "kedaluwarsa") return "Pembayaran Kedaluwarsa";
  if (receipt.status_transaksi === "dibatalkan") return "Pembayaran Dibatalkan";
  if (receipt.status_transaksi === "gagal") return "Pembayaran Gagal";
  return "Booking Dibuat";
}

function displayTitle(receipt: BookingReceipt, context: ReceiptContext) {
  if (
    context === "reschedule" &&
    (receipt.status_pembayaran === "dibayar" || receipt.status_transaksi === "berhasil")
  ) {
    return "Reschedule Berhasil";
  }
  return statusLabel(receipt);
}

function displayDescription(context: ReceiptContext) {
  if (context === "reschedule") {
    return "Jadwal konsultasimu sudah diperbarui di sistem.";
  }
  return "Booking konsultasimu sudah dicatat di sistem.";
}

function formatConsultationDateTime(receipt: BookingReceipt) {
  if (!receipt.tanggal_konsultasi) return "-";

  const date = new Date(`${receipt.tanggal_konsultasi}T00:00:00`);
  const formattedDate = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });

  return `${formattedDate} - ${receipt.waktu_konsultasi || "-"}`;
}

function formatTransactionTime(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
}

export default function BookingReceiptDetailPage() {
  const [receiptContext] = useState<ReceiptContext>(() => getReceiptContext());
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState("");

  async function handlePayNow() {
    if (!receipt || isPaying) return;
    setIsPaying(true);
    setPayError("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
      }

      const checkout = await initiatePaymentForBooking(
        accessToken,
        receipt.id_pemesanan_konsultasi,
      );

      try {
        await loadMidtransSnap(checkout.snap_script_url, checkout.client_key);
      } catch {
        window.location.href = checkout.redirect_url;
        return;
      }

      if (!window.snap) {
        window.location.href = checkout.redirect_url;
        return;
      }

      window.snap.pay(checkout.snap_token, {
        onSuccess: () => {
          window.location.reload();
        },
        onPending: () => {
          window.location.reload();
        },
        onError: () => {
          setPayError("Pembayaran gagal diproses. Silakan coba kembali.");
          setIsPaying(false);
        },
        onClose: () => {
          setIsPaying(false);
        },
      });
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Gagal memproses pembayaran.");
      setIsPaying(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadReceipt() {
      try {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get("order_id");
        if (!orderId) {
          throw new Error("Order ID tidak ditemukan.");
        }

        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        }

        const dataReceipt = await fetchPaymentReceipt(accessToken, orderId);
        if (mounted) setReceipt(dataReceipt);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat receipt pembayaran.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadReceipt();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10 text-on-surface">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
      </main>
    );
  }

  if (error || !receipt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10 text-on-surface">
        <section className="w-full max-w-[500px] rounded-[24px] bg-white px-8 py-10 text-center shadow-[0_24px_45px_-32px_rgba(27,28,26,0.42)]">
          <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-primary">
            Receipt Tidak Ditemukan
          </h1>
          <p className="mt-2 text-[16px] leading-7 text-on-surface-variant">
            {error || "Data pembayaran belum tersedia."}
          </p>
          <Link
            href="/pasien/booking/jadwal"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-[15px] font-medium text-white transition hover:bg-[#365f39]"
          >
            Buat Booking
          </Link>
        </section>
      </main>
    );
  }

  const method = receipt.metode_konsultasi || receipt.mode_konsultasi || "-";
  const title = displayTitle(receipt, receiptContext);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10 text-on-surface">
      <section className="w-full max-w-[500px] rounded-[24px] bg-white px-8 py-10 shadow-[0_24px_45px_-32px_rgba(27,28,26,0.42)]">
        <header className="text-center">
          <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-primary">
            {title}
          </h1>
          <p className="mt-2 text-[16px] text-on-surface-variant">
            {displayDescription(receiptContext)}
          </p>
        </header>

        <div className="my-10 border-t border-dashed border-outline-variant" />

        <dl className="space-y-0 text-[16px]">
          <div className="grid grid-cols-[1fr_auto] items-center gap-5 px-1 py-3">
            <dt className="text-on-surface-variant">Order ID</dt>
            <dd className="flex items-center gap-2 font-extrabold text-primary">
              {receipt.order_id || receipt.nomor_nota || "-"}
              <Copy className="h-4 w-4" aria-hidden="true" />
            </dd>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-5 bg-surface-container-low px-1 py-3">
            <dt className="text-on-surface-variant">Status Transaksi</dt>
            <dd className="inline-flex h-8 items-center gap-2 rounded-full bg-primary-container px-4 text-xs font-medium text-primary">
              {displayTitle(receipt, receiptContext)}
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </dd>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-5 px-1 py-3">
            <dt className="text-on-surface-variant">Metode Konsultasi</dt>
            <dd className="flex items-center gap-2 font-medium text-on-surface">
              {methodLabel(receipt)}
              <span className="rounded-full bg-surface-container px-2 py-1 text-[9px] font-extrabold text-on-surface-muted">
                {method.toUpperCase()}
              </span>
            </dd>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-5 bg-surface-container-low px-1 py-3">
            <dt className="text-on-surface-variant">Total Biaya</dt>
            <dd className="text-[26px] font-extrabold tracking-[-0.03em] text-on-surface">
              {formatCurrency(toAmount(receipt.jumlah_bayar))}
            </dd>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-5 px-1 py-3">
            <dt className="text-on-surface-variant">Psikolog</dt>
            <dd className="text-right font-medium text-on-surface">
              {receipt.nama_psikolog || "Psikolog CogniScan"}
            </dd>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-5 bg-surface-container-low px-1 py-3">
            <dt className="text-on-surface-variant">Jadwal Konsultasi</dt>
            <dd className="text-right font-medium text-on-surface">
              {formatConsultationDateTime(receipt)}
            </dd>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-5 px-1 py-3">
            <dt className="text-on-surface-variant">Waktu Booking</dt>
            <dd className="text-right font-medium text-on-surface">
              {formatTransactionTime(receipt.tanggal_booking)}
            </dd>
          </div>

          {receipt.alasan_pembatalan_pasien ? (
            <div className="grid grid-cols-[1fr_auto] items-center gap-5 bg-red-50 px-1 py-3">
              <dt className="text-red-700">Alasan Pembatalan</dt>
              <dd className="max-w-[260px] text-right font-medium leading-6 text-red-800">
                {receipt.alasan_pembatalan_pasien}
              </dd>
            </div>
          ) : null}
        </dl>

        {receipt.status_pembayaran === "belum_bayar" && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handlePayNow}
              disabled={isPaying}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#7a9479] px-8 text-[16px] font-semibold text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:-translate-y-0.5 hover:bg-[#6a8669] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isPaying ? "Memproses Pembayaran..." : "Bayar Sekarang"}
            </button>
            {payError && (
              <p className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                {payError}
              </p>
            )}
          </div>
        )}

        <Link
          href="/pasien/dashboard"
          className="inline-flex h-14 w-full items-center justify-center rounded-full bg-primary px-8 text-[16px] font-medium text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:-translate-y-0.5 hover:bg-[#365f39]"
        >
          Kembali ke Dashboard
        </Link>
      </section>
    </main>
  );
}
