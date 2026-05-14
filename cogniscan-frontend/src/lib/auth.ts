export type BackendUser = {
  id: string;
  email: string;
  peran?: "admin" | "pasien" | "psikolog" | string | null;
  apakah_aktif?: boolean | null;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function fetchCurrentUser(accessToken: string): Promise<BackendUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Akun belum dikenali oleh backend CogniScan");
  }

  return response.json() as Promise<BackendUser>;
}

export function dashboardPathForRole(role: BackendUser["peran"]) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "psikolog") return "/psikolog/dashboard";
  return "/pasien/dashboard";
}
