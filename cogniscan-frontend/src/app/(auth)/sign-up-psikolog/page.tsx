"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  ArrowRight,
  CircleUserRound,
  FileText,
  UploadCloud,
  X,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, PhoneField } from "@/components/auth/fields";

const MB = 1024 * 1024;

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

type UploadBoxProps = {
  label: string;
  note: string;
  accept: string;
  maxSizeMB: number;
  file: File | null;
  error?: string;
  onChange: (file: File | null) => void;
  onError: (msg: string | undefined) => void;
};

function UploadBox({
  label,
  note,
  accept,
  maxSizeMB,
  file,
  error,
  onChange,
  onError,
}: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const acceptedMimes = accept.split(",").map((s) => s.trim());
  const shortLabel = label.split(" ")[0];

  const validate = (f: File): string | null => {
    if (f.size > maxSizeMB * MB) {
      return `Ukuran melebihi ${maxSizeMB}MB`;
    }
    const ok = acceptedMimes.some((mime) => {
      if (mime.startsWith(".")) return f.name.toLowerCase().endsWith(mime);
      if (mime.endsWith("/*")) return f.type.startsWith(mime.slice(0, -1));
      return f.type === mime;
    });
    if (!ok) return "Format file tidak didukung";
    return null;
  };

  const handlePick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    const err = validate(f);
    if (err) {
      onError(err);
      onChange(null);
      e.target.value = "";
      return;
    }
    onError(undefined);
    onChange(f);
  };

  const handleRemove = () => {
    onChange(null);
    onError(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  const sizeKb = file ? (file.size / 1024).toFixed(0) : null;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-[15px] font-semibold text-[#343832]"
      >
        {label}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        onChange={handlePick}
        className="sr-only"
      />

      {file ? (
        <div className="flex h-14 items-center justify-between rounded-[10px] border border-[#4b8a50] bg-[#c9f0c3] px-4 text-primary">
          <span className="inline-flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate font-medium">{file.name}</span>
              {sizeKb ? (
                <span className="block text-xs text-on-surface-variant">
                  {Number(sizeKb) > 1024
                    ? `${(file.size / MB).toFixed(2)} MB`
                    : `${sizeKb} KB`}
                </span>
              ) : null}
            </span>
          </span>
          <button
            type="button"
            onClick={handleRemove}
            aria-label={`Hapus ${label}`}
            className="rounded-full p-1 transition hover:bg-primary/10"
          >
            <X className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex h-[136px] w-full flex-col items-center justify-center rounded-[12px] border-2 border-dashed bg-[#fbfbf7] text-center text-primary transition hover:bg-primary-container/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/20 ${
            error ? "border-[#d13a31]" : "border-primary-container"
          }`}
        >
          <UploadCloud className="mb-3 h-8 w-8" aria-hidden="true" />
          <span className="text-[15px] font-medium">
            Klik untuk unggah {shortLabel}
          </span>
          <span className="mt-1 text-xs text-on-surface-variant">{note}</span>
        </button>
      )}

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-[#a3372e]">{error}</p>
      ) : null}
    </div>
  );
}

export default function SignUpPsikologPage() {
  const [sip, setSip] = useState<File | null>(null);
  const [ktp, setKtp] = useState<File | null>(null);
  const [ijazah, setIjazah] = useState<File | null>(null);
  const [sipError, setSipError] = useState<string | undefined>();
  const [ktpError, setKtpError] = useState<string | undefined>();
  const [ijazahError, setIjazahError] = useState<string | undefined>();

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
                accept="application/pdf,.pdf"
                maxSizeMB={10}
                file={sip}
                error={sipError}
                onChange={setSip}
                onError={setSipError}
              />
              <UploadBox
                label="Kartu Tanda Penduduk (KTP)"
                note="Format: JPG, PNG (Max 5MB)"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                maxSizeMB={5}
                file={ktp}
                error={ktpError}
                onChange={setKtp}
                onError={setKtpError}
              />
              <UploadBox
                label="Ijazah Terakhir"
                note="Format: PDF (Max 10MB)"
                accept="application/pdf,.pdf"
                maxSizeMB={10}
                file={ijazah}
                error={ijazahError}
                onChange={setIjazah}
                onError={setIjazahError}
              />
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
