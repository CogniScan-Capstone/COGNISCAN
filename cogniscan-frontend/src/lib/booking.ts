export type ConsultationMethod = "online" | "offline";

export type LocalBooking = {
  orderId: string;
  date: string;
  time: string;
  method: ConsultationMethod;
  methodLabel: string;
  psychologistName: string;
  amount: number;
  status: "confirmed";
  createdAt: string;
};

const bookingStorageKey = "cogniscan:patient-bookings";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function methodAmount(method: ConsultationMethod) {
  return method === "online" ? 100000 : 150000;
}

export function buildOrderId(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const serial = String(Math.floor(10000 + Math.random() * 90000));
  return `CGS-${y}${m}${d}-${serial}`;
}

export function readLocalBookings(): LocalBooking[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(bookingStorageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalBooking[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalBooking(booking: LocalBooking) {
  if (typeof window === "undefined") return;

  const bookings = readLocalBookings();
  window.localStorage.setItem(
    bookingStorageKey,
    JSON.stringify([booking, ...bookings]),
  );
}

export function findLocalBooking(orderId: string) {
  return readLocalBookings().find((booking) => booking.orderId === orderId) ?? null;
}
