"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser } from "@/components/patient";
import { cn } from "@/lib/utils";

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
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
const monthShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const times = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "19:00"];
const methods = [
  { id: "online", label: "Online (Video Call)" },
  { id: "offline", label: "Offline (Tatap Muka)" },
] as const;

type Method = (typeof methods)[number]["id"];
type DayCell = { year: number; month: number; day: number; muted: boolean };

function buildCalendarDays(year: number, month: number): DayCell[] {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: DayCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ year: month === 0 ? year - 1 : year, month: (month - 1 + 12) % 12, day: daysInPrev - i, muted: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ year, month, day, muted: false });
  }
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    cells.push({ year: month === 11 ? year + 1 : year, month: (month + 1) % 12, day, muted: true });
  }

  return cells;
}

function isSameYMD(a: { year: number; month: number; day: number }, b: Date) {
  return a.year === b.getFullYear() && a.month === b.getMonth() && a.day === b.getDate();
}

function formatSelectedDate(date: Date) {
  return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export default function PatientBookingSchedulePage() {
  const [viewDate, setViewDate] = useState(() => new Date(2026, 4, 1));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(2026, 4, 12));
  const [selectedTime, setSelectedTime] = useState<string>("11:00");
  const [selectedMethod, setSelectedMethod] = useState<Method>("online");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [today] = useState(() => {
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    return current;
  });
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const cells = buildCalendarDays(viewDate.getFullYear(), viewDate.getMonth());

  return (
    <DashboardLayout
      title="Booking"
      navItems={getPatientNav("booking")}
      user={patientUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="max-w-[940px]">
        <div className="mb-12 border-b border-outline-variant">
          <div className="flex flex-wrap gap-6">
            <button
              type="button"
              className="inline-flex h-14 items-center gap-2 border-b-2 border-primary px-6 text-[16px] font-semibold text-primary"
            >
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              Buat Booking
            </button>
            <a
              href="/pasien/booking/receipt"
              className="inline-flex h-14 items-center gap-2 border-b-2 border-transparent px-6 text-[16px] font-semibold text-on-surface-muted transition-colors hover:text-primary"
            >
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
              Riwayat & Receipt
            </a>
          </div>
        </div>

        <h2 className="mb-12 text-[34px] font-extrabold leading-none tracking-[-0.02em] text-[#a98ad6]">
          Booking Konsultasi
        </h2>

        <div className="grid gap-8 xl:grid-cols-[372px_1fr]">
          <DashboardCard className="relative p-6">
            <div className="mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                aria-haspopup="dialog"
                aria-expanded={pickerOpen}
                className="rounded-md text-[18px] font-bold text-on-surface transition-colors hover:text-primary-container"
              >
                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
              </button>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                  aria-label="Bulan sebelumnya"
                  className="rounded-md p-1 transition-colors hover:bg-surface-container"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                  aria-label="Bulan berikutnya"
                  className="rounded-md p-1 transition-colors hover:bg-surface-container"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {pickerOpen ? (
              <div
                ref={pickerRef}
                role="dialog"
                aria-label="Pilih bulan dan tahun"
                className="absolute left-6 right-6 top-[60px] z-20 rounded-[14px] border border-outline-variant bg-white p-4 shadow-[0_20px_40px_-18px_rgba(27,28,26,0.25)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1))}
                    aria-label="Tahun sebelumnya"
                    className="rounded-md p-1 transition-colors hover:bg-surface-container"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="text-[15px] font-semibold text-on-surface">{viewDate.getFullYear()}</span>
                  <button
                    type="button"
                    onClick={() => setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1))}
                    aria-label="Tahun berikutnya"
                    className="rounded-md p-1 transition-colors hover:bg-surface-container"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {monthShort.map((month, index) => {
                    const active = index === viewDate.getMonth();
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => {
                          setViewDate(new Date(viewDate.getFullYear(), index, 1));
                          setPickerOpen(false);
                        }}
                        className={cn(
                          "rounded-full px-3 py-2 text-[13px] font-medium transition-colors",
                          active ? "bg-[#7a9479] text-white" : "text-on-surface hover:bg-surface-container",
                        )}
                      >
                        {month}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-7 gap-y-4 text-center">
              {weekdays.map((day, index) => (
                <div key={`${day}-${index}`} className="text-xs font-bold text-on-surface-muted">
                  {day}
                </div>
              ))}
              {cells.map((cell, index) => {
                const isToday = isSameYMD(cell, today);
                const isSelected = isSameYMD(cell, selectedDate);
                return (
                  <button
                    key={`${cell.year}-${cell.month}-${cell.day}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedDate(new Date(cell.year, cell.month, cell.day));
                      if (cell.muted) setViewDate(new Date(cell.year, cell.month, 1));
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${cell.day} ${monthNames[cell.month]} ${cell.year}`}
                    className={cn(
                      "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                      cell.muted && !isSelected && "text-outline-variant",
                      !cell.muted && !isSelected && "text-on-surface",
                      isToday && !isSelected && "border border-primary-container",
                      isSelected && "bg-[#7a9479] text-white",
                      !isSelected && !cell.muted && "hover:bg-primary-container/15",
                      !isSelected && cell.muted && "hover:bg-surface-container",
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </DashboardCard>

          <DashboardCard className="p-8">
            <h3 className="mb-7 text-[20px] font-semibold text-[#a98ad6]">
              {formatSelectedDate(selectedDate)}
            </h3>

            <section>
              <h4 className="mb-4 text-[15px] font-semibold text-on-surface">Pilih Waktu</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {times.map((time) => {
                  const active = selectedTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      aria-pressed={active}
                      className={cn(
                        "h-10 rounded-full border border-outline-variant bg-white text-[15px] font-medium transition-colors hover:border-primary hover:text-primary",
                        active && "border-[#7a9479] bg-[#7a9479] text-white hover:border-[#7a9479] hover:text-white",
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-8">
              <h4 className="mb-4 text-[15px] font-semibold text-on-surface">Metode Konsultasi</h4>
              <div className="flex flex-wrap gap-7">
                {methods.map((method) => {
                  const checked = selectedMethod === method.id;
                  return (
                    <label key={method.id} className="inline-flex cursor-pointer items-center gap-3 text-[15px] font-medium text-on-surface">
                      <input
                        type="radio"
                        name="metode-konsultasi"
                        value={method.id}
                        checked={checked}
                        onChange={() => setSelectedMethod(method.id)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-[6px] transition-colors",
                          checked ? "bg-[#7a9479] text-white" : "border-2 border-outline-variant bg-white",
                        )}
                      >
                        {checked ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                      </span>
                      {method.label}
                    </label>
                  );
                })}
              </div>
            </section>

            <button
              type="button"
              className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#7a9479] px-8 text-[16px] font-semibold text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:-translate-y-0.5 hover:bg-[#6a8669]"
            >
              Konfirmasi Booking
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </DashboardCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
