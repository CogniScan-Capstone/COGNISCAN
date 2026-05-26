"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useId, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  ArrowRight,
  CircleUserRound,
  FileText,
  UploadCloud,
  X,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  Field,
  PhoneField,
  PrimaryAuthButton,
  TextAreaField,
} from "@/components/auth/fields";
import LoadingPage from "@/components/loading/page";
import { registerPsikologCandidate } from "@/lib/auth";

const MB = 1024 * 1024;

function normalizeIndonesianPhone(value: string) {
  const raw = value.trim();
  if (!raw) return undefined;

  const compact = raw.replace(/[\s().-]/g, "");
  if (!compact) return undefined;

  const digits = compact.startsWith("+") ? compact.slice(1) : compact;
  if (!/^\d{8,15}$/.test(digits)) return undefined;

  if (compact.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  if (digits.startsWith("62")) return `+${digits}`;
  return `+62${digits}`;
}

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
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nik, setNik] = useState("");
  const [practiceAddress, setPracticeAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [strNumber, setStrNumber] = useState("");
  const [sipNumber, setSipNumber] = useState("");
  const [strFile, setStrFile] = useState<File | null>(null);
  const [sipFile, setSipFile] = useState<File | null>(null);
  const [strError, setStrError] = useState<string | undefined>();
  const [sipError, setSipError] = useState<string | undefined>();
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizeIndonesianPhone(phone);
    const trimmedName = fullName.trim();
    const trimmedNik = nik.trim();
    const trimmedAddress = practiceAddress.trim();
    const trimmedCity = city.trim();
    const trimmedProvince = province.trim();
    const trimmedStr = strNumber.trim();
    const trimmedSip = sipNumber.trim();
    const parsedFee = Number(consultationFee);

    if (trimmedName.length < 3) {
      setFormError("Nama lengkap wajib diisi minimal 3 karakter.");
      return;
    }

    if (!normalizedEmail) {
      setFormError("Email wajib diisi.");
      return;
    }

    if (!normalizedPhone) {
      setFormError("Nomor WhatsApp wajib diisi dengan format angka yang valid.");
      return;
    }

    if (!/^\d{16}$/.test(trimmedNik)) {
      setFormError("NIK wajib terdiri dari 16 digit angka.");
      return;
    }

    if (!Number.isFinite(parsedFee) || parsedFee <= 0) {
      setFormError("Tarif konsultasi wajib diisi lebih dari 0.");
      return;
    }

    if (trimmedStr.length < 3 || trimmedSip.length < 3) {
      setFormError("Nomor STR dan SIP wajib diisi minimal 3 karakter.");
      return;
    }

    if (trimmedAddress.length < 5) {
      setFormError("Alamat praktik wajib diisi minimal 5 karakter.");
      return;
    }

    if (trimmedCity.length < 2 || trimmedProvince.length < 2) {
      setFormError("Kota dan provinsi wajib diisi.");
      return;
    }

    if (!strFile || !sipFile) {
      setFormError("Dokumen STR dan SIP wajib diunggah untuk proses verifikasi.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerPsikologCandidate({
        email: normalizedEmail,
        nama_lengkap: trimmedName,
        nomor_hp: normalizedPhone,
        nik: trimmedNik,
        alamat_praktik: trimmedAddress,
        kota: trimmedCity,
        provinsi: trimmedProvince,
        tarif_konsultasi: parsedFee,
        no_str: trimmedStr,
        no_sip: trimmedSip,
        upload_dokumen_str: strFile,
        upload_dokumen_sip: sipFile,
      });

      router.push("/registration-success");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Registrasi psikolog gagal diproses.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {isSubmitting ? <LoadingPage text="Mengirim pendaftaran..." /> : null}
      <AuthShell className="max-w-[960px] before:hidden">
      <form className="px-9 py-10 sm:px-12" onSubmit={handleSubmit}>
        <div className="mb-14 mt-5 text-center">
          <Link href="/" className="mb-4 inline-block">
            <Image
              src="/logo.png"
              alt="CogniScan Logo"
              width={120}
              height={50}
              priority
              className="h-auto w-auto"
            />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-[-0.01em] text-[#8d5367]">
            Registrasi Psikolog
          </h1>
          <p className="mx-auto mt-3 max-w-[600px] text-[16px] leading-7 text-on-surface-variant">
            Lengkapi data profesional dan dokumen resmi. Akun login akan dibuat
            setelah admin menyetujui pendaftaran.
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          <section>
            <SectionTitle
              icon={<CircleUserRound className="h-5 w-5" aria-hidden="true" />}
            >
              Informasi Profil
            </SectionTitle>
            <div className="space-y-5">
              <Field
                label="Nama Lengkap"
                placeholder="Dr. Sarah Alika, M.Psi"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
              <Field
                label="Nomor NIK"
                placeholder="16 digit NIK"
                value={nik}
                onChange={(event) => setNik(event.target.value.replace(/\D/g, "").slice(0, 16))}
                required
                minLength={16}
                maxLength={16}
              />
              <Field
                label="Email"
                placeholder="sarah.alika@email.com"
                type="email"
                icon="mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <PhoneField
                muted
                label="Nomor WhatsApp"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
              <Field
                label="Tarif Konsultasi"
                placeholder="150000"
                type="number"
                min="1"
                value={consultationFee}
                onChange={(event) => setConsultationFee(event.target.value)}
                required
              />
            </div>
          </section>

          <section>
            <SectionTitle
              icon={<FileText className="h-5 w-5" aria-hidden="true" />}
            >
              Legalitas dan Praktik
            </SectionTitle>
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nomor STR"
                  placeholder="STR-000123"
                  value={strNumber}
                  onChange={(event) => setStrNumber(event.target.value)}
                  required
                  minLength={3}
                />
                <Field
                  label="Nomor SIP"
                  placeholder="SIP-000123"
                  value={sipNumber}
                  onChange={(event) => setSipNumber(event.target.value)}
                  required
                  minLength={3}
                />
              </div>

              <TextAreaField
                label="Alamat Praktik"
                placeholder="Nama klinik, jalan, dan detail lokasi praktik..."
                rows={3}
                value={practiceAddress}
                onChange={(event) => setPracticeAddress(event.target.value)}
                required
                minLength={5}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Kota"
                  placeholder="Makassar"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                  minLength={2}
                />
                <Field
                  label="Provinsi"
                  placeholder="Sulawesi Selatan"
                  value={province}
                  onChange={(event) => setProvince(event.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <UploadBox
                label="Dokumen STR"
                note="Format: PDF (Max 10MB)"
                accept="application/pdf,.pdf"
                maxSizeMB={10}
                file={strFile}
                error={strError}
                onChange={setStrFile}
                onError={setStrError}
              />
              <UploadBox
                label="Dokumen SIP"
                note="Format: PDF (Max 10MB)"
                accept="application/pdf,.pdf"
                maxSizeMB={10}
                file={sipFile}
                error={sipError}
                onChange={setSipFile}
                onError={setSipError}
              />
            </div>
          </section>
        </div>

        {formError ? (
          <p className="mt-6 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-4 border-t border-outline-variant pt-6">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-primary px-7 font-medium text-primary transition hover:bg-primary/5"
          >
            Batal
          </Link>
          <PrimaryAuthButton
            className="h-12 w-auto gap-2 px-7 text-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Mengirim..." : "Daftar Sekarang"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </PrimaryAuthButton>
        </div>
      </form>
      </AuthShell>
    </>
  );
}
