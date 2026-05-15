"use client"

import { useEffect, useState } from "react"

type UserRole = "admin" | "pasien" | "psikolog"

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Ambil role dari localStorage, API, atau session
    // Contoh dari localStorage:
    const storedRole = localStorage.getItem("userRole") as UserRole | null

    // Atau bisa dari API:
    // const response = await fetch('/api/user/profile')
    // const data = await response.json()
    // setRole(data.role)

    setRole(storedRole || "pasien") // Default ke pasien
    setIsLoading(false)
  }, [])

  return { role, isLoading }
}