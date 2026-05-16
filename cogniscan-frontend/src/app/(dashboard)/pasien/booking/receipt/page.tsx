import Link from "next/link";
import { CalendarDays, CheckCircle2, ReceiptText } from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser } from "@/components/patient";

const receipts = [
  { method: "Offline", amount: "Rp 100.000" },
  { method: "Online", amount: "Rp 100.000" },
];

export default function BookingReceiptPage() {
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
              href="/pasien/booking"
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
          Riwayat & Receipt (Preview)
        </h2>

        <div className="grid gap-7 xl:grid-cols-2">
          {receipts.map((receipt) => (
            <DashboardCard key={receipt.method} className="px-6 py-6">
              <div className="flex items-start justify-between gap-4 border-b border-surface-variant pb-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#d9f6dd] text-[#0bbf5f]">
                    <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-on-surface-muted">
                      Selesai
                    </p>
                    <h3 className="text-[15px] font-extrabold text-on-surface">
                      Order CGS-20260512-00847
                    </h3>
                  </div>
                </div>
                <p className="text-[15px] font-extrabold text-on-surface">{receipt.amount}</p>
              </div>

              <div className="space-y-1 border-b border-surface-variant py-4 text-sm leading-6 text-on-surface-variant">
                <p>
                  Konsultasi: <span className="text-on-surface">Dr. Anisa Rahma</span>
                </p>
                <p>
                  Tanggal: <span className="text-on-surface">12 Mei 2026, 11:00</span>
                </p>
                <p>
                  Jenis Konsultasi: <span className="text-on-surface">{receipt.method}</span>
                </p>
              </div>

              <Link
                href="/pasien/booking/receipt/detail"
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[8px] border border-outline-variant text-sm font-extrabold text-on-surface transition hover:border-primary hover:text-primary"
              >
                Detail
              </Link>
            </DashboardCard>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
