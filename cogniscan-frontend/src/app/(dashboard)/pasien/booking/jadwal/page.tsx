"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

import { DashboardCard, DashboardLayout } from "@/components/dashboard";

import {
  getPatientNav,
  patientProfileHref,
  patientUser,
} from "@/components/patient";

import { createBookingCheckout, reschedulePatientBooking } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
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

const monthShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agt",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const dayNames = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const times = [
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "19:00",
];

const methods = [
  { id: "online", label: "Online (Video Call)" },
  { id: "offline", label: "Offline (Tatap Muka)" },
] as const;

type Method = (typeof methods)[number]["id"];

type SnapResult = Record<string, unknown>;

type SnapPayOptions = {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: SnapPayOptions) => void;
    };
  }
}

type DayCell = {
  year: number;
  month: number;
  day: number;
  muted: boolean;
};

const fullDates = ["2026-05-10", "2026-05-12", "2026-05-18", "2026-05-25"];

function buildCalendarDays(year: number, month: number): DayCell[] {
  const startWeekday = new Date(year, month, 1).getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: DayCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({
      year: month === 0 ? year - 1 : year,
      month: (month - 1 + 12) % 12,
      day: daysInPrev - i,
      muted: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      year,
      month,
      day,
      muted: false,
    });
  }

  const remaining = (7 - (cells.length % 7)) % 7;

  for (let day = 1; day <= remaining; day++) {
    cells.push({
      year: month === 11 ? year + 1 : year,
      month: (month + 1) % 12,
      day,
      muted: true,
    });
  }

  return cells;
}

function isSameYMD(a: { year: number; month: number; day: number }, b: Date) {
  return (
    a.year === b.getFullYear() &&
    a.month === b.getMonth() &&
    a.day === b.getDate()
  );
}

