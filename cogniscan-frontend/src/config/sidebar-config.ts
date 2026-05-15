import { LucideIcon } from "lucide-react"
import {
  LucideHome,
  LucideUsers,
  LucideBarChart3,
  LucideSettings,
  LucideCalendar,
  LucideMessageSquare,
  LucideFileText,
} from "lucide-react"

export type UserRole = "admin" | "pasien" | "psikolog"

export interface MenuItemConfig {
  title: string
  url: string
  icon: LucideIcon
  badge?: string
  roles: UserRole[] // Role mana saja yang bisa akses
}

export interface SidebarConfig {
  role: UserRole
  items: MenuItemConfig[]
}

// Definisikan menu untuk setiap role
const ADMIN_MENU: MenuItemConfig[] = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LucideHome,
    roles: ["admin"],
  },
  {
    title: "Kelola Pengguna",
    url: "/admin/users",
    icon: LucideUsers,
    roles: ["admin"],
  },
  {
    title: "Laporan",
    url: "/admin/reports",
    icon: LucideBarChart3,
    roles: ["admin"],
  },
  {
    title: "Pengaturan",
    url: "/admin/settings",
    icon: LucideSettings,
    roles: ["admin"],
  },
]

const PSIKOLOG_MENU: MenuItemConfig[] = [
  {
    title: "Dashboard",
    url: "/psikolog/dashboard",
    icon: LucideHome,
    roles: ["psikolog"],
  },
  {
    title: "Jadwal Sesi",
    url: "/psikolog/schedule",
    icon: LucideCalendar,
    roles: ["psikolog"],
  },
  {
    title: "Pasien Saya",
    url: "/psikolog/patients",
    icon: LucideUsers,
    roles: ["psikolog"],
  },
  {
    title: "Chat",
    url: "/psikolog/messages",
    icon: LucideMessageSquare,
    roles: ["psikolog"],
  },
  {
    title: "Catatan Sesi",
    url: "/psikolog/notes",
    icon: LucideFileText,
    roles: ["psikolog"],
  },
]

const PASIEN_MENU: MenuItemConfig[] = [
  {
    title: "Dashboard",
    url: "/pasien/dashboard",
    icon: LucideHome,
    roles: ["pasien"],
  },
  {
    title: "Cari Psikolog",
    url: "/pasien/find-psikolog",
    icon: LucideUsers,
    roles: ["pasien"],
  },
  {
    title: "Jadwal Saya",
    url: "/pasien/my-schedule",
    icon: LucideCalendar,
    roles: ["pasien"],
  },
  {
    title: "Chat",
    url: "/pasien/messages",
    icon: LucideMessageSquare,
    roles: ["pasien"],
  },
]

// Fungsi untuk mendapatkan menu berdasarkan role
export function getSidebarConfig(role: UserRole): MenuItemConfig[] {
  switch (role) {
    case "admin":
      return ADMIN_MENU
    case "psikolog":
      return PSIKOLOG_MENU
    case "pasien":
      return PASIEN_MENU
    default:
      return []
  }
}