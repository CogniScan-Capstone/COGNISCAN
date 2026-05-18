"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthLogo, AuthShell } from "@/components/auth/AuthShell";
import { PrimaryAuthButton } from "@/components/auth/fields";
import LoadingPage from "@/components/loading/page";
import {
  clearPendingPatientProfile,
  createPatientProfile,
  dashboardPathForRole,
  fetchPatientProfile,
  fetchCurrentUser,
  loadPendingPatientProfile,
  normalizeAuthEmail,
  updatePatientProfile,
  type BackendUser,
  type PatientProfilePayload,
} from "@/lib/auth";
import { waitForMinimumLoading } from "@/lib/loadingDelay";
import { supabase } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem("cogniscan:pending-confirmation-email") ?? "";
  });
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState(() => {
    if (typeof window === "undefined") return "";

    const message = window.sessionStorage.getItem("cogniscan:auth-info") ?? "";
    if (message) {
      window.sessionStorage.removeItem("cogniscan:auth-info");
    }
    return message;
  });
  const [resendMessage, setResendMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function ensurePatientProfile(
    accessToken: string,
    user: BackendUser,
    fallbackProfile: PatientProfilePayload | null,
  ) {
    if (user.peran !== "pasien") return user;

    try {
      const profile = await fetchPatientProfile(accessToken);
      const shouldPatch =
        fallbackProfile !== null &&
        (!profile.jenis_kelamin ||
          !profile.tanggal_lahir ||
          !profile.alamat_lengkap ||
          !profile.no_hp_wa);

      if (shouldPatch) {
        await updatePatientProfile(accessToken, fallbackProfile);
      }

      return user;
    } catch {
      if (!fallbackProfile) {
        throw new Error(
          "Akun pasien ditemukan, tetapi profil pasien belum ada di backend. Silakan daftar ulang dengan form pasien atau hubungi admin untuk sinkronisasi profil.",
        );
      }

      return createPatientProfile(accessToken, fallbackProfile);
    }
  }

  async function handleResendConfirmation() {
    const normalizedEmail = normalizeAuthEmail(email);
    if (!normalizedEmail) {
      setErrorMessage("Isi email terlebih dahulu untuk kirim ulang konfirmasi.");
      return;
    }

    setErrorMessage("");
    setResendMessage("");
    setIsResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/sign-in`,
        },
      });

      if (error) throw error;

      setResendMessage("Email konfirmasi sudah dikirim ulang. Cek inbox atau spam.");
      window.sessionStorage.setItem(
        "cogniscan:pending-confirmation-email",
        normalizedEmail,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengirim ulang email konfirmasi.",
      );
    } finally {
      setIsResending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setIsSubmitting(true);
    const loadingStartedAt = Date.now();

    try {
      const normalizedEmail = normalizeAuthEmail(email);
      window.sessionStorage.removeItem("cogniscan:pending-confirmation-email");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Session login tidak ditemukan. Silakan coba masuk kembali.");
      }

      try {
        const metadata = data.user?.user_metadata ?? {};
        const pendingProfile = loadPendingPatientProfile(normalizedEmail);
        const metadataName =
          typeof metadata.nama_lengkap === "string" ? metadata.nama_lengkap.trim() : "";
        const metadataGender =
          metadata.jenis_kelamin === "laki-laki" || metadata.jenis_kelamin === "perempuan"
            ? metadata.jenis_kelamin
            : undefined;
        const metadataProfile = metadataName
          ? {
              nama_lengkap: metadataName,
              jenis_kelamin: metadataGender,
              tanggal_lahir:
                typeof metadata.tanggal_lahir === "string"
                  ? metadata.tanggal_lahir
                  : undefined,
              alamat_lengkap:
                typeof metadata.alamat_lengkap === "string"
                  ? metadata.alamat_lengkap
                  : undefined,
              no_hp_wa: typeof metadata.no_hp_wa === "string" ? metadata.no_hp_wa : undefined,
            }
          : null;
        const profileFallback = pendingProfile ?? metadataProfile;

        const currentUser = await fetchCurrentUser(accessToken);
        const user = await ensurePatientProfile(
          accessToken,
          currentUser,
          profileFallback,
        );
        await waitForMinimumLoading(loadingStartedAt);
        router.replace(dashboardPathForRole(user.peran));
        router.refresh();
        return;
      } catch (backendError) {
        const metadata = data.user?.user_metadata ?? {};
        const pendingProfile = loadPendingPatientProfile(normalizedEmail);
        const metadataRole = typeof metadata.peran === "string" ? metadata.peran : "";
        const metadataName =
          typeof metadata.nama_lengkap === "string" ? metadata.nama_lengkap.trim() : "";
        const metadataGender =
          metadata.jenis_kelamin === "laki-laki" || metadata.jenis_kelamin === "perempuan"
            ? metadata.jenis_kelamin
            : undefined;
        const metadataProfile = {
          nama_lengkap: metadataName,
          jenis_kelamin: metadataGender,
          tanggal_lahir:
            typeof metadata.tanggal_lahir === "string" ? metadata.tanggal_lahir : undefined,
          alamat_lengkap:
            typeof metadata.alamat_lengkap === "string" ? metadata.alamat_lengkap : undefined,
          no_hp_wa: typeof metadata.no_hp_wa === "string" ? metadata.no_hp_wa : undefined,
        };

        const canCreatePatientProfile =
          pendingProfile !== null || (metadataRole === "pasien" && metadataName.length >= 3);

        if (!canCreatePatientProfile) {
          throw backendError;
        }

        const user = await createPatientProfile(
          accessToken,
          pendingProfile ?? metadataProfile,
        );
        clearPendingPatientProfile(normalizedEmail);
        await waitForMinimumLoading(loadingStartedAt);
        router.replace(dashboardPathForRole(user.peran));
        router.refresh();
      }
    } catch (error) {
      await waitForMinimumLoading(loadingStartedAt);
      setErrorMessage(error instanceof Error ? error.message : "Gagal masuk ke akun");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {isSubmitting ? <LoadingPage text="Memeriksa akun..." showText={false} /> : null}
      <AuthShell compact className="max-w-md">
      <form className="px-12 pb-16 pt-14 sm:px-12" onSubmit={handleSubmit}>
        <div className="mb-10 text-center">
          <AuthLogo />
          <h1 className="mt-9 text-2xl font-bold text-[#a98ad6]">Welcome Back</h1>
          <p className="mt-2 text-[15px] text-on-surface-variant">
            Sign in to continue your mental wellness journey.
          </p>
        </div>

        <div className="space-y-6">
          <label className="block">
            <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
              Email Address
            </span>
            <input
              autoComplete="email"
              className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
              Password
            </span>
            <span className="relative block">
              <input
                autoComplete="current-password"
                className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 pr-12 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="........"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4f584d] hover:text-[#343832] transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </span>
          </label>
        </div>

        {infoMessage ? (
          <div className="mt-5 rounded-[8px] border border-[#c4ddc5] bg-[#eef7ef] px-4 py-3 text-sm text-primary">
            <p>{infoMessage}</p>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={isResending}
              className="mt-3 font-semibold underline-offset-4 transition hover:underline disabled:opacity-60"
            >
              {isResending ? "Mengirim ulang..." : "Kirim ulang email konfirmasi"}
            </button>
          </div>
        ) : null}

        {resendMessage ? (
          <p className="mt-5 rounded-[8px] border border-[#c4ddc5] bg-[#eef7ef] px-4 py-3 text-sm text-primary">
            {resendMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <PrimaryAuthButton className="mt-6" disabled={isSubmitting}>
          {isSubmitting ? "Signing In..." : "Sign In"}
        </PrimaryAuthButton>

        <p className="mt-10 text-center text-sm text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-semibold text-primary-container hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
      </AuthShell>
    </>
  );
}
