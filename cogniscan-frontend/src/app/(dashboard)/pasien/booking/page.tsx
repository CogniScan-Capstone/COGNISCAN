"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  LockKeyhole,
  MessageSquareText,
  ReceiptText,
} from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import {
  getPatientNav,
  patientProfileHref,
  patientUser,
} from "@/components/patient";

export default function PatientBookingPage() {
  const [activeTab, setActiveTab] = useState("buat");

  return (
    <DashboardLayout
      title="Booking"
      navItems={getPatientNav("booking")}
      user={patientUser}
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

        {/* Tab: Buat Booking */}
        {activeTab === "buat" && (
          <DashboardCard className="px-8 py-12 text-center md:px-14">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-container text-[#765a9c]">
              <LockKeyhole className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className="text-[30px] font-extrabold tracking-[-0.02em] text-[#a98ad6]">
              Konsultasi lanjutan belum tersedia
            </h2>
            <p className="mx-auto mt-4 max-w-[640px] text-[16px] leading-7 text-on-surface-variant">
              Selesaikan screening awal terlebih dahulu. Setelah psikolog
              meninjau hasil refleksimu dan merekomendasikan konsultasi
              lanjutan, jadwal yang tersedia akan muncul di halaman ini.
            </p>

            <div className="mx-auto mt-8 grid max-w-[700px] gap-4 text-left md:grid-cols-3">
              {[
                "Selesaikan screening awal",
                "Tunggu feedback psikolog",
                "Terima konsultasi lanjutan",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-[14px] bg-surface-container px-4 py-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold leading-5 text-on-surface pt-1.5">
                    {step}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                href="/pasien/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary-container px-7 text-[15px] font-semibold text-white transition hover:bg-[#4d734d]"
              >
                Mulai Screening
              </Link>
              <Link
                href="/pasien/pesan"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-primary px-7 text-[15px] font-semibold text-primary transition hover:bg-primary-container/10"
              >
                Lihat Pesan Psikolog
              </Link>
            </div>
          </DashboardCard>
        )}

        {/* Tab: Riwayat & Receipt */}
        {activeTab === "riwayat" && (
          <DashboardCard className="px-8 py-12 text-center md:px-14">
            <h2 className="text-[24px] font-bold text-on-surface">
              Riwayat & Receipt
            </h2>
            <p className="mt-4 text-on-surface-variant">
              Belum ada riwayat booking atau receipt
            </p>
          </DashboardCard>
        )}
      </div>
    </DashboardLayout>
  );
}
