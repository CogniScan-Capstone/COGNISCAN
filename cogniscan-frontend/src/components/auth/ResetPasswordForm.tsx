"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PrimaryAuthButton } from "@/components/auth/fields";
import LoadingPage from "@/components/loading/page";
import { cn } from "@/lib/utils";

type ResetPasswordFormProps = {
  onSubmitPassword: (password: string) => Promise<void>;
  minLength?: number;
};

function passwordHasSymbol(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

function PasswordInput({
  ariaLabel,
  autoComplete,
  placeholder,
  value,
  onChange,
}: {
  ariaLabel: string;
  autoComplete: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="relative block">
      <span className="sr-only">{ariaLabel}</span>
      <LockKeyhole
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary"
        aria-hidden="true"
      />
      <input
        autoComplete={autoComplete}
        className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-12 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        type={showPassword ? "text" : "password"}
        value={value}
      />
      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4f584d] transition hover:text-[#343832]"
        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
      >
        {showPassword ? (
          <EyeOff className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Eye className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </label>
  );
}

export function ResetPasswordForm({
  onSubmitPassword,
  minLength = 12,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checks = useMemo(
    () => [
      {
        label: `Minimal ${minLength} Karakter`,
        valid: password.trim().length >= minLength,
      },
      { label: "Huruf Kapital (A-Z)", valid: /[A-Z]/.test(password) },
      { label: "Angka (0-9)", valid: /\d/.test(password) },
      { label: "Simbol (@, #, $)", valid: passwordHasSymbol(password) },
    ],
    [minLength, password],
  );
  const passedChecks = checks.filter((check) => check.valid).length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const nextPassword = password.trim();
    if (checks.some((check) => !check.valid)) {
      setErrorMessage("Password baru belum memenuhi semua syarat keamanan.");
      return;
    }

    if (nextPassword !== confirmPassword.trim()) {
      setErrorMessage("Konfirmasi password belum sama.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitPassword(nextPassword);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Password baru gagal disimpan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {isSubmitting ? <LoadingPage text="Menyimpan password..." /> : null}
      <AuthShell compact className="max-w-[450px]">
        <form className="px-8 pb-9 pt-7 sm:px-8" onSubmit={handleSubmit}>
          <h1 className="mb-8 text-center text-2xl font-extrabold tracking-[-0.01em] text-[#8d5367]">
            Buat Password Baru
          </h1>

          <div className="space-y-4">
            <PasswordInput
              ariaLabel="Password baru"
              autoComplete="new-password"
              placeholder="Masukkan password baru"
              value={password}
              onChange={setPassword}
            />
            <PasswordInput
              ariaLabel="Konfirmasi password baru"
              autoComplete="new-password"
              placeholder="Konfirmasi password baru"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition",
                  index < passedChecks ? "bg-primary" : "bg-outline-variant",
                )}
              />
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {checks.map((check) => (
              <p
                key={check.label}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  check.valid ? "text-on-surface-variant" : "text-on-surface-muted",
                )}
              >
                <CheckCircle2
                  className={cn(
                    "h-4 w-4",
                    check.valid ? "fill-primary text-white" : "text-outline-variant",
                  )}
                  aria-hidden="true"
                />
                {check.label}
              </p>
            ))}
          </div>

          {errorMessage ? (
            <p className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <PrimaryAuthButton className="mt-8 text-base" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan Password Baru"}
          </PrimaryAuthButton>
          <p className="mx-auto mt-5 max-w-[310px] text-center text-xs leading-5 text-on-surface-variant">
            Kamu akan otomatis diarahkan ke dashboard setelah password berhasil disimpan.
          </p>
        </form>
      </AuthShell>
    </>
  );
}