function formatSelectedDate(date: Date) {
  return `${dayNames[date.getDay()]}, ${date.getDate()} ${
    monthNames[date.getMonth()]
  } ${date.getFullYear()}`;
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(
    2,
    "0",
  )}-${String(day).padStart(2, "0")}`;
}

function formatDatePayload(date: Date) {
  return formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function dateFromCell(cell: DayCell) {
  return new Date(cell.year, cell.month, cell.day);
}

function isPastDate(date: Date, today: Date) {
  return startOfDay(date).getTime() < today.getTime();
}

function slotDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value;
}

function isPastTimeSlot(date: Date, time: string, now: Date) {
  return slotDateTime(date, time).getTime() <= now.getTime();
}

function availableTimesForDate(date: Date, now: Date) {
  return times.filter((time) => !isPastTimeSlot(date, time, now));
}

function getPositiveIntSearchParam(name: string) {
  if (typeof window === "undefined") return null;

  const value = new URLSearchParams(window.location.search).get(name);
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getIdPraAsesmenParam() {
  return getPositiveIntSearchParam("id_pra_asesmen");
}

function getRescheduleBookingIdParam() {
  return getPositiveIntSearchParam("reschedule_booking_id");
}

function loadMidtransSnap(scriptUrl: string, clientKey: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-midtrans-snap='true']",
    );

    if (window.snap && existing?.dataset.clientKey === clientKey) {
      resolve();
      return;
    }

    existing?.remove();
    window.snap = undefined;

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.dataset.midtransSnap = "true";
    script.dataset.clientKey = clientKey;
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat tampilan pembayaran Midtrans."));

    document.body.appendChild(script);
  });
}

export default function PatientBookingSchedulePage() {
  const router = useRouter();
  const [rescheduleBookingId] = useState(() => getRescheduleBookingIdParam());
  const [viewDate, setViewDate] = useState(() => {
    const current = new Date();
    return new Date(current.getFullYear(), current.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [selectedTime, setSelectedTime] = useState<string>("");

  const [selectedMethod, setSelectedMethod] = useState<Method>("online");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const [today] = useState(() => {
    const current = new Date();

    current.setHours(0, 0, 0, 0);

    return current;
  });

  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;

    const handler = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timerId);
  }, []);

  const cells = buildCalendarDays(viewDate.getFullYear(), viewDate.getMonth());
  const isReschedule = rescheduleBookingId !== null;
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonthUnavailable =
    new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1).getTime() <
    currentMonth.getTime();

  function canSelectDate(date: Date) {
    if (isPastDate(date, today)) return false;
    if (fullDates.includes(formatDatePayload(date))) return false;
    if (isSameYMD(
      { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() },
      today,
    )) {
      return availableTimesForDate(date, now).length > 0;
    }
    return true;
  }

  function handleSelectDate(date: Date) {
    if (!canSelectDate(date)) return;

    const availableTimes = availableTimesForDate(date, now);
    setSelectedDate(date);
    setSelectedTime((currentTime) =>
      currentTime && !isPastTimeSlot(date, currentTime, now)
        ? currentTime
        : availableTimes[0] ?? "",
    );
  }

  async function handleConfirmBooking() {
    if (!selectedDate || !selectedTime || isConfirming) return;

    if (!canSelectDate(selectedDate) || isPastTimeSlot(selectedDate, selectedTime, now)) {
      setError("Pilih tanggal dan waktu konsultasi yang belum lewat.");
      return;
    }

    if (!isReschedule && !policyAccepted) {
      setError("Centang persetujuan kebijakan pembayaran dan reschedule terlebih dahulu.");
      return;
    }

    setIsConfirming(true);
    setError("");
    setPaymentNotice("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
      }

      const schedulePayload = {
        tanggal_konsultasi: formatDatePayload(selectedDate),
        waktu_konsultasi: selectedTime,
        mode_konsultasi: selectedMethod,
      };

      if (isReschedule) {
        const updatedBooking = await reschedulePatientBooking(
          accessToken,
          rescheduleBookingId,
          schedulePayload,
        );

        if (updatedBooking.order_id) {
          router.push(
            `/pasien/booking/receipt/detail?order_id=${encodeURIComponent(updatedBooking.order_id)}`,
          );
        } else {
          router.push("/pasien/booking");
        }
        return;
      }

      const checkout = await createBookingCheckout(accessToken, {
        ...schedulePayload,
        id_pra_asesmen: getIdPraAsesmenParam(),
      });

      try {
        await loadMidtransSnap(checkout.snap_script_url, checkout.client_key);
      } catch {
        window.location.href = checkout.redirect_url;
        return;
      }

      if (!window.snap) {
        window.location.href = checkout.redirect_url;
        return;
      }

      window.snap.pay(checkout.snap_token, {
        onSuccess: () => {
          router.push(
            `/pasien/booking/receipt/detail?order_id=${encodeURIComponent(checkout.order_id)}`,
          );
        },
        onPending: () => {
          router.push(
            `/pasien/booking/receipt/detail?order_id=${encodeURIComponent(checkout.order_id)}`,
          );
        },
        onError: () => {
          setError("Pembayaran Midtrans gagal diproses. Silakan coba buat pembayaran lagi.");
          setIsConfirming(false);
        },
        onClose: () => {
          setPaymentNotice(
            "Pembayaran belum selesai. Booking sudah dibuat dengan status menunggu pembayaran.",
          );
          setIsConfirming(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat booking.");
      setIsConfirming(false);
    }
  }

  return (
    <DashboardLayout
      title="Booking"
      navItems={getPatientNav("booking")}
      user={patientUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="max-w-235">
        <div className="mb-12 border-b border-outline-variant">
          <div className="flex flex-wrap gap-6">
            <button
              type="button"
              className="inline-flex h-14 items-center gap-2 border-b-2 border-primary px-6 text-[16px] font-semibold text-primary"
            >
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              {isReschedule ? "Reschedule" : "Buat Booking"}
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
          {isReschedule ? "Reschedule Konsultasi" : "Booking Konsultasi"}
        </h2>

        {isReschedule ? (
          <DashboardCard className="mb-8 border border-[#c4ddc5] bg-[#eef7ef] px-5 py-4">
            <p className="text-sm font-medium leading-6 text-primary">
              Pilih jadwal baru untuk booking yang sudah dibayar. Pembayaran lama tetap
              dipakai dan sistem tidak akan membuka Midtrans lagi.
            </p>
          </DashboardCard>
        ) : null}

        <div
          className={cn(
            "grid gap-8 transition-all duration-300",
            selectedDate ? "xl:grid-cols-[320px_1fr]" : "grid-cols-1",
          )}
        >
          {/* CALENDAR */}
          <DashboardCard
            className={cn(
              "relative p-6 transition-all duration-300",
              selectedDate ? "w-full max-w-[320px]" : "w-full",
            )}
          >
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
                  disabled={previousMonthUnavailable}
                  onClick={() =>
                    setViewDate(
                      new Date(
                        viewDate.getFullYear(),
                        viewDate.getMonth() - 1,
                        1,
                      ),
                    )
                  }
                  className="rounded-md p-1 transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewDate(
                      new Date(
                        viewDate.getFullYear(),
                        viewDate.getMonth() + 1,
                        1,
                      ),
                    )
                  }
                  className="rounded-md p-1 transition-colors hover:bg-surface-container"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* MONTH PICKER */}
            {pickerOpen ? (
              <div
                ref={pickerRef}
                role="dialog"
                aria-label="Pilih bulan dan tahun"
                className="absolute left-6 right-6 top-15 z-20 rounded-[14px] border border-outline-variant bg-white p-4 shadow-[0_20px_40px_-18px_rgba(27,28,26,0.25)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={viewDate.getFullYear() <= today.getFullYear()}
                    onClick={() =>
                      setViewDate(
                        new Date(
                          viewDate.getFullYear() - 1,
                          viewDate.getMonth(),
                          1,
                        ),
                      )
                    }
                    className="rounded-md p-1 transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="text-[15px] font-semibold text-on-surface">
                    {viewDate.getFullYear()}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setViewDate(
                        new Date(
                          viewDate.getFullYear() + 1,
                          viewDate.getMonth(),
                          1,
                        ),
                      )
                    }
                    className="rounded-md p-1 transition-colors hover:bg-surface-container"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {monthShort.map((month, index) => {
                    const active = index === viewDate.getMonth();
                    const disabledMonth =
                      viewDate.getFullYear() === today.getFullYear() &&
                      index < today.getMonth();

                    return (
                      <button
                        key={month}
                        type="button"
                        disabled={disabledMonth}
                        onClick={() => {
                          if (disabledMonth) return;
                          setViewDate(
                            new Date(viewDate.getFullYear(), index, 1),
                          );

                          setPickerOpen(false);
                        }}
                        className={cn(
                          "rounded-full px-3 py-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-[#7a9479] text-white"
                            : disabledMonth
                              ? "cursor-not-allowed text-outline-variant opacity-45"
                            : "text-on-surface hover:bg-surface-container",
                        )}
                      >
                        {month}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* CALENDAR GRID */}
            <div className="grid grid-cols-7 gap-y-4 text-center">
              {weekdays.map((day, index) => (
                <div
                  key={`${day}-${index}`}
                  className="text-xs font-bold text-on-surface-muted"
                >
                  {day}
                </div>
              ))}

              {cells.map((cell, index) => {
                const isToday = isSameYMD(cell, today);

                const isSelected =
                  selectedDate && isSameYMD(cell, selectedDate);

                const isFull = fullDates.includes(
                  formatDateKey(cell.year, cell.month, cell.day),
                );
                const cellDate = dateFromCell(cell);
                const isPast = isPastDate(cellDate, today);
                const isUnavailableToday = isToday && availableTimesForDate(cellDate, now).length === 0;
                const isDisabled = isFull || isPast || isUnavailableToday;

                return (
                  <button
                    key={`${cell.year}-${cell.month}-${cell.day}-${index}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;

                      handleSelectDate(cellDate);

                      if (cell.muted) {
                        setViewDate(new Date(cell.year, cell.month, 1));
                      }
                    }}
                    className={cn(
                      "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",

                      cell.muted && "text-outline-variant",

                      isDisabled && "bg-gray-200 text-gray-400 cursor-not-allowed",

                      !isDisabled &&
                        !cell.muted &&
                        "text-black hover:bg-primary-container/15",

                      isToday &&
                        !isSelected &&
                        "border border-primary-container",

                      isSelected && "bg-[#7a9479] text-white",
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </DashboardCard>

          {/* DETAIL CARD */}
          {selectedDate && (
            <DashboardCard className="p-8">
              <h3 className="mb-7 text-[20px] font-semibold text-[#a98ad6]">
                {formatSelectedDate(selectedDate)}
              </h3>

              {/* TIME */}
              <section>
                <h4 className="mb-4 text-[15px] font-semibold text-on-surface">
                  Pilih Waktu
                </h4>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {times.map((time) => {
                    const active = selectedTime === time;
                    const isUnavailable = selectedDate
                      ? isPastTimeSlot(selectedDate, time, now)
                      : false;

                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "h-10 rounded-full border border-outline-variant bg-white text-[15px] font-medium transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:border-outline-variant",

                          active &&
                            !isUnavailable &&
                            "border-[#7a9479] bg-[#7a9479] text-white hover:border-[#7a9479] hover:text-white",
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* METHOD */}
              <section className="mt-8">
                <h4 className="mb-4 text-[15px] font-semibold text-on-surface">
                  Metode Konsultasi
                </h4>

                <div className="flex flex-wrap gap-7">
                  {methods.map((method) => {
                    const checked = selectedMethod === method.id;

                    return (
                      <label
                        key={method.id}
                        className="inline-flex cursor-pointer items-center gap-3 text-[15px] font-medium text-on-surface"
                      >
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

                            checked
                              ? "bg-[#7a9479] text-white"
                              : "border-2 border-outline-variant bg-white",
                          )}
                        >
                          {checked ? <Check className="h-4 w-4" /> : null}
                        </span>

                        {method.label}
                      </label>
                    );
                  })}
                </div>
              </section>

              {!isReschedule ? (
                <section className="mt-8 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Kebijakan pembayaran dan reschedule
                      </p>
                      <p className="mt-1 text-sm leading-6 text-amber-900/80">
                        Dana konsultasi tidak dikembalikan jika pasien lupa atau tidak hadir.
                        Reschedule hanya berlaku jika disetujui psikolog; jika psikolog tidak
                        menerima reschedule, jadwal tetap mengikuti booking awal.
                      </p>
                      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-medium leading-6 text-amber-950">
                        <input
                          type="checkbox"
                          checked={policyAccepted}
                          onChange={(event) => setPolicyAccepted(event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-amber-300 text-primary focus:ring-primary"
                        />
                        Saya memahami dan menyetujui kebijakan pembayaran serta reschedule.
                      </label>
                    </div>
                  </div>
                </section>
              ) : null}

              {/* BUTTON */}
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={
                  isConfirming ||
                  !selectedDate ||
                  !selectedTime ||
                  (!isReschedule && !policyAccepted) ||
                  isPastTimeSlot(selectedDate, selectedTime, now)
                }
                className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#7a9479] px-8 text-[16px] font-semibold text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:-translate-y-0.5 hover:bg-[#6a8669] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isConfirming
                  ? "Mengonfirmasi..."
                  : isReschedule
                    ? "Simpan Jadwal Baru"
                    : "Konfirmasi Booking"}
                <ChevronRight className="h-5 w-5" />
              </button>
              {error ? (
                <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : null}
              {paymentNotice ? (
                <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  {paymentNotice}
                </p>
              ) : null}
            </DashboardCard>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
