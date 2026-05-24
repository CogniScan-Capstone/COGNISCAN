"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Search,
  Trash2,
  User,
  Video,
} from "lucide-react";

import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import {
  getPsikologNav,
  psikologProfileHref,
  psikologUser as defaultPsikologUser,
} from "@/components/psikolog";
import {
  createPsikologAvailability,
  deletePsikologAvailability,
  fetchPsikologAvailability,
  fetchPsikologScheduleBookings,
  type PsikologAvailabilitySlot,
  type PsikologScheduleBooking,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";
import { cn } from "@/lib/utils";

type SessionMethod = "online" | "offline";
type SessionStatus =
  | "terjadwal"
  | "berlangsung"
  | "selesai"
  | "terlewat"
  | "menunggu_reschedule"
  | "reschedule_disetujui"
  | "reschedule_ditolak"
  | "ditutup"
  | "dibatalkan_pasien"
  | "payment_kedaluwarsa";
type MethodFilter = "semua" | "online" | "offline";

type Session = {
  id: string;
  time: string;
  endTime?: string | null;
  name: string;
  email: string;
  topic: string;
  topicTone: "peach" | "orange" | "lilac" | "green" | "blue";
  method: SessionMethod;
  meetLink?: string | null;
  location?: string | null;
  status: SessionStatus;
};

const topicToneClass: Record<Session["topicTone"], string> = {
  peach: "border-[#f1d2c5] bg-[#fce6dc] text-[#a3553c]",
  orange: "border-[#fadcb5] bg-[#fdedd6] text-[#a35a1a]",
  lilac: "border-[#dbcfee] bg-[#e8e0f0] text-[#6f5794]",
  green: "border-[#c4ddc5] bg-[#dfeedf] text-[#3f5a3f]",
  blue: "border-[#c7d5ec] bg-[#e8effb] text-[#47658f]",
};

const statusLabel: Record<SessionStatus, string> = {
  terjadwal: "Terjadwal",
  berlangsung: "Berlangsung",
  selesai: "Selesai",
  terlewat: "Terlewat",
  menunggu_reschedule: "Menunggu Reschedule",
  reschedule_disetujui: "Reschedule Disetujui",
  reschedule_ditolak: "Reschedule Ditolak",
  ditutup: "Ditutup",
  dibatalkan_pasien: "Dibatalkan Pasien",
  payment_kedaluwarsa: "Pembayaran Kedaluwarsa",
};

const statusDot: Record<SessionStatus, string> = {
  terjadwal: "bg-on-surface-muted",
  berlangsung: "bg-[#d37300]",
  selesai: "bg-primary",
  terlewat: "bg-[#d37300]",
  menunggu_reschedule: "bg-[#d37300]",
  reschedule_disetujui: "bg-primary",
  reschedule_ditolak: "bg-[#d13a31]",
  ditutup: "bg-on-surface-muted",
  dibatalkan_pasien: "bg-[#d13a31]",
  payment_kedaluwarsa: "bg-on-surface-muted",
};

const statusText: Record<SessionStatus, string> = {
  terjadwal: "text-on-surface-muted",
  berlangsung: "text-[#d37300]",
  selesai: "text-primary",
  terlewat: "text-[#d37300]",
  menunggu_reschedule: "text-[#d37300]",
  reschedule_disetujui: "text-primary",
  reschedule_ditolak: "text-[#d13a31]",
  ditutup: "text-on-surface-muted",
  dibatalkan_pasien: "text-[#d13a31]",
  payment_kedaluwarsa: "text-on-surface-muted",
};

const timeOptions = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "19:00"];

const slotStatusCopy: Record<string, { label: string; className: string }> = {
  tersedia: {
    label: "Tersedia",
    className: "border-[#c4ddc5] bg-[#eef7ef] text-primary",
  },
  terisi: {
    label: "Terisi",
    className: "border-[#dbcfee] bg-[#e8e0f0] text-[#6f5794]",
  },
  nonaktif: {
    label: "Nonaktif",
    className: "border-outline-variant bg-surface-container text-on-surface-muted",
  },
  lampau: {
    label: "Lampau",
    className: "border-outline-variant bg-surface-container text-on-surface-muted",
  },
};

