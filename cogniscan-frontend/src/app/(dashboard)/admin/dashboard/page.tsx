"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarCheck, ClipboardClock, ShieldCheck, Users } from "lucide-react";
import {
  DashboardCard,
  DashboardLayout,
  DashboardTable,
  DashboardTableCell,
  DashboardTableHeader,
  StatusBadge,
} from "@/components/dashboard";
import { adminUser, getAdminNav } from "@/components/admin";
import {
  fetchAdminDashboardSummary,
  psikologStatusLabel,
  psikologStatusTone,
  type AdminDashboardSummary,
} from "@/lib/admin";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";

function formatDate(value?: string | null) {
  if (!value) return "Belum tercatat";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Belum tercatat";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function AdminDashboardPage() {
  const backendUser = useBackendUser();
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      setIsLoading(true);
      setError("");

      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        if (!accessToken) {
          throw new Error("Sesi admin tidak ditemukan. Silakan login ulang.");
        }

        const result = await fetchAdminDashboardSummary(accessToken);
        if (isMounted) setSummary(result);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat data dashboard admin.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const adminName = backendUser?.nama_lengkap?.trim() || "Admin";
  const latestRegistrations = summary?.recent_psikolog ?? [];

  return (
    <DashboardLayout
      navItems={getAdminNav("dashboard")}
      user={{ ...adminUser, name: adminName }}
      contentClassName="px-6 md:px-10 lg:px-10 xl:px-10"
    >
      <div className="w-full max-w-none">
        <header className="mb-8">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-on-surface">
              Selamat Datang, {adminName}
            </h1>
            <p className="mt-1 text-[16px] text-on-surface-variant">
              Ringkasan operasional CogniScan berdasarkan data database aktif.
            </p>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-[12px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard className="flex min-h-[114px] items-center justify-between px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-[#6f5794]">
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="max-w-[120px] text-[15px] font-extrabold uppercase leading-6 text-on-surface-variant">
                Total Pasien
              </p>
            </div>
            <p className="text-[42px] font-extrabold leading-none text-[#6f5794]">
              {isLoading ? "-" : (summary?.total_pasien ?? 0)}
            </p>
          </DashboardCard>

          <DashboardCard className="flex min-h-[114px] items-center justify-between px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfeadf] text-primary">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="max-w-[150px] text-[15px] font-extrabold uppercase leading-6 text-on-surface-variant">
                Psikolog Aktif
              </p>
            </div>
            <p className="text-[42px] font-extrabold leading-none text-primary">
              {isLoading ? "-" : (summary?.psikolog_terverifikasi ?? 0)}
            </p>
          </DashboardCard>

          <DashboardCard className="flex min-h-[114px] items-center justify-between px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-container text-[#d37300]">
                <ClipboardClock className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="max-w-[150px] text-[15px] font-extrabold uppercase leading-6 text-on-surface-variant">
                Menunggu Verifikasi
              </p>
            </div>
            <p className="text-[42px] font-extrabold leading-none text-[#d37300]">
              {isLoading ? "-" : (summary?.psikolog_pending ?? 0)}
            </p>
          </DashboardCard>

          <DashboardCard className="flex min-h-[114px] items-center justify-between px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e8e2ee] text-[#8d5367]">
                <CalendarCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="max-w-[140px] text-[15px] font-extrabold uppercase leading-6 text-on-surface-variant">
                Konsultasi Dibayar
              </p>
            </div>
            <p className="text-[42px] font-extrabold leading-none text-[#8d5367]">
              {isLoading ? "-" : (summary?.konsultasi_dibayar ?? 0)}
            </p>
          </DashboardCard>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <DashboardCard className="px-5 py-4">
            <p className="text-sm font-bold uppercase text-on-surface-variant">Total Psikolog</p>
            <p className="mt-2 text-2xl font-extrabold text-on-surface">
              {isLoading ? "-" : (summary?.total_psikolog ?? 0)}
            </p>
          </DashboardCard>
          <DashboardCard className="px-5 py-4">
            <p className="text-sm font-bold uppercase text-on-surface-variant">Total Screening</p>
            <p className="mt-2 text-2xl font-extrabold text-on-surface">
              {isLoading ? "-" : (summary?.total_screening ?? 0)}
            </p>
          </DashboardCard>
          <DashboardCard className="px-5 py-4">
            <p className="text-sm font-bold uppercase text-on-surface-variant">Menunggu Review</p>
            <p className="mt-2 text-2xl font-extrabold text-on-surface">
              {isLoading ? "-" : (summary?.screening_menunggu_review ?? 0)}
            </p>
          </DashboardCard>
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[18px] font-extrabold text-[#6f5794]">Pendaftaran Terbaru</h2>
              <p className="mt-1 text-[15px] text-on-surface-variant">
                Data psikolog terbaru dari tabel pendaftaran.
              </p>
            </div>
            <Link
              href="/admin/pendaftaran"
              className="inline-flex items-center gap-1 text-[15px] font-extrabold text-primary transition-colors hover:text-primary-container"
            >
              Lihat Semua
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <DashboardTable>
            <table className="w-full min-w-[920px] border-collapse">
              <DashboardTableHeader>
                <tr>
                  <DashboardTableCell as="th">Pendaftar</DashboardTableCell>
                  <DashboardTableCell as="th">Dokumen</DashboardTableCell>
                  <DashboardTableCell as="th">Tanggal Daftar</DashboardTableCell>
                  <DashboardTableCell as="th">Status</DashboardTableCell>
                  <DashboardTableCell as="th">Aksi</DashboardTableCell>
                </tr>
              </DashboardTableHeader>
              <tbody>
                {isLoading ? (
                  <tr className="bg-white">
                    <DashboardTableCell className="text-on-surface-variant" colSpan={5}>
                      Memuat data dashboard...
                    </DashboardTableCell>
                  </tr>
                ) : latestRegistrations.length > 0 ? (
                  latestRegistrations.map((item) => (
                    <tr key={item.id_psikolog} className="bg-white">
                      <DashboardTableCell>
                        <div>
                          <p className="font-extrabold text-on-surface">{item.nama_lengkap}</p>
                          <p className="text-sm text-on-surface-variant">{item.email ?? "-"}</p>
                        </div>
                      </DashboardTableCell>
                      <DashboardTableCell className="text-on-surface-variant">
                        <div className="space-y-1">
                          <p className="font-mono text-sm text-primary">STR: {item.no_str ?? "Belum terisi"}</p>
                          <p className="font-mono text-sm">SIP: {item.no_sip ?? "Belum terisi"}</p>
                        </div>
                      </DashboardTableCell>
                      <DashboardTableCell className="text-on-surface-variant">
                        {formatDate(item.dibuat_pada)}
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <StatusBadge tone={psikologStatusTone(item.status_akun)}>
                          {psikologStatusLabel(item.status_akun)}
                        </StatusBadge>
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <Link
                          href={`/admin/pendaftaran/detail?id=${item.id_psikolog}`}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-5 text-sm font-extrabold text-primary transition hover:bg-primary-container/10"
                        >
                          Detail
                        </Link>
                      </DashboardTableCell>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white">
                    <DashboardTableCell className="text-on-surface-variant" colSpan={5}>
                      Belum ada pendaftaran psikolog.
                    </DashboardTableCell>
                  </tr>
                )}
              </tbody>
            </table>
          </DashboardTable>
        </section>
      </div>
    </DashboardLayout>
  );
}
