import Link from "next/link";
import { Search } from "lucide-react";
import {
  DashboardLayout,
  DashboardTable,
  DashboardTableCell,
  DashboardTableHeader,
  FilterTabs,
  Pagination,
  StatusBadge,
} from "@/components/dashboard";
import { adminUser, getAdminNav } from "@/components/admin";

const registrants = [
  {
    no: 1,
    name: "Dr. Fajar Ramadhan",
    email: "fajar.ramadhan@email.com",
    username: "dr.fajar",
    date: "12 Mei 2026",
    status: "Menunggu",
    avatar: "FR",
    photo: true,
  },
  {
    no: 2,
    name: "Dr. Lestari Ningrum",
    email: "lestari.n@email.com",
    username: "dr.lestari",
    date: "11 Mei 2026",
    status: "Menunggu",
    avatar: "LN",
    photo: true,
  },
  {
    no: 3,
    name: "Dr. Hendra Kusuma",
    email: "hendra.k@email.com",
    username: "dr.hendra",
    date: "10 Mei 2026",
    status: "Disetujui",
    avatar: "HK",
  },
  {
    no: 4,
    name: "Dr. Putri Maharani",
    email: "putri.m@email.com",
    username: "dr.putri",
    date: "09 Mei 2026",
    status: "Ditolak",
    avatar: "PM",
  },
  {
    no: 5,
    name: "Dr. Yoga Pratama",
    email: "yoga.p@email.com",
    username: "dr.yoga",
    date: "09 Mei 2026",
    status: "Menunggu",
    avatar: "YP",
  },
  {
    no: 6,
    name: "Dr. Citra Dewi",
    email: "citra.d@email.com",
    username: "dr.citra",
    date: "08 Mei 2026",
    status: "Menunggu",
    avatar: "CD",
  },
  {
    no: 7,
    name: "Dr. Bima Sakti",
    email: "bima.s@email.com",
    username: "dr.bima",
    date: "08 Mei 2026",
    status: "Disetujui",
    avatar: "BS",
  },
  {
    no: 8,
    name: "Dr. Nadia Putri",
    email: "nadia.p@email.com",
    username: "dr.nadia",
    date: "07 Mei 2026",
    status: "Menunggu",
    avatar: "NP",
  },
];

function statusTone(status: string) {
  if (status === "Disetujui") return "success";
  if (status === "Ditolak") return "danger";
  return "warning";
}

export default function AdminRegistrationPage() {
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
            24 Total Pendaftar
          </span>
        </header>

        <section className="mb-6 rounded-[14px] bg-white px-5 py-4 shadow-[0_20px_40px_-30px_rgba(27,28,26,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block lg:w-[300px]">
              <span className="sr-only">Cari pendaftar</span>
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-muted" aria-hidden="true" />
              <input
                placeholder="Cari pendaftar..."
                className="h-12 w-full rounded-full bg-surface-container px-5 pl-12 text-[15px] outline-none placeholder:text-on-surface-muted focus:ring-4 focus:ring-primary-container/15"
              />
            </label>

            <FilterTabs
              tabs={[
                { label: "Semua", count: 24, active: true },
                { label: "Menunggu", count: 8 },
                { label: "Disetujui", count: 14 },
                { label: "Ditolak", count: 2 },
              ]}
              className="lg:justify-end"
            />
          </div>
        </section>

        <DashboardTable>
          <table className="w-full min-w-[1120px] border-collapse">
            <DashboardTableHeader>
              <tr>
                <DashboardTableCell as="th">No</DashboardTableCell>
                <DashboardTableCell as="th">Pendaftar</DashboardTableCell>
                <DashboardTableCell as="th">Email</DashboardTableCell>
                <DashboardTableCell as="th">Username</DashboardTableCell>
                <DashboardTableCell as="th">Tgl Daftar</DashboardTableCell>
                <DashboardTableCell as="th">Status</DashboardTableCell>
                <DashboardTableCell as="th">Aksi</DashboardTableCell>
              </tr>
            </DashboardTableHeader>
            <tbody>
              {registrants.map((item) => (
                <tr key={item.no} className="bg-white">
                  <DashboardTableCell>{item.no}</DashboardTableCell>
                  <DashboardTableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed-dim text-sm font-bold text-primary">
                        {item.avatar}
                      </div>
                      <p className="max-w-[130px] font-extrabold leading-5 text-on-surface">{item.name}</p>
                    </div>
                  </DashboardTableCell>
                  <DashboardTableCell className="text-on-surface-variant">{item.email}</DashboardTableCell>
                  <DashboardTableCell className="font-mono text-primary">{item.username}</DashboardTableCell>
                  <DashboardTableCell className="text-on-surface-variant">{item.date}</DashboardTableCell>
                  <DashboardTableCell>
                    <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <Link
                      href="/admin/pendaftaran/detail"
                      className={`inline-flex h-9 items-center justify-center rounded-full px-5 text-sm font-extrabold transition ${
                        item.no === 1
                          ? "bg-primary text-white hover:bg-[#365f39]"
                          : "border border-primary text-primary hover:bg-primary-container/10"
                      }`}
                    >
                      Detail
                    </Link>
                  </DashboardTableCell>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-4">
            <Pagination currentPage={1} totalPages={3} />
          </div>
        </DashboardTable>
      </div>
    </DashboardLayout>
  );
}
