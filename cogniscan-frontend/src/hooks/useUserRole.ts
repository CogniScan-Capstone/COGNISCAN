"use client"

import { useSyncExternalStore } from "react"

type UserRole = "admin" | "pasien" | "psikolog"

function isUserRole(value: string | null): value is UserRole {
  return value === "admin" || value === "pasien" || value === "psikolog"
}

function readRole(): UserRole {
  const storedRole = localStorage.getItem("userRole")
  return isUserRole(storedRole) ? storedRole : "pasien"
}

function getServerSnapshot(): UserRole {
  return "pasien"
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

export function useUserRole() {
  const role = useSyncExternalStore(subscribe, readRole, getServerSnapshot)

  return { role, isLoading: false }
}
