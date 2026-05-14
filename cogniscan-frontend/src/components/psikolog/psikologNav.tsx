import { CalendarDays, LayoutDashboard, MessageSquare } from "lucide-react";
import type { DashboardNavItem } from "@/components/dashboard";

export type PsikologNavKey = "dashboard" | "feedback" | "jadwal";

export function getPsikologNav(active: PsikologNavKey): DashboardNavItem[] {
  return [
    {
      label: "Dashboard",
      href: "/psikolog/dashboard",
      icon: <LayoutDashboard />,
      active: active === "dashboard",
    },
    {
      label: "Feedback",
      href: "/psikolog/feedback",
      icon: <MessageSquare />,
      active: active === "feedback",
    },
    {
      label: "Jadwal",
      href: "/psikolog/jadwal",
      icon: <CalendarDays />,
      active: active === "jadwal",
    },
  ];
}

export const psikologUser = {
  name: "Budi Santoso",
  role: "Psikolog",
};

export const psikologProfileHref = "/psikolog/profile";
