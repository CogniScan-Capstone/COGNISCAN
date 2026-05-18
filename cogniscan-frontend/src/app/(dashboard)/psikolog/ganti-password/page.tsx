"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLogo, AuthShell } from "@/components/auth/AuthShell";
import { Field, PrimaryAuthButton } from "@/components/auth/fields";
import LoadingPage from "@/components/loading/page";
import { changeTemporaryPassword } from "@/lib/auth";
import { waitForMinimumLoading } from "@/lib/loadingDelay";
import { supabase } from "@/lib/supabase/client";

export default function PsikologChangeTemporaryPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const password = newPassword.trim();
    if (password.length < 12) {
      setErrorMessage("Password baru minimal 12 karakter.");
      return;
    }

    if (password !== confirmPassword.trim()) {
      setErrorMessage("Konfirmasi password belum sama.");
      return;
    }

    setIsSubmitting(true);
    const loadingStartedAt = Date.now();

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk ulang.");
      }

      await changeTemporaryPassword(accessToken, password);
      await waitForMinimumLoading(loadingStartedAt);
      router.replace("/psikolog/dashboard");
      router.refresh();
    } catch (error) {
      await waitForMinimumLoading(loadingStartedAt);
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
      <AuthShell compact className="max-w-[460px]">
        <form className="px-8 pb-9 pt-8 sm:px-10" onSubmit={handleSubmit}>
          <div className="mb-8 text-center">
            <AuthLogo />
            <h1 className="mt-8 text-2xl font-extrabold tracking-[-0.01em] text-[#8d5367]">
              Ganti Password
            </h1>
            <p className="mx-auto mt-3 max-w-[330px] text-sm leading-6 text-on-surface-variant">
              Password dari email hanya bersifat sementara. Buat password baru
              sebelum masuk ke dashboard psikolog.
            </p>
          </div>

          <div className="space-y-5">
            <Field
              label="Password Baru"
              placeholder="Minimal 12 karakter"
              type="password"
              icon="lock"
              showEye
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <Field
              label="Ulangi Password Baru"
              placeholder="Ketik ulang password"
              type="password"
              icon="lock"
              showEye
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          {errorMessage ? (
            <p className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <PrimaryAuthButton className="mt-7 text-base" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan Password Baru"}
          </PrimaryAuthButton>
        </form>
      </AuthShell>
    </>
  );
}
