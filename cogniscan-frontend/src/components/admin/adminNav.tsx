import { LayoutDashboard, UserCheck } from "lucide-react";
import type { DashboardNavItem } from "@/components/dashboard";

export function getAdminNav(active: "dashboard" | "pendaftaran"): DashboardNavItem[] {
  return [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: <LayoutDashboard />,
      active: active === "dashboard",
    },
    {
      label: "Pendaftaran Masuk",
      href: "/admin/pendaftaran",
      icon: <UserCheck />,
      active: active === "pendaftaran",
    },
  ];
}

export const adminUser = {
  name: "Budi Santoso",
  role: "Admin",
};