function formatDateId(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return dateStr;
  const days = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${days[date.getDay()]}, ${d} ${months[m - 1]} ${y}`;
}

function topicTone(topic?: string | null): Session["topicTone"] {
  const normalized = topic?.toLowerCase() || "";
  if (normalized.includes("keluarga")) return "peach";
  if (normalized.includes("pendidikan")) return "orange";
  if (normalized.includes("keuangan")) return "green";
  if (normalized.includes("hubungan")) return "blue";
  if (normalized.includes("kesehatan")) return "green";
  return "lilac";
}

function normalizeMethod(value?: string | null): SessionMethod {
  return value === "offline" ? "offline" : "online";
}

function normalizeStatus(value?: string | null): SessionStatus {
  if (value === "selesai") return "selesai";
  if (value === "berlangsung") return "berlangsung";
  if (value === "terlewat") return "terlewat";
  if (value === "menunggu_reschedule") return "menunggu_reschedule";
  if (value === "reschedule_disetujui") return "reschedule_disetujui";
  if (value === "reschedule_ditolak") return "reschedule_ditolak";
  if (value === "dibatalkan_pasien") return "dibatalkan_pasien";
  if (value === "payment_kedaluwarsa") return "payment_kedaluwarsa";
  if (value === "ditutup" || value === "dibatalkan") return "ditutup";
  return "terjadwal";
}

function toSession(booking: PsikologScheduleBooking): Session {
  const topic = booking.konteks_pemicu?.trim() || "Konsultasi";
  return {
    id: String(booking.id_pemesanan_konsultasi),
    time: booking.waktu_mulai || "-",
    endTime: booking.waktu_selesai,
    name: booking.nama_pasien || "Pasien CogniScan",
    email: booking.email_pasien || "-",
    topic,
    topicTone: topicTone(topic),
    method: normalizeMethod(booking.mode_konsultasi),
    meetLink: booking.link_pertemuan,
    location: booking.lokasi_konsultasi || "Alamat praktik belum diatur",
    status: normalizeStatus(booking.status_konsultasi),
  };
}

export default function JadwalDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);
  const backendUser = useBackendUser();
  const displayUser = {
    ...defaultPsikologUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPsikologUser.name,
  };

  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("semua");
  const [bookings, setBookings] = useState<PsikologScheduleBooking[]>([]);
  const [availability, setAvailability] = useState<PsikologAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slotTime, setSlotTime] = useState("09:00");
  const [savingSlot, setSavingSlot] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");
  const [slotError, setSlotError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadBookings() {
      setLoading(true);
      setError("");
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        }

        const [dataBookings, dataAvailability] = await Promise.all([
          fetchPsikologScheduleBookings(accessToken, {
            startDate: date,
            endDate: date,
          }),
          fetchPsikologAvailability(accessToken, {
            startDate: date,
            endDate: date,
          }),
        ]);
        if (mounted) {
          setBookings(dataBookings);
          setAvailability(dataAvailability);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat jadwal pasien.");
          setBookings([]);
          setAvailability([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBookings();

    return () => {
      mounted = false;
    };
  }, [date]);

  const sessions = useMemo(() => bookings.map(toSession), [bookings]);

  const counts = useMemo(() => {
    const online = sessions.filter((s) => s.method === "online").length;
    const offline = sessions.filter((s) => s.method === "offline").length;
    return { total: sessions.length, online, offline };
  }, [sessions]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      if (methodFilter !== "semua" && s.method !== methodFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.topic.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    });
  }, [methodFilter, query, sessions]);

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
    }
    return accessToken;
  }

  async function reloadAvailability() {
    const accessToken = await getAccessToken();
    const dataAvailability = await fetchPsikologAvailability(accessToken, {
      startDate: date,
      endDate: date,
    });
    setAvailability(dataAvailability);
  }

  async function handleCreateSlot() {
    if (!slotTime || savingSlot) return;
    setSavingSlot(true);
    setSlotError("");
    setSlotMessage("");

    try {
      const accessToken = await getAccessToken();
      await createPsikologAvailability(accessToken, {
        tanggal_praktik: date,
        waktu_mulai: slotTime,
      });
      setSlotMessage("Slot berhasil ditambahkan.");
      await reloadAvailability();
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : "Gagal menambahkan slot.");
    } finally {
      setSavingSlot(false);
    }
  }

  async function handleDeleteSlot(idJadwalPsikolog: number) {
    if (savingSlot) return;
    setSavingSlot(true);
    setSlotError("");
    setSlotMessage("");

    try {
      const accessToken = await getAccessToken();
      const result = await deletePsikologAvailability(accessToken, idJadwalPsikolog);
      setSlotMessage(result.message || "Slot berhasil dihapus.");
      await reloadAvailability();
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : "Gagal menghapus slot.");
    } finally {
      setSavingSlot(false);
    }
  }

  return (
    <DashboardLayout
      title="Jadwal"
      navItems={getPsikologNav("jadwal")}
      user={displayUser}
      profileHref={psikologProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/psikolog/jadwal"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-on-surface-variant transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Kalender
          </Link>
        </div>

        <DashboardCard className="overflow-hidden bg-gradient-to-br from-[#dfeedf] to-[#e8e0f0]/40 px-7 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6f5794]">
                Detail Jadwal
              </p>
              <h2 className="mt-1 text-[22px] font-bold text-on-surface">
                {formatDateId(date)}
              </h2>
              <p className="mt-1 text-[14px] text-on-surface-variant">
                Daftar pasien yang sudah membayar konsultasi pada tanggal ini.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatPill label="Total Pasien" value={String(counts.total)} />
              <StatPill label="Online" value={String(counts.online)} icon={Video} />
              <StatPill
                label="Offline"
                value={String(counts.offline)}
                icon={MapPin}
              />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="inline-flex items-center gap-2 text-[18px] font-bold text-on-surface">
                <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                Slot Availability
              </h3>
              <p className="mt-1 text-[14px] text-on-surface-variant">
                Slot kosong bisa dihapus. Slot terisi dikunci agar jadwal pasien tetap aman.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={slotTime}
                onChange={(event) => setSlotTime(event.target.value)}
                className="h-10 rounded-full border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCreateSlot}
                disabled={savingSlot}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#365f39] disabled:cursor-wait disabled:opacity-70"
              >
                {savingSlot ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                Tambah Slot
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {availability.length === 0 ? (
              <p className="rounded-[12px] border border-dashed border-outline-variant px-4 py-5 text-sm font-medium text-on-surface-variant md:col-span-2 xl:col-span-3">
                Belum ada slot pada tanggal ini.
              </p>
            ) : (
              availability.map((slot) => {
                const statusInfo = slotStatusCopy[slot.status_slot] ?? slotStatusCopy.nonaktif;
                const canDelete = slot.status_slot === "tersedia";
                return (
                  <div
                    key={slot.id_jadwal_psikolog}
                    className="flex items-center justify-between gap-3 rounded-[12px] border border-outline-variant bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-[17px] font-bold text-on-surface">
                        {slot.waktu_mulai || "-"}
                        {slot.waktu_selesai ? (
                          <span className="text-sm font-medium text-on-surface-muted">
                            {" "}
                            - {slot.waktu_selesai}
                          </span>
                        ) : null}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-bold",
                            statusInfo.className,
                          )}
                        >
                          {statusInfo.label}
                        </span>
                        {slot.nama_pasien ? (
                          <span className="text-xs font-medium text-on-surface-variant">
                            {slot.nama_pasien}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id_jadwal_psikolog)}
                      disabled={!canDelete || savingSlot}
                      aria-label="Hapus slot"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {slotMessage ? (
            <p className="mt-4 rounded-[10px] border border-[#c4ddc5] bg-[#eef7ef] px-4 py-3 text-sm font-semibold text-primary">
              {slotMessage}
            </p>
          ) : null}
          {slotError ? (
            <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {slotError}
            </p>
          ) : null}
        </DashboardCard>

        <DashboardCard className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama pasien, email, atau topik..."
              className="h-10 w-full rounded-full border border-outline-variant bg-white pl-10 pr-4 text-[14px] text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-white p-1">
            {(["semua", "online", "offline"] as MethodFilter[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethodFilter(m)}
                className={cn(
                  "h-8 rounded-full px-4 text-[13px] font-semibold capitalize transition",
                  methodFilter === m
                    ? "bg-[#3f5a3f] text-white"
                    : "text-on-surface-variant hover:text-primary",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </DashboardCard>

        {error ? (
          <DashboardCard className="px-8 py-6">
            <p className="text-[15px] font-medium text-red-700">{error}</p>
          </DashboardCard>
        ) : null}

        <div className="space-y-4">
          {loading ? (
            <DashboardCard className="px-8 py-12 text-center">
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary" aria-hidden="true" />
              <p className="mt-4 text-[15px] font-medium text-on-surface-variant">
                Memuat jadwal pasien...
              </p>
            </DashboardCard>
          ) : visible.length === 0 ? (
            <DashboardCard className="px-8 py-12 text-center">
              <p className="text-[15px] text-on-surface-variant">
                Belum ada pasien berbayar pada tanggal ini.
              </p>
            </DashboardCard>
          ) : (
            visible.map((s) => (
              <DashboardCard key={s.id} className="px-6 py-5">
                <div className="grid gap-5 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-center">
                  <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-1">
                    <Clock
                      className="h-5 w-5 text-[#6f5794]"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-[20px] font-bold text-on-surface">
                        {s.time}
                      </p>
                      <p className="text-[12px] text-on-surface-muted">
                        {s.endTime ? `s.d. ${s.endTime}` : "WIB"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-bold text-on-surface">
                        {s.name}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[0.1em]",
                          topicToneClass[s.topicTone],
                        )}
                      >
                        {s.topic}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5 text-[13px] text-on-surface-variant sm:grid-cols-2">
                      <p className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        {s.email}
                      </p>
                      {s.method === "online" ? (
                        <p className="inline-flex items-center gap-1.5">
                          <Video className="h-3.5 w-3.5" aria-hidden="true" />
                          {s.meetLink ? (
                            <>
                              <a
                                href={s.meetLink.startsWith("http") ? s.meetLink : `https://${s.meetLink}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-primary hover:underline"
                              >
                                {s.meetLink.replace(/^https?:\/\//, "")}
                              </a>
                              <ExternalLink
                                className="h-3 w-3 text-on-surface-muted"
                                aria-hidden="true"
                              />
                            </>
                          ) : (
                            <span>Link meeting belum dibuat</span>
                          )}
                        </p>
                      ) : null}
                      {s.method === "offline" ? (
                        <p className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {s.location}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 text-[13px] font-semibold",
                        statusText[s.status],
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          statusDot[s.status],
                        )}
                      />
                      {statusLabel[s.status]}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-[12px] font-medium text-on-surface-variant">
                      {s.method === "online" ? (
                        <Video className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {s.method === "online" ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </DashboardCard>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-[14px] bg-white/85 px-4 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
        {label}
      </p>
      <p className="mt-1 inline-flex items-center justify-center gap-1.5 text-[18px] font-bold text-on-surface">
        {Icon ? (
          <Icon className="h-4 w-4 text-[#6f5794]" aria-hidden="true" />
        ) : (
          <User className="h-4 w-4 text-[#6f5794]" aria-hidden="true" />
        )}
        {value}
      </p>
    </div>
  );
}
