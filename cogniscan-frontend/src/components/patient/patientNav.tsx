import { CalendarDays, LayoutDashboard, MessageSquare, PlusSquare } from "lucide-react";
import type { DashboardNavItem } from "@/components/dashboard";

export function getPatientNav(active: "dashboard" | "booking" | "pesan" | "konsultasi"): DashboardNavItem[] {
  return [
    {
      label: "Dashboard",
      href: "/pasien/dashboard",
      icon: <LayoutDashboard />,
      active: active === "dashboard",
    },
    {
      label: "Booking",
      href: "/pasien/booking",
      icon: <CalendarDays />,
      active: active === "booking",
    },
    {
      label: "Pesan",
      href: "/pasien/pesan",
      icon: <MessageSquare />,
      active: active === "pesan",
    },
    {
      label: "Konsultasi",
      href: "/pasien/konsultasi",
      icon: <PlusSquare />,
      active: active === "konsultasi",
    },
  ];
}

export const patientUser = {
  name: "Pasien",
  role: "Patient",
};

export const patientProfileHref = "/pasien/profile";
