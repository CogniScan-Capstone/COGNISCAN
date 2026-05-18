export type BackendUser = {
  id: string;
  email: string;
  peran?: "admin" | "pasien" | "psikolog" | string | null;
  apakah_aktif?: boolean | null;
  nama_lengkap?: string | null;
  status_akun?: string | null;
  apakah_sudah_ganti_password?: boolean | null;
};

export type PatientProfilePayload = {
  nama_lengkap: string;
  jenis_kelamin?: "laki-laki" | "perempuan";
  tanggal_lahir?: string;
  alamat_lengkap?: string;
  no_hp_wa?: string;
};

export type PatientProfile = {
  id_pasien: number;
  id_pengguna?: string | null;
  nama_lengkap: string;
  jenis_kelamin?: "laki-laki" | "perempuan" | string | null;
  tanggal_lahir?: string | null;
  alamat_lengkap?: string | null;
  no_hp_wa?: string | null;
};

export type PsikologRegistrationPayload = {
  email: string;
  nama_lengkap: string;
  nomor_hp?: string;
  spesialisasi?: string;
  pengalaman_tahun?: number;
  universitas_asal?: string;
  tahun_lulus?: number;
  alamat_praktik?: string;
  kota?: string;
  provinsi?: string;
  tarif_konsultasi?: number;
  no_str: string;
  no_sip: string;
  tgl_kadaluarsa_str?: string;
  tgl_kadaluarsa_sip?: string;
  upload_dokumen_str?: string;
  upload_dokumen_sip?: string;
  bio_singkat?: string;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const pendingPatientProfileKeyPrefix = "cogniscan:pending-patient-profile:";

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

function pendingPatientProfileKey(email: string) {
  return `${pendingPatientProfileKeyPrefix}${normalizeAuthEmail(email)}`;
}

export function savePendingPatientProfile(email: string, payload: PatientProfilePayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    pendingPatientProfileKey(email),
    JSON.stringify(payload),
  );
}

export function loadPendingPatientProfile(email: string): PatientProfilePayload | null {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(pendingPatientProfileKey(email));
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<PatientProfilePayload>;
    if (typeof parsed.nama_lengkap !== "string" || parsed.nama_lengkap.trim().length < 3) {
      return null;
    }

    return {
      nama_lengkap: parsed.nama_lengkap,
      jenis_kelamin: parsed.jenis_kelamin,
      tanggal_lahir: parsed.tanggal_lahir,
      alamat_lengkap: parsed.alamat_lengkap,
      no_hp_wa: parsed.no_hp_wa,
    };
  } catch {
    return null;
  }
}

export function clearPendingPatientProfile(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(pendingPatientProfileKey(email));
}

export async function getApiErrorMessage(response: Response) {
  try {
    const payload = await response.json();
    if (typeof payload.detail === "string") return payload.detail;
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((item: { msg?: string }) => item.msg)
        .filter(Boolean)
        .join(", ");
    }
    if (typeof payload.message === "string") return payload.message;
  } catch {
    // Fallback below keeps user-facing errors stable when the API returns no JSON.
  }

  return `Request gagal dengan status ${response.status}`;
}

export async function fetchCurrentUser(accessToken: string): Promise<BackendUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<BackendUser>;
}

export async function createPatientProfile(
  accessToken: string,
  payload: PatientProfilePayload,
): Promise<BackendUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile/pasien`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<BackendUser>;
}

export async function fetchPatientProfile(accessToken: string): Promise<PatientProfile> {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile/pasien`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<PatientProfile>;
}

export async function updatePatientProfile(
  accessToken: string,
  payload: PatientProfilePayload,
): Promise<PatientProfile> {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile/pasien`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<PatientProfile>;
}

export async function registerPsikologCandidate(
  payload: PsikologRegistrationPayload,
) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register/psikolog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json();
}

export async function changeTemporaryPassword(
  accessToken: string,
  newPassword: string,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/change-temporary-password`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ new_password: newPassword }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<{ message: string }>;
}

export function dashboardPathForRole(role: BackendUser["peran"]) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "psikolog") return "/psikolog/dashboard";
  return "/pasien/dashboard";
}

export function entryPathForUser(user: BackendUser) {
  if (user.peran === "psikolog" && !user.apakah_sudah_ganti_password) {
    return "/psikolog/ganti-password";
  }

  return dashboardPathForRole(user.peran);
}
