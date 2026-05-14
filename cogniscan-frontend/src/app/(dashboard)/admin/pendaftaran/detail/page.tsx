import Link from "next/link";
import { FileText, X } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { adminUser, getAdminNav } from "@/components/admin";

const documents = [
  { name: "surat_izin_praktik.pdf", meta: "Uploaded 12 Mei 2026 • 2.4 MB" },
  { name: "ktp_fajar_ramadhan.pdf", meta: "Uploaded 12 Mei 2026 • 1.1 MB" },
  { name: "ijazah_pendidikan_profesi.pdf", meta: "Uploaded 12 Mei 2026 • 3.7 MB" },
];

export default function AdminRegistrationDetailPage() {
  return (
    <DashboardLayout
      navItems={getAdminNav("pendaftaran")}
      user={adminUser}
      contentClassName="relative lg:px-6 xl:px-6"
    >
      <div className="pointer-events-none max-w-[980px] opacity-25 blur-[2px]">
        <header className="mb-6">
          <h1 className="text-[22px] font-extrabold tracking-[-0.01em] text-[#8d5367]">
            Pendaftaran Masuk
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Daftar psikolog yang mengajukan pendaftaran dan menunggu verifikasi dokumen.
          </p>
        </header>
        <div className="h-[620px] rounded-[14px] bg-white shadow-[0_20px_40px_-30px_rgba(27,28,26,0.35)]" />
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 px-5 py-10">
        <section className="w-full max-w-[520px] overflow-hidden rounded-[16px] bg-white shadow-[0_30px_70px_-30px_rgba(27,28,26,0.55)]">
          <div className="h-2 bg-primary" />
          <div className="px-6 pb-8 pt-6">
            <header className="mb-7 flex items-center justify-between">
              <h1 className="text-[22px] font-medium text-[#8d5367]">Detail Pendaftaran</h1>
              <Link
                href="/admin/pendaftaran"
                aria-label="Tutup detail pendaftaran"
                className="rounded-md p-1 text-on-surface transition hover:bg-surface-container"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Link>
            </header>

            <section className="rounded-[10px] bg-surface-container px-6 py-4">
              <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-on-surface-variant">Nama Lengkap:</dt>
                <dd className="font-extrabold text-on-surface">Dr. Fajar Ramadhan</dd>
                <dt className="text-on-surface-variant">Username:</dt>
                <dd className="font-mono font-extrabold text-primary">dr.fajar</dd>
                <dt className="text-on-surface-variant">Email:</dt>
                <dd className="text-on-surface">fajar.r@email.com</dd>
                <dt className="text-on-surface-variant">No. HP:</dt>
                <dd className="text-on-surface">+62 812-3456-7890</dd>
              </dl>
            </section>

            <section className="mt-7">
              <h2 className="mb-4 text-sm font-medium uppercase text-[#8d5367]">
                Verifikasi Dokumen
              </h2>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <article
                    key={doc.name}
                    className="flex items-center justify-between gap-4 rounded-[10px] border border-outline-variant px-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#fff0f0] text-red-600">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-extrabold text-on-surface">{doc.name}</h3>
                        <p className="mt-1 text-xs text-on-surface-muted">{doc.meta}</p>
                      </div>
                    </div>
                    <button type="button" className="text-sm font-extrabold text-primary hover:text-primary-container">
                      Lihat
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <footer className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-full border border-red-600 px-8 text-[15px] font-extrabold text-red-600 transition hover:bg-red-50"
              >
                Tolak
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-[15px] font-extrabold text-white shadow-[0_16px_26px_-18px_rgba(65,87,62,0.75)] transition hover:bg-[#365f39]"
              >
                Setujui Pendaftaran
              </button>
            </footer>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

