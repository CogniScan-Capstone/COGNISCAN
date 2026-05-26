"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
  Wallet,
  Landmark,
  CreditCard,
  UserCheck,
  Loader2,
  XCircle,
} from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import {
  getPsikologNav,
  psikologProfileHref,
  psikologUser,
} from "@/components/psikolog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import {
  fetchPsikologProfile,
  updatePsikologProfile,
  type PsikologProfilePayload,
} from "@/lib/auth";
import { useBackendUser } from "@/lib/useBackendUser";

type ProfileForm = {
  fullName: string;
  rate: string;
  phone: string;
  email: string;
  address: string;
  kota: string;
  provinsi: string;
  namaBank: string;
  nomorRekening: string;
  namaPenerimaRekening: string;
};

const defaultProfile: ProfileForm = {
  fullName: "",
  rate: "",
  phone: "",
  email: "",
  address: "",
  kota: "",
  provinsi: "",
  namaBank: "",
  nomorRekening: "",
  namaPenerimaRekening: "",
};

export default function PsikologProfilePage() {
  const backendUser = useBackendUser();
  const [accessToken, setAccessToken] = useState("");
  const [profile, setProfile] = useState<ProfileForm>(defaultProfile);
  const [draft, setDraft] = useState<ProfileForm>(defaultProfile);
  const [apakahRekeningTerverifikasi, setApakahRekeningTerverifikasi] = useState(false);
  const [nik, setNik] = useState("");
  const [statusAkun, setStatusAkun] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage(null);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (mounted) {
          setIsLoading(false);
          setErrorMessage("Sesi tidak ditemukan. Silakan login ulang.");
        }
        return;
      }

      try {
        const rawProfile = await fetchPsikologProfile(token);
        if (!mounted) return;

        setAccessToken(token);
        setApakahRekeningTerverifikasi(!!rawProfile.apakah_rekening_terverifikasi);
        setNik(rawProfile.nik ?? "");
        setStatusAkun(rawProfile.status_akun ?? "");

        const mapped: ProfileForm = {
          fullName: rawProfile.nama_lengkap ?? "",
          rate: rawProfile.tarif_konsultasi ? String(rawProfile.tarif_konsultasi) : "",
          phone: rawProfile.nomor_hp ?? "",
          email: rawProfile.email ?? backendUser?.email ?? data.session?.user.email ?? "",
          address: rawProfile.alamat_praktik ?? "",
          kota: rawProfile.kota ?? "",
          provinsi: rawProfile.provinsi ?? "",
          namaBank: rawProfile.nama_bank ?? "",
          nomorRekening: rawProfile.nomor_rekening ?? "",
          namaPenerimaRekening: rawProfile.nama_penerima_rekening ?? "",
        };

        setProfile(mapped);
        setDraft(mapped);
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal mengambil profil psikolog."
        );
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [backendUser?.email]);

  const dirty =
    draft.fullName !== profile.fullName ||
    draft.rate !== profile.rate ||
    draft.phone !== profile.phone ||
    draft.address !== profile.address ||
    draft.kota !== profile.kota ||
    draft.provinsi !== profile.provinsi ||
    draft.namaBank !== profile.namaBank ||
    draft.nomorRekening !== profile.nomorRekening ||
    draft.namaPenerimaRekening !== profile.namaPenerimaRekening;

  const passwordDirty = newPassword !== "" || confirmPassword !== "";

  const passwordMismatch =
    newPassword !== "" && confirmPassword !== "" && newPassword !== confirmPassword;

  const isPasswordValid =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[\d!@#$%^&*]/.test(newPassword) &&
    /[a-zA-Z]/.test(newPassword);

  const canSave =
    (dirty || passwordDirty) &&
    (!passwordDirty || (isPasswordValid && newPassword === confirmPassword));

  const handleSave = async () => {
    if (!canSave) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validasi Kelengkapan Rekening Bank jika salah satu kolom terisi
    const hasBankDetails = draft.namaBank || draft.nomorRekening || draft.namaPenerimaRekening;
    if (hasBankDetails) {
      if (!draft.namaBank || !draft.nomorRekening || !draft.namaPenerimaRekening) {
        setErrorMessage("Informasi bank harus diisi lengkap (Nama Bank, Nomor Rekening, dan Nama Pemilik).");
        return;
      }

      // 2. Validasi Jumlah Digit Nomor Rekening sesuai bank yang dipilih
      const bank = draft.namaBank.toUpperCase();
      const len = draft.nomorRekening.length;
      if (bank === "BCA" && len !== 10) {
        setErrorMessage("Nomor rekening BCA harus terdiri dari 10 digit.");
        return;
      }
      if (bank === "MANDIRI" && len !== 13) {
        setErrorMessage("Nomor rekening Mandiri harus terdiri dari 13 digit.");
        return;
      }
      if (bank === "BNI" && len !== 10) {
        setErrorMessage("Nomor rekening BNI harus terdiri dari 10 digit.");
        return;
      }
      if (bank === "BRI" && len !== 15) {
        setErrorMessage("Nomor rekening BRI harus terdiri dari 15 digit.");
        return;
      }
    }

    setIsSaving(true);

    try {
      // 1. Save profile to backend if dirty
      if (dirty) {
        const payload: PsikologProfilePayload = {};
        if (draft.fullName !== profile.fullName) payload.nama_lengkap = draft.fullName;
        if (draft.rate !== profile.rate) payload.tarif_konsultasi = Number(draft.rate);
        if (draft.phone !== profile.phone) payload.nomor_hp = draft.phone;
        if (draft.address !== profile.address) payload.alamat_praktik = draft.address;
        if (draft.kota !== profile.kota) payload.kota = draft.kota;
        if (draft.provinsi !== profile.provinsi) payload.provinsi = draft.provinsi;
        if (draft.namaBank !== profile.namaBank) payload.nama_bank = draft.namaBank;
        if (draft.nomorRekening !== profile.nomorRekening) payload.nomor_rekening = draft.nomorRekening;
        if (draft.namaPenerimaRekening !== profile.namaPenerimaRekening)
          payload.nama_penerima_rekening = draft.namaPenerimaRekening;

        const updated = await updatePsikologProfile(accessToken, payload);

        const mapped: ProfileForm = {
          fullName: updated.nama_lengkap ?? "",
          rate: updated.tarif_konsultasi ? String(updated.tarif_konsultasi) : "",
          phone: updated.nomor_hp ?? "",
          email: updated.email ?? profile.email,
          address: updated.alamat_praktik ?? "",
          kota: updated.kota ?? "",
          provinsi: updated.provinsi ?? "",
          namaBank: updated.nama_bank ?? "",
          nomorRekening: updated.nomor_rekening ?? "",
          namaPenerimaRekening: updated.nama_penerima_rekening ?? "",
        };

        setProfile(mapped);
        setDraft(mapped);
        setApakahRekeningTerverifikasi(!!updated.apakah_rekening_terverifikasi);
      }

      // 2. Change password in Supabase if passwordDirty
      if (passwordDirty) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          throw new Error(`Gagal memperbarui password: ${error.message}`);
        }
        setNewPassword("");
        setConfirmPassword("");
      }

      setSuccessMessage("Perubahan profil berhasil disimpan.");
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyimpan perubahan profil."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(profile);
    setNewPassword("");
    setConfirmPassword("");
    setIsEditing(false);
    setErrorMessage(null);
  };

  const displayUser = {
    ...psikologUser,
    name: profile.fullName || backendUser?.nama_lengkap || psikologUser.name,
  };

  return (
    <DashboardLayout
      title="Profil Saya"
      navItems={getPsikologNav("dashboard")}
      user={displayUser}
      profileHref={psikologProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="space-y-0">
        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-full bg-[#dfeedf] px-4 py-2 text-[14px] font-semibold text-[#3f5a3f]">
            <CheckCircle2 className="h-4 w-4 text-[#3f5a3f]" aria-hidden="true" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-full bg-[#fde8e8] px-4 py-2 text-[14px] font-semibold text-[#9b1c1c]">
            <XCircle className="h-4 w-4 text-[#9b1c1c]" aria-hidden="true" />
            {errorMessage}
          </div>
        )}

        <DashboardCard className="overflow-hidden px-8 py-7">
          {isLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Header nama + tombol edit */}
              <div className="flex items-center justify-between border-b border-outline-variant pb-6">
                <div>
                  <h2 className="text-[22px] font-bold text-on-surface">
                    {profile.fullName || "Psikolog"}
                  </h2>
                  <p className="mt-1 text-[13px] text-on-surface-muted">
                    NIK: {nik || "-"} • Status Akun: <span className="font-semibold capitalize text-primary">{statusAkun}</span>
                  </p>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex h-10 items-center rounded-full border border-outline-variant px-5 text-[14px] font-semibold text-on-surface transition hover:border-primary hover:text-primary"
                  >
                    Edit Profil
                  </button>
                )}
              </div>

              {/* Informasi Data Diri */}
              <div className="mt-6">
                <p className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Informasi Data Diri
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    icon={User}
                    label="Nama Lengkap"
                    value={draft.fullName}
                    onChange={(v) => setDraft((d) => ({ ...d, fullName: v }))}
                    disabled={!isEditing}
                  />
                  <Field
                    icon={Wallet}
                    label="Tarif Konsultasi"
                    value={
                      isEditing
                        ? draft.rate
                        : draft.rate
                        ? `Rp ${Number(draft.rate).toLocaleString("id-ID")} / sesi`
                        : "Belum diatur"
                    }
                    onChange={(v) => setDraft((d) => ({ ...d, rate: v.replace(/\D/g, "") }))}
                    disabled={!isEditing}
                  />
                  <Field
                    icon={Phone}
                    label="No. HP / WhatsApp"
                    value={draft.phone}
                    onChange={(v) => setDraft((d) => ({ ...d, phone: v.replace(/[^\d+]/g, "") }))}
                    disabled={!isEditing}
                  />
                  <Field
                    icon={Mail}
                    label="Email (Akun)"
                    type="email"
                    value={draft.email}
                    onChange={() => {}}
                    disabled={true}
                  />
                </div>
              </div>

              {/* Informasi Rekening Bank */}
              <div className="mt-6 border-t border-outline-variant pt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Informasi Rekening Bank (Untuk Pencairan Dana)
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase",
                      apakahRekeningTerverifikasi
                        ? "bg-[#dfeedf] text-[#3f5a3f]"
                        : "bg-surface-container text-on-surface-muted"
                    )}
                  >
                    {apakahRekeningTerverifikasi ? "Terverifikasi" : "Belum Terverifikasi"}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-[12px] font-semibold text-on-surface-variant">Nama Bank</label>
                    <div
                      className={cn(
                        "mt-1 flex items-center gap-2 rounded-[12px] border border-outline-variant px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
                        !isEditing ? "bg-surface-container/30" : "bg-white"
                      )}
                    >
                      <Landmark className="h-4 w-4 shrink-0 text-on-surface-muted" aria-hidden="true" />
                      {isEditing ? (
                        <select
                          value={draft.namaBank}
                          onChange={(e) => setDraft((d) => ({ ...d, namaBank: e.target.value }))}
                          className="h-11 w-full bg-transparent text-[14px] text-on-surface focus:outline-none cursor-pointer"
                        >
                          <option value="">Pilih Bank...</option>
                          <option value="BCA">BCA</option>
                          <option value="Mandiri">Mandiri</option>
                          <option value="BNI">BNI</option>
                          <option value="BRI">BRI</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={draft.namaBank || "Belum dipilih"}
                          disabled={true}
                          className="h-11 w-full bg-transparent text-[14px] text-on-surface focus:outline-none disabled:cursor-default"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <Field
                      icon={CreditCard}
                      label="Nomor Rekening"
                      value={draft.nomorRekening}
                      onChange={(v) => setDraft((d) => ({ ...d, nomorRekening: v.replace(/\D/g, "") }))}
                      disabled={!isEditing}
                    />
                    {isEditing && draft.namaBank && (
                      <p
                        className={cn(
                          "mt-1.5 text-[11px] font-semibold",
                          draft.nomorRekening.length === 0
                            ? "text-on-surface-muted"
                            : (draft.namaBank.toUpperCase() === "BCA" && draft.nomorRekening.length === 10) ||
                              (draft.namaBank.toUpperCase() === "MANDIRI" && draft.nomorRekening.length === 13) ||
                              (draft.namaBank.toUpperCase() === "BNI" && draft.nomorRekening.length === 10) ||
                              (draft.namaBank.toUpperCase() === "BRI" && draft.nomorRekening.length === 15)
                            ? "text-[#3f5a3f]"
                            : "text-[#a3372e]"
                        )}
                      >
                        {draft.namaBank.toUpperCase() === "BCA" && `BCA memerlukan 10 digit (sekarang: ${draft.nomorRekening.length} digit)`}
                        {draft.namaBank.toUpperCase() === "MANDIRI" && `Mandiri memerlukan 13 digit (sekarang: ${draft.nomorRekening.length} digit)`}
                        {draft.namaBank.toUpperCase() === "BNI" && `BNI memerlukan 10 digit (sekarang: ${draft.nomorRekening.length} digit)`}
                        {draft.namaBank.toUpperCase() === "BRI" && `BRI memerlukan 15 digit (sekarang: ${draft.nomorRekening.length} digit)`}
                      </p>
                    )}
                  </div>
                  <Field
                    icon={UserCheck}
                    label="Nama Pemilik Rekening"
                    value={draft.namaPenerimaRekening}
                    onChange={(v) => setDraft((d) => ({ ...d, namaPenerimaRekening: v }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Lokasi Praktik + Keamanan Akun berdampingan */}
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {/* Lokasi Praktik */}
                <div className="space-y-4">
                  <div>
                    <p className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-primary">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Lokasi Praktik
                    </p>
                    <label className="text-[12px] font-semibold text-on-surface-variant">
                      Alamat Lengkap Praktik
                    </label>
                    <div className="mt-1 flex items-start gap-2 rounded-[12px] border border-outline-variant bg-surface-container/50 px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-muted" aria-hidden="true" />
                      <textarea
                        value={draft.address}
                        onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                        disabled={!isEditing}
                        rows={3}
                        className="w-full resize-none bg-transparent text-[14px] leading-6 text-on-surface focus:outline-none disabled:cursor-default"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      icon={MapPin}
                      label="Kota"
                      value={draft.kota}
                      onChange={(v) => setDraft((d) => ({ ...d, kota: v }))}
                      disabled={!isEditing}
                    />
                    <Field
                      icon={MapPin}
                      label="Provinsi"
                      value={draft.provinsi}
                      onChange={(v) => setDraft((d) => ({ ...d, provinsi: v }))}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {/* Keamanan Akun */}
                <div>
                  <p className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Keamanan Akun
                  </p>
                  <div className="rounded-[14px] border border-outline-variant bg-surface-container/40 px-5 py-5">
                    <p className="mb-3 text-[14px] font-bold text-on-surface">Ubah Password</p>
                    <label className="text-[12px] font-semibold text-on-surface-variant">
                      Password Baru
                    </label>
                    <PasswordField
                      label=""
                      value={newPassword}
                      onChange={setNewPassword}
                      visible={showNew}
                      onToggle={() => setShowNew((v) => !v)}
                      placeholder="Masukkan password baru"
                      disabled={!isEditing}
                    />
                    <label className="mt-3 block text-[12px] font-semibold text-on-surface-variant">
                      Konfirmasi Password Baru
                    </label>
                    <PasswordField
                      label=""
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      visible={showConfirm}
                      onToggle={() => setShowConfirm((v) => !v)}
                      placeholder="Ulangi password baru"
                      disabled={!isEditing}
                    />
                    {passwordMismatch ? (
                      <p className="mt-2 text-[12px] font-semibold text-[#a3372e]">
                        Konfirmasi password belum sama.
                      </p>
                    ) : null}
                    {/* Checklist validasi */}
                    <ul className="mt-3 space-y-1">
                      {[
                        { label: "Minimal 8 karakter", pass: newPassword.length >= 8 },
                        {
                          label: "Kombinasi angka & simbol",
                          pass: /[\d!@#$%^&*]/.test(newPassword) && /[a-zA-Z]/.test(newPassword),
                        },
                        { label: "Gunakan huruf kapital", pass: /[A-Z]/.test(newPassword) },
                        {
                          label: "Password cocok",
                          pass: newPassword.length > 0 && newPassword === confirmPassword,
                        },
                      ].map(({ label, pass }) => (
                        <li
                          key={label}
                          className={cn(
                            "flex items-center gap-2 text-[12px]",
                            pass ? "text-primary" : "text-on-surface-muted"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {isEditing && (
                <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant pt-6">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center rounded-full border border-outline-variant bg-white px-6 text-[14px] font-semibold text-on-surface transition hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave || isSaving}
                    className={cn(
                      "inline-flex h-11 items-center rounded-full px-6 text-[14px] font-semibold text-white transition",
                      canSave && !isSaving
                        ? "bg-[#3f5a3f] hover:bg-[#324a32]"
                        : "bg-[#3f5a3f]/40 cursor-not-allowed"
                    )}
                  >
                    {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              )}
            </>
          )}
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  disabled,
}: {
  icon: typeof User;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-[12px] font-semibold text-on-surface-variant">{label}</label>
      <div
        className={cn(
          "mt-1 flex items-center gap-2 rounded-[12px] border border-outline-variant px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          disabled ? "bg-surface-container/30" : "bg-white"
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-on-surface-muted" aria-hidden="true" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-11 w-full bg-transparent text-[14px] text-on-surface focus:outline-none disabled:cursor-default"
        />
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      {label && (
        <label className="text-[12px] font-semibold text-on-surface-variant">{label}</label>
      )}
      <div
        className={cn(
          "mt-1 flex items-center gap-2 rounded-[12px] border border-outline-variant px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          disabled ? "bg-surface-container/30" : "bg-white"
        )}
      >
        <Lock className="h-4 w-4 shrink-0 text-on-surface-muted" aria-hidden="true" />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="new-password"
          className="h-11 w-full bg-transparent text-[14px] text-on-surface placeholder:text-on-surface-muted focus:outline-none disabled:cursor-default"
        />
        {!disabled && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
            className="text-on-surface-muted transition hover:text-primary"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
