"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, KeyRound, Loader2, Pencil, Phone, X } from "lucide-react";
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

type PatientProfileFormState = {
  nama_lengkap: string;
  jenis_kelamin: GenderValue;
  tanggal_lahir: string;
  alamat_lengkap: string;
  no_hp_wa: string;
};

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

function ProfileInput({
  label,
  value,
  icon,
  type = "text",
  readOnly,
  required,
  minLength,
  max,
  onChange,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
  minLength?: number;
  max?: string;
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
          required={required}
          minLength={minLength}
          max={max}
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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savedProfile, setSavedProfile] =
    useState<PatientProfileFormState | null>(null);

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
        const profileGender =
          profile.jenis_kelamin === "laki-laki" ||
            profile.jenis_kelamin === "perempuan"
            ? profile.jenis_kelamin
            : "";
        setGender(profileGender);
        setSavedProfile({
          nama_lengkap: profile.nama_lengkap ?? "",
          jenis_kelamin: profileGender,
          tanggal_lahir: profile.tanggal_lahir ?? "",
          alamat_lengkap: profile.alamat_lengkap ?? "",
          no_hp_wa: profile.no_hp_wa ?? "",
        });
        setIsEditing(false);
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

    if (!isEditing) return;

    if (!accessToken) {
      setErrorMessage("Session tidak ditemukan. Silakan login ulang.");
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedAddress = address.trim();
    const normalizedPhone = normalizeIndonesianPhone(phone);
    const today = new Date().toISOString().slice(0, 10);

    if (trimmedName.length < 3) {
      setErrorMessage("Nama lengkap wajib diisi minimal 3 karakter.");
      return;
    }

    if (!gender) {
      setErrorMessage("Jenis kelamin wajib dipilih.");
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

    if (!normalizedPhone) {
      setErrorMessage("Nomor WhatsApp wajib diisi dengan format angka yang valid.");
      return;
    }

    if (trimmedAddress.length < 5) {
      setErrorMessage("Alamat lengkap wajib diisi minimal 5 karakter.");
      return;
    }

    const payload: PatientProfilePayload = {
      nama_lengkap: trimmedName,
      jenis_kelamin: gender,
      tanggal_lahir: dateOfBirth,
      alamat_lengkap: trimmedAddress,
      no_hp_wa: normalizedPhone,
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
      setSavedProfile(payload);
      setIsEditing(false);
      setSuccessMessage("Profil berhasil disimpan.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan profil.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditProfile() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditing(true);
  }

  function handleCancelEdit() {
    if (savedProfile) {
      setFullName(savedProfile.nama_lengkap);
      setPhone(savedProfile.no_hp_wa);
      setDateOfBirth(savedProfile.tanggal_lahir);
      setAddress(savedProfile.alamat_lengkap);
      setGender(savedProfile.jenis_kelamin);
    }
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditing(false);
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
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#6f5794]">
              Informasi Pribadi
            </h2>
            {!isLoading && !isEditing ? (
              <button
                type="button"
                onClick={handleEditProfile}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-primary px-5 text-[14px] font-semibold text-primary transition hover:bg-primary-container/10"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit Profil
              </button>
            ) : null}
          </div>

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
                    readOnly={!isEditing || isSaving}
                    required
                    minLength={3}
                  />
                  <ProfileInput
                    label="Email"
                    value={email}
                    type="email"
                    readOnly
                  />
                  <ProfileInput
                    label="No. WhatsApp"
                    value={phone}
                    icon={<Phone />}
                    onChange={setPhone}
                    readOnly={!isEditing || isSaving}
                    required
                  />
                  <ProfileInput
                    label="Tanggal Lahir"
                    value={dateOfBirth}
                    type="date"
                    icon={<CalendarDays />}
                    onChange={setDateOfBirth}
                    readOnly={!isEditing || isSaving}
                    required
                    max={new Date().toISOString().slice(0, 10)}
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
                      readOnly={!isEditing || isSaving}
                      rows={4}
                      required
                      minLength={5}
                      className={`w-full resize-none rounded-[10px] border border-outline-variant bg-white px-4 py-3 text-[15px] text-on-surface outline-none transition focus:border-primary-container focus:ring-4 focus:ring-primary-container/15 ${
                        !isEditing || isSaving ? "bg-surface-container text-on-surface-variant" : ""
                      }`}
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
                          disabled={!isEditing || isSaving}
                          required
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
                          disabled={!isEditing || isSaving}
                          required
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

              {isEditing ? (
                <div className="mt-14 grid gap-3 sm:grid-cols-[1fr_1.4fr]">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-outline-variant px-8 text-[16px] font-medium text-on-surface-variant transition hover:bg-surface-container disabled:pointer-events-none disabled:opacity-65"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-primary px-8 text-[16px] font-medium text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:-translate-y-0.5 hover:bg-[#365f39] disabled:pointer-events-none disabled:opacity-65"
                  >
                    {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </form>
          )}
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
}
