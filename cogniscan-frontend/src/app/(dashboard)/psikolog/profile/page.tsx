"use client";

import { useState } from "react";
import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import { getPsikologNav, psikologUser } from "@/components/psikolog";
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
  address:
    "Klinik CogniScan, Jl. Gatot Subroto No. 88, Lt. 3 Ruang A, Jakarta Selatan",
};

export default function PsikologProfilePage() {
  const [profile, setProfile] = useState<ProfileForm>(initialProfile);
  const [draft, setDraft] = useState<ProfileForm>(initialProfile);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const dirty =
    draft.bio !== profile.bio ||
    draft.fullName !== profile.fullName ||
    draft.rate !== profile.rate ||
    draft.phone !== profile.phone ||
    draft.email !== profile.email ||
    draft.address !== profile.address;

  const passwordDirty =
    currentPassword !== "" || newPassword !== "" || confirmPassword !== "";

  const passwordMismatch =
    newPassword !== "" && confirmPassword !== "" && newPassword !== confirmPassword;

  const canSave =
    (dirty || passwordDirty) &&
    (!passwordDirty ||
      (currentPassword.length >= 6 &&
        newPassword.length >= 8 &&
        newPassword === confirmPassword));

  const handleSave = () => {
    if (!canSave) return;
    setProfile(draft);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setToast("Perubahan profil berhasil disimpan");
    setTimeout(() => setToast(null), 2400);
  };

  const handleCancel = () => {
    setDraft(profile);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const initials = profile.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <DashboardLayout
      title="Profile"
      navItems={getPsikologNav("dashboard")}
      user={psikologUser}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="space-y-6">
        {toast ? (
          <div className="flex items-center gap-2 rounded-full bg-[#dfeedf] px-4 py-2 text-[14px] font-semibold text-[#3f5a3f]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {toast}
          </div>
        ) : null}

        <DashboardCard className="overflow-hidden bg-gradient-to-br from-[#dfeedf] to-[#e8e0f0]/40 px-7 py-7">
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-[26px] font-bold text-[#3f5a3f] shadow-sm">
                {initials}
              </div>
              <button
                type="button"
                aria-label="Ganti foto profil"
                className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#3f5a3f] text-white shadow transition hover:bg-[#324a32]"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6f5794]">
                Profil Psikolog
              </p>
              <h2 className="mt-1 text-[22px] font-bold text-on-surface">
                {profile.fullName}
              </h2>
              <p className="mt-1 inline-flex items-center gap-2 text-[14px] text-on-surface-variant">
                <Shield className="h-4 w-4 text-[#3f5a3f]" aria-hidden="true" />
                Terverifikasi · CogniScan Partner
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard className="px-7 py-6">
          <SectionHeader
            title="Bio Singkat"
            description="Tampilkan diri Anda secara empatik kepada calon pasien."
          />
          <textarea
            value={draft.bio}
            onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
            rows={4}
            maxLength={320}
            className="mt-3 w-full resize-none rounded-[14px] border border-outline-variant bg-white px-4 py-3 text-[14px] leading-6 text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-right text-[12px] text-on-surface-muted">
            {draft.bio.length}/320
          </p>
        </DashboardCard>

        <DashboardCard className="px-7 py-6">
          <SectionHeader
            title="Data Diri"
            description="Informasi profesional yang ditampilkan di profil publik."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              icon={User}
              label="Nama Lengkap"
              value={draft.fullName}
              onChange={(v) => setDraft((d) => ({ ...d, fullName: v }))}
            />
            <Field
              icon={Wallet}
              label="Tarif Konsultasi"
              value={draft.rate}
              onChange={(v) => setDraft((d) => ({ ...d, rate: v }))}
            />
            <Field
              icon={Phone}
              label="Nomor HP"
              value={draft.phone}
              onChange={(v) => setDraft((d) => ({ ...d, phone: v }))}
            />
            <Field
              icon={Mail}
              label="Email"
              type="email"
              value={draft.email}
              onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
            />
          </div>
        </DashboardCard>

        <DashboardCard className="px-7 py-6">
          <SectionHeader
            title="Lokasi Praktik"
            description="Alamat tempat sesi offline berlangsung."
          />
          <div className="mt-3">
            <label className="text-[12px] font-semibold text-on-surface-variant">
              Alamat Lengkap
            </label>
            <div className="mt-1 flex items-start gap-2 rounded-[14px] border border-outline-variant bg-white px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <MapPin
                className="mt-0.5 h-4 w-4 text-on-surface-muted"
                aria-hidden="true"
              />
              <textarea
                value={draft.address}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, address: e.target.value }))
                }
                rows={2}
                className="w-full resize-none bg-transparent text-[14px] leading-6 text-on-surface focus:outline-none"
              />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard className="px-7 py-6">
          <SectionHeader
            title="Ubah Password"
            description="Kosongkan jika tidak ingin mengganti password."
          />
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PasswordField
              label="Password Saat Ini"
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
            />
            <PasswordField
              label="Password Baru"
              value={newPassword}
              onChange={setNewPassword}
              visible={showNew}
              onToggle={() => setShowNew((v) => !v)}
              helper="Minimal 8 karakter"
            />
            <PasswordField
              label="Konfirmasi Password Baru"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              error={passwordMismatch ? "Tidak cocok dengan password baru" : undefined}
            />
          </div>
        </DashboardCard>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!dirty && !passwordDirty}
            className="inline-flex h-11 items-center rounded-full border border-outline-variant bg-white px-6 text-[14px] font-semibold text-on-surface transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-outline-variant disabled:hover:text-on-surface"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              "inline-flex h-11 items-center rounded-full px-6 text-[14px] font-semibold text-white transition",
              canSave
                ? "bg-[#3f5a3f] hover:bg-[#324a32]"
                : "bg-[#3f5a3f]/40 cursor-not-allowed",
            )}
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-[16px] font-bold text-on-surface">{title}</h3>
      <p className="mt-1 text-[13px] text-on-surface-variant">{description}</p>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
}: {
  icon: typeof User;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[12px] font-semibold text-on-surface-variant">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2 rounded-[14px] border border-outline-variant bg-white px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Icon className="h-4 w-4 text-on-surface-muted" aria-hidden="true" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full bg-transparent text-[14px] text-on-surface focus:outline-none"
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
  helper,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  helper?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="text-[12px] font-semibold text-on-surface-variant">
        {label}
      </label>
      <div
        className={cn(
          "mt-1 flex items-center gap-2 rounded-[14px] border bg-white px-4",
          error
            ? "border-[#d13a31]/60 focus-within:border-[#d13a31] focus-within:ring-2 focus-within:ring-[#d13a31]/20"
            : "border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
        )}
      >
        <Lock className="h-4 w-4 text-on-surface-muted" aria-hidden="true" />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          className="h-11 w-full bg-transparent text-[14px] text-on-surface focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          className="text-on-surface-muted transition hover:text-primary"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-[12px] font-medium text-[#a3372e]">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-[12px] text-on-surface-muted">{helper}</p>
      ) : null}
    </div>
  );
}
