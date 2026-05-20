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

export type JournalSessionStartPayload = {
  konteks_pemicu?: string;
  total_pertanyaan: number;
  consent_ai_processing: boolean;
};

export type JournalAnswerPayload = {
  urutan_pertanyaan: number;
  teks_pertanyaan: string;
  teks_jawaban: string;
};

export type JournalAnswer = {
  id_jawaban_jurnal: number;
  id_sesi_jurnal?: number | null;
  urutan_pertanyaan?: number | null;
  teks_pertanyaan?: string | null;
  teks_jawaban?: string | null;
  dijawab_pada?: string | null;
};

export type JournalSession = {
  id_sesi_jurnal: number;
  id_pasien?: number | null;
  konteks_pemicu?: string | null;
  total_pertanyaan?: number | null;
  status?: string | null;
  dimulai_pada?: string | null;
  diselesaikan_pada?: string | null;
  jawaban?: JournalAnswer[];
};

export type DetectedDistortion = {
  id_distorsi_terdeteksi: number;
  id_pra_asesmen?: number | null;
  tipe_distorsi?: string | null;
  penjelasan?: string | null;
  kalimat_bukti?: string | null;
  skor_keyakinan_ai?: string | number | null;
};

export type PreAssessment = {
  id_pra_asesmen: number;
  id_sesi_jurnal?: number | null;
  id_psikolog?: number | null;
  nama_psikolog?: string | null;
  konteks_pemicu?: string | null;
  indikator_urgensi?: string | null;
  skor_keparahan?: number | null;
  ringkasan_kondisi?: string | null;
  rekomendasi?: string | null;
  feedback_psikolog?: string | null;
  status_validasi?: string | null;
  divalidasi_pada?: string | null;
  dibuat_pada?: string | null;
  distorsi_terdeteksi?: DetectedDistortion[];
};

export type JournalFinalizeResult = {
  session: JournalSession;
  pra_asesmen: PreAssessment;
  is_crisis: boolean;
  message: string;
  crisis_contacts: Array<{
    name: string;
    type: string;
    phone?: string | null;
    note?: string | null;
  }>;
};

export type AvailablePsychologist = {
  id_psikolog: number;
  nama_lengkap: string;
  spesialisasi?: string | null;
  pengalaman_tahun?: number | null;
  universitas_asal?: string | null;
  tahun_lulus?: number | null;
  alamat_praktik?: string | null;
  kota?: string | null;
  provinsi?: string | null;
  tarif_konsultasi?: string | number | null;
  bio_singkat?: string | null;
  status_akun?: string | null;
  dibuat_pada?: string | null;
  tgl_kadaluarsa_str?: string | null;
  tgl_kadaluarsa_sip?: string | null;
};

export type PatientDashboardSummary = {
  pesan_baru: number;
  total_konsultasi: number;
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

async function fetchApi(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Tidak bisa menghubungi backend. Pastikan backend aktif, sudah direstart, dan frontend memakai URL API yang benar.",
      );
    }

    throw error;
  }
}

export async function fetchCurrentUser(accessToken: string): Promise<BackendUser> {
  const response = await fetchApi(`${API_BASE_URL}/api/auth/me`, {
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
  const response = await fetchApi(`${API_BASE_URL}/api/auth/profile/pasien`, {
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
  const response = await fetchApi(`${API_BASE_URL}/api/auth/profile/pasien`, {
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
  const response = await fetchApi(`${API_BASE_URL}/api/auth/profile/pasien`, {
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
  const response = await fetchApi(`${API_BASE_URL}/api/auth/register/psikolog`, {
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
  const response = await fetchApi(`${API_BASE_URL}/api/auth/change-temporary-password`, {
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

export async function startJournalSession(
  accessToken: string,
  payload: JournalSessionStartPayload,
): Promise<JournalSession> {
  const response = await fetchApi(`${API_BASE_URL}/api/journal/sessions/start`, {
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

  return response.json() as Promise<JournalSession>;
}

export async function submitJournalAnswer(
  accessToken: string,
  idSesiJurnal: number,
  payload: JournalAnswerPayload,
): Promise<JournalAnswer> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/journal/sessions/${idSesiJurnal}/answers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<JournalAnswer>;
}

export async function finalizeJournalSession(
  accessToken: string,
  idSesiJurnal: number,
): Promise<JournalFinalizeResult> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/journal/sessions/${idSesiJurnal}/finalize`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<JournalFinalizeResult>;
}

export async function fetchPreAssessmentReport(
  accessToken: string,
  idPraAsesmen: number,
): Promise<PreAssessment> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/pre-assessment/reports/${idPraAsesmen}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<PreAssessment>;
}

export async function fetchPatientPreAssessments(
  accessToken: string,
): Promise<PreAssessment[]> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/pre-assessment/reports`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<PreAssessment[]>;
}

export async function fetchAvailablePsychologists(
  accessToken: string,
): Promise<AvailablePsychologist[]> {
  const response = await fetchApi(`${API_BASE_URL}/api/pre-assessment/psikolog/available`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<AvailablePsychologist[]>;
}

export async function fetchPatientDashboardSummary(
  accessToken: string,
): Promise<PatientDashboardSummary> {
  const response = await fetchApi(`${API_BASE_URL}/api/dashboard/pasien/summary`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<PatientDashboardSummary>;
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
