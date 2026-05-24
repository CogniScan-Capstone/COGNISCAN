"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCcw,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import {
  getPsikologNav,
  psikologProfileHref,
  psikologUser as defaultPsikologUser,
} from "@/components/psikolog";
import {
  approvePsikologRescheduleRequest,
  createPsikologAvailability,
  createPsikologAvailabilityBulk,
  fetchPsikologAvailability,
  fetchPsikologRescheduleRequests,
  rejectPsikologRescheduleRequest,
  type RescheduleRequest,
  type PsikologAvailabilitySlot,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { useBackendUser } from "@/lib/useBackendUser";
import { cn } from "@/lib/utils";

type SlotStatus = "penuh" | "tersedia" | "kosong";

type DayInfo = {
  date: number;
  month: number;
  year: number;
  inMonth: boolean;
  slotsTotal: number;
  slotsFilled: number;
};

type SlotCount = {
  total: number;
  filled: number;
};

const monthNames = [
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

const dayHeaders = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const timeOptions = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "19:00"];
const weekdayOptions = [
  { id: 1, label: "Sen" },
  { id: 2, label: "Sel" },
  { id: 3, label: "Rab" },
  { id: 4, label: "Kam" },
  { id: 5, label: "Jum" },
  { id: 6, label: "Sab" },
  { id: 0, label: "Min" },
];

function formatDateKey(year: number, month: number, date: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

function buildCalendar(
  year: number,
  month: number,
  slotCounts: Map<string, SlotCount>,
): DayInfo[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: DayInfo[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push(makeDay(year, month - 1, d, false, slotCounts));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(makeDay(year, month, d, true, slotCounts));
  }

  while (cells.length < 42) {
    const next = cells.length - firstDay - daysInMonth + 1;
    cells.push(makeDay(year, month + 1, next, false, slotCounts));
  }

  return cells.slice(0, 42);
}

function makeDay(
  year: number,
  month: number,
  date: number,
  inMonth: boolean,
  slotCounts: Map<string, SlotCount>,
): DayInfo {
  const normalized = new Date(year, month, date);
  const normalizedYear = normalized.getFullYear();
  const normalizedMonth = normalized.getMonth();
  const normalizedDate = normalized.getDate();
  const counts = slotCounts.get(
    formatDateKey(normalizedYear, normalizedMonth, normalizedDate),
  ) ?? { total: 0, filled: 0 };

  return {
    date: normalizedDate,
    month: normalizedMonth,
    year: normalizedYear,
    inMonth,
    slotsTotal: counts.total,
    slotsFilled: counts.filled,
  };
}

function dayStatus(day: DayInfo): SlotStatus {
  if (day.slotsTotal === 0) return "kosong";
  if (day.slotsFilled >= day.slotsTotal && day.slotsFilled > 0) return "penuh";
  return "tersedia";
}

function formatHref(day: DayInfo) {
  return `/psikolog/jadwal/${formatDateKey(day.year, day.month, day.date)}`;
}

function getTodayParts() {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

function monthRange(year: number, month: number) {
  return {
    startDate: formatDateKey(year, month, 1),
    endDate: formatDateKey(year, month, new Date(year, month + 1, 0).getDate()),
  };
}

function addMonths(year: number, month: number, count: number) {
  const value = new Date(year, month + count, 1);
  return value;
}

function formatRequestDate(value?: string | null) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
}

export default function PsikologJadwalPage() {
  const backendUser = useBackendUser();
  const displayUser = {
    ...defaultPsikologUser,
    name: backendUser?.nama_lengkap?.trim() || defaultPsikologUser.name,
  };

  const [today] = useState(getTodayParts);
  const [viewYear, setViewYear] = useState(today.y);
  const [viewMonth, setViewMonth] = useState(today.m);
  const [yearOpen, setYearOpen] = useState(false);
  const [availability, setAvailability] = useState<PsikologAvailabilitySlot[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<RescheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slotDate, setSlotDate] = useState(() => formatDateKey(today.y, today.m, today.d));
  const [slotTime, setSlotTime] = useState("09:00");
  const [bulkStartDate, setBulkStartDate] = useState(() => formatDateKey(today.y, today.m, today.d));
  const [bulkEndDate, setBulkEndDate] = useState(() => {
    const nextMonth = addMonths(today.y, today.m, 1);
    return formatDateKey(nextMonth.getFullYear(), nextMonth.getMonth(), nextMonth.getDate());
  });
  const [bulkWeekdays, setBulkWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bulkTimes, setBulkTimes] = useState<string[]>(["09:00", "10:00", "11:00", "13:00", "14:00"]);
  const [savingSlot, setSavingSlot] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<number, string>>({});
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const yearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!yearOpen) return;
    const handler = (e: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setYearOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [yearOpen]);

  async function loadAvailability({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
      }

      const range = monthRange(viewYear, viewMonth);
      const [dataAvailability, dataRequests] = await Promise.all([
        fetchPsikologAvailability(accessToken, range),
        fetchPsikologRescheduleRequests(accessToken, { status: "pending" }),
      ]);
      setAvailability(dataAvailability);
      setRescheduleRequests(dataRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat slot jadwal.");
      setAvailability([]);
      setRescheduleRequests([]);
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadCurrentMonth() {
      setLoading(true);
      setError("");

      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        }

        const range = monthRange(viewYear, viewMonth);
        const [dataAvailability, dataRequests] = await Promise.all([
          fetchPsikologAvailability(accessToken, range),
          fetchPsikologRescheduleRequests(accessToken, { status: "pending" }),
        ]);
        if (mounted) {
          setAvailability(dataAvailability);
          setRescheduleRequests(dataRequests);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat slot jadwal.");
          setAvailability([]);
          setRescheduleRequests([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCurrentMonth();

    return () => {
      mounted = false;
    };
  }, [viewMonth, viewYear]);

  const slotCounts = useMemo(() => {
    const counts = new Map<string, SlotCount>();
    availability.forEach((slot) => {
      if (!slot.tanggal_praktik) return;
      const current = counts.get(slot.tanggal_praktik) ?? { total: 0, filled: 0 };
      counts.set(slot.tanggal_praktik, {
        total: current.total + 1,
        filled: current.filled + (slot.status_slot === "terisi" ? 1 : 0),
      });
    });
    return counts;
  }, [availability]);

  const cells = useMemo(
    () => buildCalendar(viewYear, viewMonth, slotCounts),
    [slotCounts, viewMonth, viewYear],
  );

  const stats = useMemo(() => {
    const inMonth = cells.filter((c) => c.inMonth);
    const penuh = inMonth.filter((c) => dayStatus(c) === "penuh").length;
    const tersedia = inMonth.filter((c) => dayStatus(c) === "tersedia").length;
    const totalSlot = inMonth.reduce((sum, c) => sum + c.slotsTotal, 0);
    const filledSlot = inMonth.reduce((sum, c) => sum + c.slotsFilled, 0);
    return { penuh, tersedia, totalSlot, filledSlot };
  }, [cells]);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setViewYear(today.y);
    setViewMonth(today.m);
  };

  const years = Array.from({ length: 7 }, (_, i) => today.y - 2 + i);

  const toggleBulkWeekday = (weekday: number) => {
    setBulkWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((item) => item !== weekday)
        : [...current, weekday],
    );
  };

  const toggleBulkTime = (time: string) => {
    setBulkTimes((current) =>
      current.includes(time)
        ? current.filter((item) => item !== time)
        : [...current, time],
    );
  };

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
    }
    return accessToken;
  }

  async function handleCreateSlot() {
    if (!slotDate || !slotTime || savingSlot) return;

    setSavingSlot(true);
    setActionError("");
    setActionMessage("");

    try {
      const accessToken = await getAccessToken();
      await createPsikologAvailability(accessToken, {
        tanggal_praktik: slotDate,
        waktu_mulai: slotTime,
      });
      setActionMessage("Slot berhasil ditambahkan.");
      await loadAvailability({ quiet: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menambahkan slot.");
    } finally {
      setSavingSlot(false);
    }
  }

  async function handleCreateBulkSlots() {
    if (!bulkStartDate || !bulkEndDate || bulkWeekdays.length === 0 || bulkTimes.length === 0 || savingSlot) {
      return;
    }

    setSavingSlot(true);
    setActionError("");
    setActionMessage("");

    try {
      const accessToken = await getAccessToken();
      const result = await createPsikologAvailabilityBulk(accessToken, {
        start_date: bulkStartDate,
        end_date: bulkEndDate,
        weekdays: bulkWeekdays,
        slots: bulkTimes.map((time) => ({ waktu_mulai: time })),
      });
      setActionMessage(
        `${result.created_count} slot dibuat. ${result.skipped_count} slot dilewati karena lampau atau bentrok.`,
      );
      await loadAvailability({ quiet: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal membuat slot mingguan.");
    } finally {
      setSavingSlot(false);
    }
  }

  async function handleApproveRequest(requestId: number) {
    if (processingRequestId) return;

    setProcessingRequestId(requestId);
    setActionError("");
    setActionMessage("");

    try {
      const accessToken = await getAccessToken();
      await approvePsikologRescheduleRequest(
        accessToken,
        requestId,
        decisionNotes[requestId]?.trim(),
      );
      setRescheduleRequests((current) =>
        current.filter((request) => request.id_permintaan_reschedule !== requestId),
      );
      setActionMessage("Pengajuan reschedule disetujui. Pasien bisa memilih slot baru.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menyetujui pengajuan.");
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleRejectRequest(requestId: number) {
    if (processingRequestId) return;

    const note = decisionNotes[requestId]?.trim() || "";
    if (note.length < 5) {
      setActionError("Catatan penolakan wajib diisi minimal 5 karakter.");
      return;
    }

    setProcessingRequestId(requestId);
    setActionError("");
    setActionMessage("");

    try {
      const accessToken = await getAccessToken();
      await rejectPsikologRescheduleRequest(accessToken, requestId, note);
      setRescheduleRequests((current) =>
        current.filter((request) => request.id_permintaan_reschedule !== requestId),
      );
      setActionMessage("Pengajuan reschedule ditolak dan catatan dikirim ke pasien.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menolak pengajuan.");
    } finally {
      setProcessingRequestId(null);
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
        <DashboardCard className="px-7 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-bold text-on-surface">
                {monthNames[viewMonth]} {viewYear}
              </h2>
              <p className="mt-1 text-[14px] text-on-surface-variant">
                Buat slot terlebih dahulu agar pasien bisa memilih jadwal konsultasi.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div ref={yearRef} className="relative">
                <button
                  type="button"
                  onClick={() => setYearOpen((o) => !o)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-outline-variant bg-white px-4 text-[14px] font-semibold text-on-surface transition hover:border-primary"
                >
                  {viewYear}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      yearOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
                {yearOpen ? (
                  <ul
                    className="absolute right-0 z-20 mt-2 min-w-[120px] overflow-hidden rounded-[12px] border border-outline-variant bg-white py-1 shadow-[0_18px_36px_-18px_rgba(27,28,26,0.22)]"
                    role="listbox"
                  >
                    {years.map((y) => (
                      <li key={y}>
                        <button
                          type="button"
                          onClick={() => {
                            setViewYear(y);
                            setYearOpen(false);
                          }}
                          className={cn(
                            "block w-full px-4 py-2 text-left text-[14px] font-medium transition-colors",
                            y === viewYear
                              ? "bg-primary-container/15 text-primary"
                              : "text-on-surface hover:bg-surface-container",
                          )}
                        >
                          {y}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Bulan sebelumnya"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition hover:border-primary hover:text-primary"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="inline-flex h-10 items-center rounded-full border border-outline-variant bg-white px-4 text-[14px] font-semibold text-on-surface transition hover:border-primary hover:text-primary"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Bulan berikutnya"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition hover:border-primary hover:text-primary"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-5 text-[13px]">
            <LegendItem
              dot="bg-[#3f5a3f]"
              label="Slot Penuh"
              count={stats.penuh}
            />
            <LegendItem
              dot="bg-white border border-outline-variant"
              label="Slot Tersedia"
              count={stats.tersedia}
            />
            <LegendItem dot="bg-[#a98ad6]" label="Hari Ini" />
            <div className="ml-auto inline-flex items-center gap-2 text-on-surface-variant">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Slot terisi:{" "}
              <span className="font-semibold text-on-surface">
                {stats.filledSlot}/{stats.totalSlot}
              </span>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </DashboardCard>

        <DashboardCard className="px-7 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="inline-flex items-center gap-2 text-[18px] font-bold text-on-surface">
                <RotateCcw className="h-5 w-5 text-[#d37300]" aria-hidden="true" />
                Permintaan Reschedule
              </h3>
              <p className="mt-1 text-[14px] leading-6 text-on-surface-variant">
                Setujui jika pasien boleh memilih slot baru. Tolak dengan catatan jika jadwal tetap mengikuti booking awal.
              </p>
            </div>
            <span className="inline-flex h-8 items-center rounded-full border border-[#f0d36d] bg-[#fff2bf] px-3 text-sm font-bold text-[#d37300]">
              {rescheduleRequests.length} pending
            </span>
          </div>

          {rescheduleRequests.length === 0 ? (
            <div className="mt-5 rounded-[12px] border border-dashed border-outline-variant px-4 py-5 text-sm font-medium text-on-surface-variant">
              Belum ada permintaan reschedule yang perlu diproses.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {rescheduleRequests.map((request) => {
                const note = decisionNotes[request.id_permintaan_reschedule] ?? "";
                const processing = processingRequestId === request.id_permintaan_reschedule;
                return (
                  <div
                    key={request.id_permintaan_reschedule}
                    className="rounded-[14px] border border-outline-variant bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[16px] font-bold text-on-surface">
                          {request.nama_pasien || "Pasien CogniScan"}
                        </p>
                        <p className="mt-1 text-sm font-medium text-on-surface-variant">
                          {formatRequestDate(request.tanggal_konsultasi)}, {request.waktu_konsultasi || "-"}
                        </p>
                      </div>
                      <span className="inline-flex h-7 items-center rounded-full border border-[#f0d36d] bg-[#fff2bf] px-3 text-xs font-bold text-[#d37300]">
                        Pending
                      </span>
                    </div>

                    <div className="mt-4 rounded-[12px] bg-surface-container/60 px-4 py-3 text-sm leading-6 text-on-surface-variant">
                      <p className="font-semibold text-on-surface">Alasan pasien</p>
                      <p className="mt-1">{request.alasan_pasien}</p>
                    </div>

                    <label className="mt-4 block text-sm font-semibold text-on-surface">
                      Catatan untuk pasien
                      <textarea
                        value={note}
                        onChange={(event) =>
                          setDecisionNotes((current) => ({
                            ...current,
                            [request.id_permintaan_reschedule]: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Opsional saat setuju, wajib saat menolak."
                        className="mt-2 w-full resize-none rounded-[10px] border border-outline-variant bg-white px-3 py-3 text-sm font-medium leading-6 text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(request.id_permintaan_reschedule)}
                        disabled={Boolean(processingRequestId)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#365f39] disabled:cursor-wait disabled:opacity-70"
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        )}
                        Setujui
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(request.id_permintaan_reschedule)}
                        disabled={Boolean(processingRequestId)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-200 px-5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                        )}
                        Tolak
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>

        <DashboardCard className="px-7 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="inline-flex items-center gap-2 text-[18px] font-bold text-on-surface">
                <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                Kelola Availability
              </h3>
              <p className="mt-1 text-[14px] leading-6 text-on-surface-variant">
                Slot yang dibuat di sini akan langsung menjadi pilihan jadwal pasien.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadAvailability({ quiet: false })}
              disabled={loading || savingSlot}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-[14px] border border-outline-variant bg-surface-container/40 p-4">
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
                Tambah Satu Slot
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_130px]">
                <input
                  type="date"
                  value={slotDate}
                  onChange={(event) => setSlotDate(event.target.value)}
                  className="h-11 rounded-[10px] border border-outline-variant bg-white px-3 text-sm font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={slotTime}
                  onChange={(event) => setSlotTime(event.target.value)}
                  className="h-11 rounded-[10px] border border-outline-variant bg-white px-3 text-sm font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleCreateSlot}
                disabled={savingSlot}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#365f39] disabled:cursor-wait disabled:opacity-70"
              >
                {savingSlot ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                Tambah Slot
              </button>
            </div>

            <div className="rounded-[14px] border border-outline-variant bg-white p-4">
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
                Buat Slot Mingguan
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={(event) => setBulkStartDate(event.target.value)}
                  className="h-11 rounded-[10px] border border-outline-variant bg-white px-3 text-sm font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="date"
                  value={bulkEndDate}
                  onChange={(event) => setBulkEndDate(event.target.value)}
                  className="h-11 rounded-[10px] border border-outline-variant bg-white px-3 text-sm font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-on-surface">Hari</p>
                <div className="flex flex-wrap gap-2">
                  {weekdayOptions.map((weekday) => {
                    const active = bulkWeekdays.includes(weekday.id);
                    return (
                      <button
                        key={weekday.id}
                        type="button"
                        onClick={() => toggleBulkWeekday(weekday.id)}
                        className={cn(
                          "h-9 rounded-full border px-4 text-sm font-semibold transition",
                          active
                            ? "border-primary bg-primary text-white"
                            : "border-outline-variant bg-white text-on-surface-variant hover:border-primary hover:text-primary",
                        )}
                      >
                        {weekday.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-on-surface">Jam</p>
                <div className="flex flex-wrap gap-2">
                  {timeOptions.map((time) => {
                    const active = bulkTimes.includes(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => toggleBulkTime(time)}
                        className={cn(
                          "h-9 rounded-full border px-4 text-sm font-semibold transition",
                          active
                            ? "border-[#7a9479] bg-[#7a9479] text-white"
                            : "border-outline-variant bg-white text-on-surface-variant hover:border-primary hover:text-primary",
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateBulkSlots}
                disabled={savingSlot || bulkWeekdays.length === 0 || bulkTimes.length === 0}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#7a9479] px-6 text-sm font-semibold text-white transition hover:bg-[#6a8669] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSlot ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarPlus className="h-4 w-4" aria-hidden="true" />}
                Buat Slot Mingguan
              </button>
            </div>
          </div>

          {actionMessage ? (
            <p className="mt-4 rounded-[10px] border border-[#c4ddc5] bg-[#eef7ef] px-4 py-3 text-sm font-semibold text-primary">
              {actionMessage}
            </p>
          ) : null}
          {actionError ? (
            <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {actionError}
            </p>
          ) : null}
        </DashboardCard>

        <DashboardCard className="px-3 py-3 sm:px-5 sm:py-5">
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-muted">
            {dayHeaders.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {cells.map((day, idx) => {
              const status = dayStatus(day);
              const isToday =
                today.y === day.year &&
                today.m === day.month &&
                today.d === day.date &&
                day.inMonth;
              const clickable = day.inMonth && day.slotsTotal > 0;
              const content = (
                <div
                  className={cn(
                    "flex h-[88px] flex-col justify-between rounded-[14px] border p-2.5 text-left transition",
                    !day.inMonth && "border-transparent bg-transparent text-on-surface-muted/50",
                    day.inMonth && status === "kosong" &&
                      "border-outline-variant/50 bg-surface-container/40 text-on-surface-muted",
                    day.inMonth && status === "tersedia" &&
                      "border-outline-variant bg-white text-on-surface hover:border-primary",
                    day.inMonth && status === "penuh" &&
                      "border-transparent bg-[#3f5a3f] text-white hover:bg-[#324a32]",
                    isToday && "ring-2 ring-[#a98ad6] ring-offset-2 ring-offset-white",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        "text-[14px] font-bold",
                        isToday && "text-[#6f5794]",
                      )}
                    >
                      {day.date}
                    </span>
                    {isToday ? (
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#a98ad6]" />
                    ) : null}
                  </div>
                  {day.inMonth && day.slotsTotal > 0 ? (
                    <div className="text-[11px] font-medium">
                      <p
                        className={cn(
                          status === "penuh" ? "text-white/85" : "text-on-surface-variant",
                        )}
                      >
                        {day.slotsFilled}/{day.slotsTotal} slot
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 font-semibold",
                          status === "penuh"
                            ? "text-white"
                            : day.slotsFilled > 0
                              ? "text-[#3f5a3f]"
                              : "text-on-surface-muted",
                        )}
                      >
                        {day.slotsFilled > 0 ? "Ada Pasien" : "Tersedia"}
                      </p>
                    </div>
                  ) : day.inMonth ? (
                    <p className="text-[11px] font-medium text-on-surface-muted">
                      Libur
                    </p>
                  ) : null}
                </div>
              );
              return clickable ? (
                <Link key={idx} href={formatHref(day)} className="block">
                  {content}
                </Link>
              ) : (
                <div key={idx}>{content}</div>
              );
            })}
          </div>
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
}

function LegendItem({
  dot,
  label,
  count,
}: {
  dot: string;
  label: string;
  count?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-on-surface-variant">
      <span className={cn("inline-block h-3 w-3 rounded-full", dot)} />
      <span className="font-medium">{label}</span>
      {typeof count === "number" ? (
        <span className="text-on-surface-muted">({count})</span>
      ) : null}
    </span>
  );
}
