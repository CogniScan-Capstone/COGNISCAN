"use client";

import { useState } from "react";
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
} from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import {
  getPsikologNav,
  psikologProfileHref,
  psikologUser,
} from "@/components/psikolog";
import { cn } from "@/lib/utils";

type ProfileForm = {
  bio: string;
  fullName: string;
  rate: string;
  phone: string;
  email: string;
  address: string;
};

const initialProfile: ProfileForm = {
  bio: "Psikolog klinis dengan pengalaman 8 tahun menangani isu keluarga, kecemasan, dan relasi. Fokus pada pendekatan empatik berbasis CBT.",
  fullName: "Budi Santoso, M.Psi., Psikolog",
  rate: "Rp 350.000 / sesi",
  phone: "+62 812 3456 7890",
  email: "budi.santoso@cogniscan.id",
  address: "Klinik CogniScan, Jl. Gatot Subroto No. 88, Lt. 3 Ruang A, Jakarta Selatan",
};

export default function PsikologProfilePage() {
  const [profile, setProfile] = useState<ProfileForm>(initialProfile);
  const [draft, setDraft] = useState<ProfileForm>(initialProfile);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const dirty =
    draft.bio !== profile.bio ||
    draft.fullName !== profile.fullName ||
    draft.rate !== profile.rate ||
    draft.phone !== profile.phone ||
    draft.email !== profile.email ||
    draft.address !== profile.address;

  const passwordDirty = newPassword !== "" || confirmPassword !== "";

  const passwordMismatch =
    newPassword !== "" && confirmPassword !== "" && newPassword !== confirmPassword;

  const canSave =
    (dirty || passwordDirty) &&
    (!passwordDirty ||
      (newPassword.length >= 8 && newPassword === confirmPassword));

  const handleSave = () => {
    if (!canSave) return;
    setProfile(draft);
    setNewPassword("");
    setConfirmPassword("");
    setIsEditing(false);
    setToast("Perubahan profil berhasil disimpan");
    setTimeout(() => setToast(null), 2400);
  };

  const handleCancel = () => {
    setDraft(profile);
    setNewPassword("");
    setConfirmPassword("");
    setIsEditing(false);
  };

  return (
    <DashboardLayout
      title="Profil Saya"
      navItems={getPsikologNav("dashboard")}
      user={psikologUser}
      profileHref={psikologProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="space-y-0">
        {toast && (
          <div className="mb-4 flex items-center gap-2 rounded-full bg-[#dfeedf] px-4 py-2 text-[14px] font-semibold text-[#3f5a3f]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {toast}
          </div>
        )}

        <DashboardCard className="overflow-hidden px-8 py-7">
          {/* Header nama + tombol edit */}
          <div className="flex items-center justify-between border-b border-outline-variant pb-6">
            <h2 className="text-[22px] font-bold text-on-surface">{profile.fullName}</h2>
            <button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              className="inline-flex h-10 items-center rounded-full border border-outline-variant px-5 text-[14px] font-semibold text-on-surface transition hover:border-primary hover:text-primary"
            >
              Edit Profil
            </button>
          </div>

          {/* Bio Singkat */}
          <div className="mt-6">
            <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Bio Singkat
            </p>
            <textarea
              value={draft.bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              disabled={!isEditing}
              rows={3}
              maxLength={300}
              className="w-full resize-none rounded-[12px] border border-outline-variant bg-surface-container/50 px-4 py-3 text-[14px] leading-6 text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:opacity-80"
            />
            <p className="mt-1 text-right text-[12px] text-on-surface-muted">
              {draft.bio.length} / 300
            </p>
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
                value={draft.rate}
                onChange={(v) => setDraft((d) => ({ ...d, rate: v }))}
                disabled={!isEditing}
              />
              <Field
                icon={Phone}
                label="No. HP"
                value={draft.phone}
                onChange={(v) => setDraft((d) => ({ ...d, phone: v }))}
                disabled={!isEditing}
              />
              <Field
                icon={Mail}
                label="Email"
                type="email"
                value={draft.email}
                onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* Lokasi Praktik + Keamanan Akun berdampingan */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Lokasi Praktik */}
            <div>
              <p className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Lokasi Praktik
              </p>
              <label className="text-[12px] font-semibold text-on-surface-variant">
                Alamat Lengkap
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
                    { label: "Kombinasi angka & simbol", pass: /[\d!@#$%^&*]/.test(newPassword) && /[a-zA-Z]/.test(newPassword) },
                    { label: "Gunakan huruf kapital", pass: /[A-Z]/.test(newPassword) },
                    { label: "Password cocok", pass: newPassword.length > 0 && newPassword === confirmPassword },
                  ].map(({ label, pass }) => (
                    <li key={label} className={cn("flex items-center gap-2 text-[12px]", pass ? "text-primary" : "text-on-surface-muted")}>
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
                className="inline-flex h-11 items-center rounded-full border border-outline-variant bg-white px-6 text-[14px] font-semibold text-on-surface transition hover:border-primary hover:text-primary"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={cn(
                  "inline-flex h-11 items-center rounded-full px-6 text-[14px] font-semibold text-white transition",
                  canSave ? "bg-[#3f5a3f] hover:bg-[#324a32]" : "bg-[#3f5a3f]/40 cursor-not-allowed",
                )}
              >
                Simpan Perubahan
              </button>
            </div>
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
      <div className="mt-1 flex items-center gap-2 rounded-[12px] border border-outline-variant bg-surface-container/50 px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
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
      <div className="mt-1 flex items-center gap-2 rounded-[12px] border border-outline-variant bg-white px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
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
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          className="text-on-surface-muted transition hover:text-primary"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
