import Link from "next/link";
import { ArrowRight, ClipboardClock, ShieldCheck, UserPlus } from "lucide-react";
import {
  DashboardCard,
  DashboardLayout,
  DashboardTable,
  DashboardTableCell,
  DashboardTableHeader,
  Pagination,
  StatusBadge,
} from "@/components/dashboard";
import { adminUser, getAdminNav } from "@/components/admin";

const registrations = [
  { name: "Dr. Fajar Ramadhan", email: "fajar@email.com", date: "12 Mei 2026", status: "Menunggu" },
  { name: "Dr. Lestari Ningrum", email: "lestari@email.com", date: "11 Mei 2026", status: "Menunggu" },
  { name: "Dr. Hendra Kusuma", email: "hendra@email.com", date: "10 Mei 2026", status: "Disetujui" },
  { name: "Dr. Putri Maharani", email: "putri@email.com", date: "09 Mei 2026", status: "Ditolak" },
  { name: "Dr. Yoga Pratama", email: "yoga@email.com", date: "08 Mei 2026", status: "Menunggu" },
];

function statusTone(status: string) {
  if (status === "Disetujui") return "success";
  if (status === "Ditolak") return "danger";
  return "warning";
}

export default function AdminDashboardPage() {
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
            <p className="text-[42px] font-extrabold leading-none text-[#6f5794]">24</p>
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
            <p className="text-[42px] font-extrabold leading-none text-[#d37300]">8</p>
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
            <p className="text-[42px] font-extrabold leading-none text-primary">16</p>
          </DashboardCard>
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[18px] font-extrabold text-[#6f5794]">
                Pendaftaran Masuk Terbaru
              </h2>
              <p className="mt-1 text-[15px] text-on-surface-variant">
                Psikolog yang baru mendaftar and waiting for verification.
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
                  <DashboardTableCell as="th">Tanggal Daftar</DashboardTableCell>
                  <DashboardTableCell as="th">Status</DashboardTableCell>
                </tr>
              </DashboardTableHeader>
              <tbody>
                {registrations.map((item) => (
                  <tr key={item.email} className="bg-white">
                    <DashboardTableCell>
                      <div>
                        <p className="font-extrabold text-on-surface">{item.name}</p>
                        <p className="text-sm text-on-surface-variant">{item.email}</p>
                      </div>
                    </DashboardTableCell>
                    <DashboardTableCell className="text-on-surface-variant">{item.date}</DashboardTableCell>
                    <DashboardTableCell>
                      <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>
                    </DashboardTableCell>
                </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4">
              <Pagination currentPage={1} totalPages={3} />
            </div>
          </DashboardTable>
        </section>
      </div>
    </DashboardLayout>
  );
}
