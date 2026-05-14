import Link from "next/link";
import { Check, Copy } from "lucide-react";

export default function BookingReceiptDetailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10 text-on-surface">
      <section className="w-full max-w-[500px] rounded-[24px] bg-white px-8 py-10 shadow-[0_24px_45px_-32px_rgba(27,28,26,0.42)]">
        <header className="text-center">
          <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-primary">
            Pembayaran Berhasil
          </h1>
          <p className="mt-2 text-[16px] text-on-surface-variant">
            Terima kasih! Booking konsultasimu telah dikonfirmasi.
          </p>
        </header>

        <div className="my-10 border-t border-dashed border-outline-variant" />

        <dl className="space-y-0 text-[16px]">
          <div className="grid grid-cols-[1fr_auto] items-center gap-5 px-1 py-3">
            <dt className="text-on-surface-variant">Order ID</dt>
            <dd className="flex items-center gap-2 font-extrabold text-primary">
              CGS-20260512-00847
              <Copy className="h-4 w-4" aria-hidden="true" />
            </dd>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-5 bg-surface-container-low px-1 py-3">
            <dt className="text-on-surface-variant">Status Transaksi</dt>
            <dd className="inline-flex h-8 items-center gap-2 rounded-full bg-primary-container px-4 text-xs font-medium text-primary">
              Pembayaran Berhasil
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </dd>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-5 px-1 py-3">
            <dt className="text-on-surface-variant">Metode Pembayaran</dt>
            <dd className="flex items-center gap-2 font-medium text-on-surface">
              Mandiri Virtual Account
              <span className="rounded-full bg-surface-container px-2 py-1 text-[9px] font-extrabold text-on-surface-muted">
                BANK
              </span>
            </dd>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-5 bg-surface-container-low px-1 py-3">
            <dt className="text-on-surface-variant">Total Pembayaran</dt>
            <dd className="text-[26px] font-extrabold tracking-[-0.03em] text-on-surface">
              Rp 150.000
            </dd>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-5 px-1 py-3">
            <dt className="text-on-surface-variant">Waktu Transaksi</dt>
            <dd className="font-medium text-on-surface">Senin, 12 Mei 2026 - 10:34 WIB</dd>
          </div>
        </dl>

        <div className="my-8 border-t border-dashed border-outline-variant" />

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

