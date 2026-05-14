"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Search,
  User,
  Video,
} from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import { getPsikologNav, psikologUser } from "@/components/psikolog";
import { cn } from "@/lib/utils";

type SessionMethod = "online" | "offline";
type SessionStatus = "terjadwal" | "berlangsung" | "selesai";
type MethodFilter = "semua" | "online" | "offline";

type Session = {
  id: string;
  time: string;
  name: string;
  email: string;
  topic: string;
  topicTone: "peach" | "orange" | "lilac" | "green" | "blue";
  method: SessionMethod;
  meetLink?: string;
  location?: string;
  status: SessionStatus;
};

const sessions: Session[] = [
  {
    id: "s-1",
    time: "08:00",
    name: "Rina Marlina",
    email: "rina.marlina@mail.com",
    topic: "Keluarga",
    topicTone: "peach",
    method: "online",
    meetLink: "meet.google.com/abc-defg-hij",
    status: "selesai",
  },
  {
    id: "s-2",
    time: "09:00",
    name: "Dimas Pratama",
    email: "dimas.p@mail.com",
    topic: "Kecemasan",
    topicTone: "lilac",
    method: "online",
    meetLink: "meet.google.com/xyz-uvwq-rst",
    status: "berlangsung",
  },
  {
    id: "s-3",
    time: "10:00",
    name: "Sari Wulandari",
    email: "sari.w@mail.com",
    topic: "Pendidikan",
    topicTone: "orange",
    method: "offline",
    location: "Klinik CogniScan, Lt. 3 Ruang A",
    status: "terjadwal",
  },
  {
    id: "s-4",
    time: "11:00",
    name: "Bagas Nugroho",
    email: "bagas.n@mail.com",
    topic: "Keuangan",
    topicTone: "green",
    method: "online",
    meetLink: "meet.google.com/jkl-mnop-qrs",
    status: "terjadwal",
  },
  {
    id: "s-5",
    time: "13:00",
    name: "Lina Marlina",
    email: "lina.m@mail.com",
    topic: "Hubungan",
    topicTone: "blue",
    method: "offline",
    location: "Klinik CogniScan, Lt. 3 Ruang B",
    status: "terjadwal",
  },
  {
    id: "s-6",
    time: "14:00",
    name: "Andi Pranoto",
    email: "andi.p@mail.com",
    topic: "Kesehatan",
    topicTone: "green",
    method: "online",
    meetLink: "meet.google.com/tuv-wxyz-123",
    status: "terjadwal",
  },
  {
    id: "s-7",
    time: "15:00",
    name: "Maya Hapsari",
    email: "maya.h@mail.com",
    topic: "Tubuh",
    topicTone: "peach",
    method: "online",
    meetLink: "meet.google.com/aaa-bbbb-ccc",
    status: "terjadwal",
  },
  {
    id: "s-8",
    time: "16:00",
    name: "Toni Hartono",
    email: "toni.h@mail.com",
    topic: "Keluarga",
    topicTone: "peach",
    method: "offline",
    location: "Klinik CogniScan, Lt. 3 Ruang A",
    status: "terjadwal",
  },
  {
    id: "s-9",
    time: "17:00",
    name: "Nadya Putri",
    email: "nadya.p@mail.com",
    topic: "Pendidikan",
    topicTone: "orange",
    method: "online",
    meetLink: "meet.google.com/zzz-yyyy-xxx",
    status: "terjadwal",
  },
  {
    id: "s-10",
    time: "19:00",
    name: "Rendi Saputra",
    email: "rendi.s@mail.com",
    topic: "Hubungan",
    topicTone: "blue",
    method: "online",
    meetLink: "meet.google.com/mmm-nnnn-ooo",
    status: "terjadwal",
  },
];

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
};

const statusDot: Record<SessionStatus, string> = {
  terjadwal: "bg-on-surface-muted",
  berlangsung: "bg-[#d37300]",
  selesai: "bg-primary",
};

const statusText: Record<SessionStatus, string> = {
  terjadwal: "text-on-surface-muted",
  berlangsung: "text-[#d37300]",
  selesai: "text-primary",
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

export default function JadwalDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("semua");

  const counts = useMemo(() => {
    const online = sessions.filter((s) => s.method === "online").length;
    const offline = sessions.filter((s) => s.method === "offline").length;
    return { total: sessions.length, online, offline };
  }, []);

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
  }, [query, methodFilter]);

  return (
    <DashboardLayout
      title="Jadwal"
      navItems={getPsikologNav("jadwal")}
      user={psikologUser}
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
                Daftar lengkap sesi konsultasi pada hari ini.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatPill label="Total Slot" value={`${counts.total}/${counts.total}`} />
              <StatPill label="Online" value={String(counts.online)} icon={Video} />
              <StatPill
                label="Offline"
                value={String(counts.offline)}
                icon={MapPin}
              />
            </div>
          </div>
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
              placeholder="Cari nama pasien, email, atau topik…"
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

        <div className="space-y-4">
          {visible.length === 0 ? (
            <DashboardCard className="px-8 py-12 text-center">
              <p className="text-[15px] text-on-surface-variant">
                Tidak ada sesi yang cocok dengan filter ini.
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
                      <p className="text-[12px] text-on-surface-muted">WIB</p>
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
                      {s.method === "online" && s.meetLink ? (
                        <p className="inline-flex items-center gap-1.5">
                          <Video className="h-3.5 w-3.5" aria-hidden="true" />
                          <a
                            href={`https://${s.meetLink}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {s.meetLink}
                          </a>
                          <ExternalLink
                            className="h-3 w-3 text-on-surface-muted"
                            aria-hidden="true"
                          />
                        </p>
                      ) : null}
                      {s.method === "offline" && s.location ? (
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
  icon?: typeof User;
}) {
  return (
    <div className="rounded-[14px] bg-white/85 px-4 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
        {label}
      </p>
      <p className="mt-1 inline-flex items-center justify-center gap-1.5 text-[18px] font-bold text-on-surface">
        {Icon ? (
          <Icon className="h-4 w-4 text-[#6f5794]" aria-hidden="true" />
        ) : null}
        {value}
      </p>
    </div>
  );
}
