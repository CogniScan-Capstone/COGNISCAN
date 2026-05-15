"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import { getPsikologNav, psikologUser } from "@/components/psikolog";
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

function hashSeed(y: number, m: number, d: number) {
  return (y * 372 + (m + 1) * 31 + d) % 10;
}

function buildCalendar(year: number, month: number): DayInfo[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: DayInfo[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push(makeDay(year, month - 1, d, false));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(makeDay(year, month, d, true));
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const next = cells.length - firstDay - daysInMonth + 1;
    cells.push(makeDay(year, month + 1, next, false));
    if (cells.length >= 42) break;
  }
  return cells.slice(0, 42);
}

function makeDay(
  year: number,
  month: number,
  date: number,
  inMonth: boolean,
): DayInfo {
  const normalized = new Date(year, month, date);
  const seed = hashSeed(normalized.getFullYear(), normalized.getMonth(), date);
  const dayOfWeek = normalized.getDay();
  let slotsTotal = 8;
  let slotsFilled = 0;
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    slotsTotal = 0;
    slotsFilled = 0;
  } else {
    slotsTotal = 8;
    slotsFilled = Math.max(0, Math.min(slotsTotal, seed));
  }
  return {
    date,
    month: normalized.getMonth(),
    year: normalized.getFullYear(),
    inMonth,
    slotsTotal,
    slotsFilled,
  };
}

function dayStatus(day: DayInfo): SlotStatus {
  if (day.slotsTotal === 0) return "kosong";
  if (day.slotsFilled >= day.slotsTotal) return "penuh";
  return "tersedia";
}

function formatHref(day: DayInfo) {
  const m = String(day.month + 1).padStart(2, "0");
  const d = String(day.date).padStart(2, "0");
  return `/psikolog/jadwal/${day.year}-${m}-${d}`;
}

function getTodayParts() {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

export default function PsikologJadwalPage() {
  const [today] = useState(getTodayParts);
  const [viewYear, setViewYear] = useState(today.y);
  const [viewMonth, setViewMonth] = useState(today.m);
  const [yearOpen, setYearOpen] = useState(false);
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

  const cells = useMemo(
    () => buildCalendar(viewYear, viewMonth),
    [viewYear, viewMonth],
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

  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);

  return (
    <DashboardLayout
      title="Jadwal"
      navItems={getPsikologNav("jadwal")}
      user={psikologUser}
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
                Pantau ketersediaan slot konsultasi bulan ini.
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
            <div className="ml-auto text-on-surface-variant">
              Slot terisi:{" "}
              <span className="font-semibold text-on-surface">
                {stats.filledSlot}/{stats.totalSlot}
              </span>
            </div>
          </div>
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
                today &&
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
                            : "text-[#3f5a3f]",
                        )}
                      >
                        {status === "penuh" ? "Penuh" : "Tersedia"}
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
