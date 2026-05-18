"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  DashboardLayout,
  DashboardTable,
  DashboardTableCell,
  DashboardTableHeader,
  FilterTabs,
  StatusBadge,
} from "@/components/dashboard";
import { adminUser, getAdminNav } from "@/components/admin";
import {
  fetchAdminPsikolog,
  psikologInitials,
  psikologStatusLabel,
  psikologStatusTone,
  type AdminPsikolog,
  type AdminPsikologFilter,
} from "@/lib/admin";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

const filters: Array<{ label: string; value: AdminPsikologFilter }> = [
  { label: "Semua", value: "semua" },
  { label: "Menunggu", value: "pending" },
  { label: "Disetujui", value: "terverifikasi" },
  { label: "Ditolak", value: "ditolak" },
];

function matchesSearch(item: AdminPsikolog, query: string) {
  if (!query) return true;

  const haystack = [
    item.nama_lengkap,
    item.email,
    item.nomor_hp,
    item.spesialisasi,
    item.no_str,
    item.no_sip,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export default function AdminRegistrationPage() {
  const [registrants, setRegistrants] = useState<AdminPsikolog[]>([]);
  const [activeFilter, setActiveFilter] = useState<AdminPsikologFilter>("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRegistrants() {
      setIsLoading(true);
      setError("");

      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        if (!accessToken) {
          throw new Error("Sesi admin tidak ditemukan. Silakan login ulang.");
        }

        const result = await fetchAdminPsikolog(accessToken, "semua");
        if (isMounted) setRegistrants(result);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat pendaftaran psikolog.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRegistrants();

    return () => {
      isMounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    return {
      semua: registrants.length,
      pending: registrants.filter((item) => item.status_akun === "pending").length,
      terverifikasi: registrants.filter((item) => item.status_akun === "terverifikasi").length,
      ditolak: registrants.filter((item) => item.status_akun === "ditolak").length,
    };
  }, [registrants]);

  const filteredRegistrants = useMemo(() => {
    return registrants.filter((item) => {
      const statusMatches = activeFilter === "semua" || item.status_akun === activeFilter;
      return statusMatches && matchesSearch(item, searchQuery.trim());
    });
  }, [activeFilter, registrants, searchQuery]);

  return (
    <DashboardLayout
      navItems={getAdminNav("pendaftaran")}
      user={adminUser}
      contentClassName="px-6 md:px-10 lg:px-10 xl:px-10"
    >
      <div className="w-full max-w-none">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-[-0.01em] text-[#8d5367]">
              Pendaftaran Masuk
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Daftar psikolog yang mengajukan pendaftaran dan menunggu verifikasi dokumen.
            </p>
          </div>
          <span className="inline-flex h-8 items-center justify-center rounded-full bg-[#eadfe4] px-5 text-sm font-extrabold text-[#8d5367]">
            {isLoading ? "Memuat..." : `${counts.semua} Total Pendaftar`}
          </span>
        </header>

        {error ? (
          <div className="mb-6 rounded-[12px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mb-6 rounded-[14px] bg-white px-5 py-4 shadow-[0_20px_40px_-30px_rgba(27,28,26,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block lg:w-[300px]">
              <span className="sr-only">Cari pendaftar</span>
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-muted" aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari pendaftar..."
                className="h-12 w-full rounded-full bg-surface-container px-5 pl-12 text-[15px] outline-none placeholder:text-on-surface-muted focus:ring-4 focus:ring-primary-container/15"
              />
            </label>

            <FilterTabs
              tabs={filters.map((filter) => ({
                label: filter.label,
                count: counts[filter.value],
                active: activeFilter === filter.value,
                onClick: () => setActiveFilter(filter.value),
              }))}
              className="lg:justify-end"
            />
          </div>
        </section>

        <DashboardTable>
          <table className="w-full min-w-[1040px] border-collapse">
            <DashboardTableHeader>
              <tr>
                <DashboardTableCell as="th">No</DashboardTableCell>
                <DashboardTableCell as="th">Pendaftar</DashboardTableCell>
                <DashboardTableCell as="th">Email</DashboardTableCell>
                <DashboardTableCell as="th">Spesialisasi</DashboardTableCell>
                <DashboardTableCell as="th">No. STR</DashboardTableCell>
                <DashboardTableCell as="th">Status</DashboardTableCell>
                <DashboardTableCell as="th">Aksi</DashboardTableCell>
              </tr>
            </DashboardTableHeader>
            <tbody>
              {isLoading ? (
                <tr className="bg-white">
                  <DashboardTableCell className="text-on-surface-variant" colSpan={7}>
                    Memuat data pendaftaran...
                  </DashboardTableCell>
                </tr>
              ) : filteredRegistrants.length > 0 ? (
                filteredRegistrants.map((item, index) => (
                  <tr key={item.id_psikolog} className="bg-white">
                    <DashboardTableCell>{index + 1}</DashboardTableCell>
                    <DashboardTableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed-dim text-sm font-bold text-primary">
                          {psikologInitials(item.nama_lengkap) || "PS"}
                        </div>
                        <p className="max-w-[180px] font-extrabold leading-5 text-on-surface">
                          {item.nama_lengkap}
                        </p>
                      </div>
                    </DashboardTableCell>
                    <DashboardTableCell className="text-on-surface-variant">{item.email ?? "-"}</DashboardTableCell>
                    <DashboardTableCell className="text-on-surface-variant">{item.spesialisasi ?? "-"}</DashboardTableCell>
                    <DashboardTableCell className="font-mono text-primary">{item.no_str ?? "-"}</DashboardTableCell>
                    <DashboardTableCell>
                      <StatusBadge tone={psikologStatusTone(item.status_akun)}>
                        {psikologStatusLabel(item.status_akun)}
                      </StatusBadge>
                    </DashboardTableCell>
                    <DashboardTableCell>
                      <Link
                        href={`/admin/pendaftaran/detail?id=${item.id_psikolog}`}
                        className={cn(
                          "inline-flex h-9 items-center justify-center rounded-full px-5 text-sm font-extrabold transition",
                          item.status_akun === "pending"
                            ? "bg-primary text-white hover:bg-[#365f39]"
                            : "border border-primary text-primary hover:bg-primary-container/10",
                        )}
                      >
                        Detail
                      </Link>
                    </DashboardTableCell>
                  </tr>
                ))
              ) : (
                <tr className="bg-white">
                  <DashboardTableCell className="text-on-surface-variant" colSpan={7}>
                    Tidak ada pendaftaran yang sesuai dengan filter.
                  </DashboardTableCell>
                </tr>
              )}
            </tbody>
          </table>
        </DashboardTable>
      </div>
    </DashboardLayout>
  );
}
