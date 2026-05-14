import Link from "next/link";
import { ArrowRight, CircleUserRound, FileText, UploadCloud, X } from "lucide-react";
import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, PhoneField } from "@/components/auth/fields";

function SectionTitle({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <h2 className="mb-8 flex items-center gap-3 text-sm font-extrabold uppercase tracking-[0.08em] text-[#8d5367]">
      {icon}
      {children}
    </h2>
  );
}

function UploadBox({
  label,
  note,
  uploaded,
}: {
  label: string;
  note: string;
  uploaded?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[15px] font-semibold text-[#343832]">{label}</p>
      {uploaded ? (
        <div className="flex h-14 items-center justify-between rounded-[10px] border border-[#4b8a50] bg-[#c9f0c3] px-4 text-primary">
          <span className="inline-flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate font-medium">{uploaded}</span>
          </span>
          <X className="h-5 w-5 shrink-0" aria-hidden="true" />
        </div>
      ) : (
        <button
          type="button"
          className="flex h-[136px] w-full flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-primary-container bg-[#fbfbf7] text-center text-primary transition hover:bg-primary-container/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/20"
        >
          <UploadCloud className="mb-3 h-8 w-8" aria-hidden="true" />
          <span className="text-[15px] font-medium">Klik untuk unggah {label.split(" ")[0]}</span>
          <span className="mt-1 text-xs text-on-surface-variant">{note}</span>
        </button>
      )}
    </div>
  );
}

export default function SignUpPsikologPage() {
  return (
    <AuthShell className="max-w-[900px] before:hidden">
      <form className="px-9 py-10 sm:px-12">
        <div className="mb-16 text-center">
          <h1 className="text-2xl font-extrabold tracking-[-0.01em] text-[#8d5367]">
            Registrasi Psikolog
          </h1>
          <p className="mx-auto mt-3 max-w-[560px] text-[16px] leading-7 text-on-surface-variant">
            Lengkapi data diri dan dokumen resmi kamu untuk bergabung sebagai psikolog di
            CogniScan.
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          <section>
            <SectionTitle icon={<CircleUserRound className="h-5 w-5" aria-hidden="true" />}>
              Informasi Akun
            </SectionTitle>
            <div className="space-y-5">
              <Field label="Nama Lengkap" placeholder="Dr. Sarah Alika, M.Psi" />
              <Field
                label="Username"
                placeholder="sarahalika_psy"
                helper="Gunakan username unik untuk profil publik kamu."
              />
              <Field label="Email" placeholder="sarah.alika@email.com" type="email" icon="mail" />
              <PhoneField muted />
            </div>
          </section>

          <section>
            <SectionTitle icon={<FileText className="h-5 w-5" aria-hidden="true" />}>
              Unggah Dokumen Resmi
            </SectionTitle>
            <div className="space-y-5">
              <UploadBox
                label="Surat Izin Praktik (SIP)"
                note="Format: PDF (Max 10MB)"
                uploaded="surat_izin_praktik.pdf"
              />
              <UploadBox label="Kartu Tanda Penduduk (KTP)" note="Format: JPG, PNG (Max 5MB)" />
              <UploadBox label="Ijazah Terakhir" note="Format: PDF (Max 10MB)" />
            </div>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 border-t border-outline-variant pt-6">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-primary px-7 font-medium text-primary transition hover:bg-primary/5"
          >
            Batal
          </Link>
          <Link
            href="/registration-success"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary-container px-7 font-semibold text-white shadow-[0_15px_25px_-17px_rgba(65,87,62,0.65)] transition hover:-translate-y-0.5 hover:bg-[#789477]"
          >
            Daftar Sekarang
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
