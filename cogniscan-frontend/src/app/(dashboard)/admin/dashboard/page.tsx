"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardClock, ShieldCheck, UserPlus } from "lucide-react";
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
  fetchAdminPsikolog,
  psikologStatusLabel,
  psikologStatusTone,
  type AdminPsikolog,
} from "@/lib/admin";
import { supabase } from "@/lib/supabase/client";

export default function AdminDashboardPage() {
  const [registrations, setRegistrations] = useState<AdminPsikolog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRegistrations() {
      setIsLoading(true);
      setError("");

      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        if (!accessToken) {
          throw new Error("Sesi admin tidak ditemukan. Silakan login ulang.");
        }

        const result = await fetchAdminPsikolog(accessToken, "semua");
        if (isMounted) setRegistrations(result);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat data pendaftaran.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRegistrations();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const pending = registrations.filter((item) => item.status_akun === "pending").length;
    const approved = registrations.filter((item) => item.status_akun === "terverifikasi").length;

    return {
      total: registrations.length,
      pending,
      approved,
    };
  }, [registrations]);

  const latestRegistrations = registrations.slice(0, 5);

  return (
    <DashboardLayout
      navItems={getAdminNav("dashboard")}
      user={adminUser}
      contentClassName="px-6 md:px-10 lg:px-10 xl:px-10"
    >
      <div className="w-full max-w-none">
        <header className="mb-8">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-on-surface">
              Selamat Datang, Admin
            </h1>
            <p className="mt-1 text-[16px] text-on-surface-variant">
              Berikut ringkasan pendaftaran psikolog masuk.
            </p>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-[12px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mb-8 grid gap-6 lg:grid-cols-3">
          <DashboardCard className="flex min-h-[114px] items-center justify-between px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-[#6f5794]">
                <UserPlus className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="max-w-[120px] text-[16px] font-extrabold uppercase leading-6 text-on-surface-variant">
                Total Pendaftaran
              </p>
            </div>
            <p className="text-[42px] font-extrabold leading-none text-[#6f5794]">
              {isLoading ? "-" : summary.total}
            </p>
          </DashboardCard>

          <DashboardCard className="flex min-h-[114px] items-center justify-between px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-container text-[#d37300]">
                <ClipboardClock className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="max-w-[140px] text-[16px] font-extrabold uppercase leading-6 text-on-surface-variant">
                Belum Disetujui
              </p>
            </div>
            <p className="text-[42px] font-extrabold leading-none text-[#d37300]">
              {isLoading ? "-" : summary.pending}
            </p>
          </DashboardCard>

          <DashboardCard className="flex min-h-[114px] items-center justify-between px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfeadf] text-primary">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="max-w-[150px] text-[16px] font-extrabold uppercase leading-6 text-on-surface-variant">
                Sudah Diverifikasi
              </p>
            </div>
            <p className="text-[42px] font-extrabold leading-none text-primary">
              {isLoading ? "-" : summary.approved}
            </p>
          </DashboardCard>
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[18px] font-extrabold text-[#6f5794]">
                Pendaftaran Masuk Terbaru
              </h2>
              <p className="mt-1 text-[15px] text-on-surface-variant">
                Psikolog yang baru mendaftar dan menunggu verifikasi.
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
            <table className="w-full min-w-[760px] border-collapse">
              <DashboardTableHeader>
                <tr>
                  <DashboardTableCell as="th">Pendaftar</DashboardTableCell>
                  <DashboardTableCell as="th">Spesialisasi</DashboardTableCell>
                  <DashboardTableCell as="th">Status</DashboardTableCell>
                </tr>
              </DashboardTableHeader>
              <tbody>
                {isLoading ? (
                  <tr className="bg-white">
                    <DashboardTableCell className="text-on-surface-variant" colSpan={3}>
                      Memuat data pendaftaran...
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
                        {item.spesialisasi ?? "-"}
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <StatusBadge tone={psikologStatusTone(item.status_akun)}>
                          {psikologStatusLabel(item.status_akun)}
                        </StatusBadge>
                      </DashboardTableCell>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white">
                    <DashboardTableCell className="text-on-surface-variant" colSpan={3}>
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
