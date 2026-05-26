"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthLogo, AuthShell } from "@/components/auth/AuthShell";
import { PhoneField, PrimaryAuthButton, TextAreaField } from "@/components/auth/fields";
import LoadingPage from "@/components/loading/page";
import {
  clearPendingPatientProfile,
  createPatientProfile,
  normalizeAuthEmail,
  savePendingPatientProfile,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

type GenderValue = "" | "laki-laki" | "perempuan";

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

function getSignupErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Pendaftaran pasien gagal diproses.";

  if (message.toLowerCase().includes("email signups are disabled")) {
    return "Email/password signup di Supabase masih nonaktif. Aktifkan Email provider dan Allow signups di Supabase Auth, lalu coba lagi.";
  }

  return message;
}

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<GenderValue>("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const normalizedEmail = normalizeAuthEmail(email);
    const normalizedPhone = normalizeIndonesianPhone(phone);
    const trimmedName = fullName.trim();
    const trimmedAddress = address.trim();
    const today = new Date().toISOString().slice(0, 10);

    if (trimmedName.length < 3) {
      setErrorMessage("Nama lengkap wajib diisi minimal 3 karakter.");
      return;
    }

    if (!normalizedEmail) {
      setErrorMessage("Email wajib diisi.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password belum sama.");
      return;
    }

    if (!dateOfBirth) {
      setErrorMessage("Tanggal lahir wajib diisi.");
      return;
    }

    if (dateOfBirth > today) {
      setErrorMessage("Tanggal lahir tidak boleh di masa depan.");
      return;
    }

    if (!gender) {
      setErrorMessage("Jenis kelamin wajib dipilih.");
      return;
    }

    if (!normalizedPhone) {
      setErrorMessage("Nomor WhatsApp wajib diisi dengan format angka yang valid.");
      return;
    }

    if (trimmedAddress.length < 5) {
      setErrorMessage("Alamat lengkap wajib diisi minimal 5 karakter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const patientProfile = {
        nama_lengkap: trimmedName,
        jenis_kelamin: gender,
        tanggal_lahir: dateOfBirth,
        alamat_lengkap: trimmedAddress,
        no_hp_wa: normalizedPhone,
      };

      savePendingPatientProfile(normalizedEmail, patientProfile);

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/sign-in`,
          data: {
            alamat_lengkap: patientProfile.alamat_lengkap,
            jenis_kelamin: patientProfile.jenis_kelamin,
            nama_lengkap: patientProfile.nama_lengkap,
            no_hp_wa: patientProfile.no_hp_wa,
            peran: "pasien",
            tanggal_lahir: patientProfile.tanggal_lahir,
          },
        },
      });

      if (error) throw error;

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        window.sessionStorage.setItem(
          "cogniscan:pending-confirmation-email",
          normalizedEmail,
        );
        window.sessionStorage.setItem(
          "cogniscan:auth-info",
          "Akun berhasil dibuat. Silakan konfirmasi email dari Supabase, lalu masuk dengan email dan password yang sama.",
        );
        router.replace("/sign-in");
        return;
      }

      await createPatientProfile(accessToken, patientProfile);
      clearPendingPatientProfile(normalizedEmail);

      router.replace("/pasien/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(getSignupErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {isSubmitting ? <LoadingPage text="Membuat akun..." /> : null}
      <AuthShell className="max-w-200">
      <form className="px-8 pb-16 pt-20 sm:px-16 md:px-20" onSubmit={handleSubmit}>
        <div className="mb-12 text-center">
          <AuthLogo />
          <h1 className="mt-7 text-2xl font-bold tracking-[-0.01em] text-[#a98ad6]">
            Buat Akun Pasien
          </h1>
          <p className="mt-2 text-[15px] text-on-surface-variant">
            Daftar untuk mulai refleksi dan screening awal di CogniScan.
          </p>
        </div>

        <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
                Nama Lengkap
              </span>
              <input
                autoComplete="name"
                className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nama lengkap kamu"
                minLength={3}
                required
                type="text"
                value={fullName}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
                Email
              </span>
              <input
                autoComplete="email"
                className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
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
                  autoComplete="new-password"
                  className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 pr-12 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimal 8 karakter"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4f584d] transition hover:text-[#343832]"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
                Konfirmasi Password
              </span>
              <span className="relative block">
                <input
                  autoComplete="new-password"
                  className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 pr-12 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Ulangi password"
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4f584d] transition hover:text-[#343832]"
                  aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
                Tanggal Lahir
              </span>
              <input
                className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 pr-3 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                type="date"
                value={dateOfBirth}
                required
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setDateOfBirth(event.target.value)}
              />
            </label>

            <fieldset>
              <legend className="mb-4 text-[15px] font-semibold leading-none text-[#343832]">
                Jenis Kelamin
              </legend>
              <div className="flex h-12 items-center gap-8">
                <label className="inline-flex items-center gap-3 text-[15px] text-on-surface">
                  <input
                    type="radio"
                    name="gender"
                    checked={gender === "laki-laki"}
                    onChange={() => setGender("laki-laki")}
                    required
                    className="h-5 w-5 appearance-none rounded-full border border-[#c9cec4] bg-white checked:border-[6px] checked:border-primary-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/20"
                  />
                  Laki-laki
                </label>
                <label className="inline-flex items-center gap-3 text-[15px] text-on-surface">
                  <input
                    type="radio"
                    name="gender"
                    checked={gender === "perempuan"}
                    onChange={() => setGender("perempuan")}
                    required
                    className="h-5 w-5 appearance-none rounded-full border border-[#c9cec4] bg-white checked:border-[6px] checked:border-primary-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/20"
                  />
                  Perempuan
                </label>
              </div>
            </fieldset>

            <PhoneField
              label="Nomor WhatsApp"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
            <TextAreaField
              label="Alamat Lengkap"
              placeholder="Nama jalan, kota, dan alamat singkat..."
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              minLength={5}
              required
            />
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-6 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-6 rounded-[8px] border border-[#c4ddc5] bg-[#eef7ef] px-4 py-3 text-sm text-primary">
            {successMessage}
          </p>
        ) : null}

        <PrimaryAuthButton className="mt-8" disabled={isSubmitting}>
          {isSubmitting ? "Memproses..." : "Buat Akun"}
        </PrimaryAuthButton>

        <p className="mt-10 text-center text-sm text-on-surface-variant">
          Sudah punya akun?{" "}
          <Link href="/sign-in" className="font-semibold text-primary-container hover:underline">
            Masuk
          </Link>
        </p>
      </form>
      </AuthShell>
    </>
  );
}
