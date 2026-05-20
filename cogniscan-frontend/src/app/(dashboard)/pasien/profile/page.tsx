"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, KeyRound, Loader2, Phone } from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser } from "@/components/patient";
import {
  fetchPatientProfile,
  updatePatientProfile,
  type PatientProfilePayload,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";

type GenderValue = "" | "laki-laki" | "perempuan";

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function ProfileInput({
  label,
  value,
  icon,
  type = "text",
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  type?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-medium text-on-surface-variant">
        {label}
      </span>
      <span className="relative block">
        {icon ? (
          <span className="absolute left-4 top-1/2 flex -translate-y-1/2 text-on-surface-variant [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange?.(event.target.value)}
          className={`h-12 w-full rounded-[10px] border border-outline-variant bg-white px-4 text-[15px] text-on-surface outline-none transition focus:border-primary-container focus:ring-4 focus:ring-primary-container/15 ${
            icon ? "pl-11" : ""
          } ${readOnly ? "bg-surface-container text-on-surface-variant" : ""}`}
        />
      </span>
    </label>
  );
}

export default function PatientProfilePage() {
  const backendUser = useBackendUser();
  const [accessToken, setAccessToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState<GenderValue>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage("");

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (mounted) {
          setIsLoading(false);
          setErrorMessage("Session tidak ditemukan. Silakan login ulang.");
        }
        return;
      }

      try {
        const profile = await fetchPatientProfile(token);
        if (!mounted) return;

        setAccessToken(token);
        setFullName(profile.nama_lengkap ?? "");
        setEmail(backendUser?.email ?? data.session?.user.email ?? "");
        setPhone(profile.no_hp_wa ?? "");
        setDateOfBirth(profile.tanggal_lahir ?? "");
        setAddress(profile.alamat_lengkap ?? "");
        setGender(
          profile.jenis_kelamin === "laki-laki" ||
            profile.jenis_kelamin === "perempuan"
            ? profile.jenis_kelamin
            : "",
        );
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal mengambil profil pasien.",
        );
        setEmail(backendUser?.email ?? data.session?.user.email ?? "");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [backendUser?.email]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!accessToken) {
      setErrorMessage("Session tidak ditemukan. Silakan login ulang.");
      return;
    }

    const payload: PatientProfilePayload = {
      nama_lengkap: fullName.trim(),
      jenis_kelamin: gender || undefined,
      tanggal_lahir: optionalText(dateOfBirth),
      alamat_lengkap: optionalText(address),
      no_hp_wa: optionalText(phone),
    };

    setIsSaving(true);
    try {
      const updated = await updatePatientProfile(accessToken, payload);
      setFullName(updated.nama_lengkap ?? "");
      setPhone(updated.no_hp_wa ?? "");
      setDateOfBirth(updated.tanggal_lahir ?? "");
      setAddress(updated.alamat_lengkap ?? "");
      setGender(
        updated.jenis_kelamin === "laki-laki" ||
          updated.jenis_kelamin === "perempuan"
          ? updated.jenis_kelamin
          : "",
      );
      setSuccessMessage("Profil berhasil disimpan.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan profil.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const displayUser = {
    ...patientUser,
    name:
      fullName.trim() ||
      backendUser?.nama_lengkap?.trim() ||
      patientUser.name,
  };

  return (
    <DashboardLayout
      navItems={getPatientNav("dashboard")}
      user={displayUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div>
        <header className="mb-10">
          <h1 className="text-[34px] font-extrabold tracking-[-0.02em] text-[#6f5794]">
            Profil Saya
          </h1>
          <p className="mt-1 text-[16px] text-on-surface-variant">
            Kelola informasi akun dan data pribadimu.
          </p>
        </header>

        <DashboardCard className="border border-outline-variant/70 px-10 py-10">
          <h2 className="mb-10 text-sm font-extrabold uppercase tracking-[0.16em] text-[#6f5794]">
            Informasi Pribadi
          </h2>

          {isLoading ? (
            <div
              className="flex min-h-[360px] items-center justify-center"
              aria-label="Memuat profil pasien"
              role="status"
            >
              <Loader2
                className="h-9 w-9 animate-spin text-[#6f5794]"
                aria-hidden="true"
              />
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
                <div className="space-y-5">
                  <ProfileInput
                    label="Nama Lengkap"
                    value={fullName}
                    onChange={setFullName}
                  />
                  <ProfileInput
                    label="Email"
                    value={email}
                    type="email"
                    readOnly
                  />
                  <ProfileInput
                    label="No. HP"
                    value={phone}
                    icon={<Phone />}
                    onChange={setPhone}
                  />
                  <ProfileInput
                    label="Tanggal Lahir"
                    value={dateOfBirth}
                    type="date"
                    icon={<CalendarDays />}
                    onChange={setDateOfBirth}
                  />
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-[15px] font-medium text-on-surface-variant">
                      Alamat Lengkap
                    </span>
                    <textarea
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-[10px] border border-outline-variant bg-white px-4 py-3 text-[15px] text-on-surface outline-none transition focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                    />
                  </label>

                  <fieldset>
                    <legend className="mb-3 text-[15px] font-medium text-on-surface-variant">
                      Jenis Kelamin
                    </legend>
                    <div className="flex gap-8">
                      <label className="inline-flex items-center gap-3 text-[15px] text-on-surface">
                        <input
                          type="radio"
                          name="gender"
                          checked={gender === "laki-laki"}
                          onChange={() => setGender("laki-laki")}
                          className="h-5 w-5 appearance-none rounded-full border border-outline-variant bg-white checked:border-[6px] checked:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/20"
                        />
                        Laki-laki
                      </label>
                      <label className="inline-flex items-center gap-3 text-[15px] text-on-surface">
                        <input
                          type="radio"
                          name="gender"
                          checked={gender === "perempuan"}
                          onChange={() => setGender("perempuan")}
                          className="h-5 w-5 appearance-none rounded-full border border-outline-variant bg-white checked:border-[6px] checked:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/20"
                        />
                        Perempuan
                      </label>
                    </div>
                  </fieldset>

                  <div className="rounded-[12px] border border-outline-variant bg-surface px-5 py-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-[#6f5794]">
                        <KeyRound className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-semibold text-on-surface">
                          Password Akun
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                          Untuk keamanan akun, perubahan password dilakukan di halaman terpisah.
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/reset-password"
                      className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full border border-primary px-5 text-[14px] font-semibold text-primary transition hover:bg-primary-container/10"
                    >
                      Buat Password Baru
                    </Link>
                  </div>
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

              <button
                type="submit"
                disabled={isSaving}
                className="mt-14 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-primary px-8 text-[16px] font-medium text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:-translate-y-0.5 hover:bg-[#365f39] disabled:pointer-events-none disabled:opacity-65"
              >
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
          )}
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
}
