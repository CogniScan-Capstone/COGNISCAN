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
  alamat_praktik?: string;
  kota?: string;
  provinsi?: string;
  tarif_konsultasi?: number;
  no_str: string;
  no_sip: string;
  upload_dokumen_str?: string;
  upload_dokumen_sip?: string;
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

export type JournalVoiceAnswer = {
  id_jawaban_jurnal: number;
  id_sesi_jurnal?: number | null;
  urutan_pertanyaan?: number | null;
  dijawab_pada?: string | null;
  status?: string | null;
  message?: string | null;
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
  nama_pasien?: string | null;
  dialog_jurnal?: string | null;
  jawaban_jurnal?: JournalAnswer[];
  konteks_pemicu?: string | null;
  indikator_urgensi?: string | null;
  skor_keparahan?: number | null;
  ringkasan_kondisi?: string | null;
  rekomendasi?: string | null;
  feedback_psikolog?: string | null;
  catatan_internal_psikolog?: string | null;
  akurasi_ai_psikolog?: string | null;
  severity_final_psikolog?: string | null;
  rekomendasi_tindak_lanjut_psikolog?: string | null;
  draft_feedback_psikolog?: string | null;
  draft_catatan_internal?: string | null;
  draft_akurasi_ai?: string | null;
  draft_severity_final?: string | null;
  draft_rekomendasi_tindak_lanjut?: string | null;
  draft_disimpan_pada?: string | null;
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

export type ConsultationMethod = "online" | "offline";

export type BookingCheckoutPayload = {
  tanggal_konsultasi: string;
  waktu_konsultasi: string;
  mode_konsultasi: ConsultationMethod;
  id_pra_asesmen?: number | null;
};

export type BookingReschedulePayload = {
  tanggal_konsultasi: string;
  waktu_konsultasi: string;
  mode_konsultasi: ConsultationMethod;
};

export type BookingCheckoutResponse = {
  id_pemesanan_konsultasi: number;
  id_transaksi_pembayaran: number;
  id_pra_asesmen: number;
  id_psikolog: number;
  nama_psikolog?: string | null;
  tanggal_konsultasi: string;
  waktu_konsultasi: string;
  mode_konsultasi: ConsultationMethod;
  order_id: string;
  snap_token: string;
  redirect_url: string;
  client_key: string;
  snap_script_url: string;
  jumlah_bayar: string | number;
  status_transaksi?: string | null;
  status_konsultasi?: string | null;
  status_pembayaran?: string | null;
};

export type BookingReceipt = {
  id_pemesanan_konsultasi: number;
  id_pra_asesmen?: number | null;
  id_transaksi_pembayaran?: number | null;
  order_id?: string | null;
  nomor_nota?: string | null;
  nama_pasien?: string | null;
  nama_psikolog?: string | null;
  tanggal_konsultasi?: string | null;
  waktu_konsultasi?: string | null;
  waktu_selesai?: string | null;
  mode_konsultasi?: string | null;
  metode_konsultasi?: string | null;
  link_pertemuan?: string | null;
  platform_pertemuan?: string | null;
  lokasi_konsultasi?: string | null;
  metode_pembayaran?: string | null;
  jumlah_bayar?: string | number | null;
  status_transaksi?: string | null;
  status_konsultasi?: string | null;
  status_pembayaran?: string | null;
  tanggal_booking?: string | null;
  waktu_bayar?: string | null;
  midtrans_transaction_id?: string | null;
  midtrans_transaction_status?: string | null;
  midtrans_fraud_status?: string | null;
};

export type PsikologScheduleBooking = {
  id_pemesanan_konsultasi: number;
  id_pasien?: number | null;
  nama_pasien?: string | null;
  email_pasien?: string | null;
  tanggal_konsultasi?: string | null;
  waktu_mulai?: string | null;
  waktu_selesai?: string | null;
  mode_konsultasi?: "online" | "offline" | string | null;
  status_konsultasi?: string | null;
  status_pembayaran?: string | null;
  total_biaya?: string | number | null;
  link_pertemuan?: string | null;
  platform_pertemuan?: string | null;
  lokasi_konsultasi?: string | null;
  konteks_pemicu?: string | null;
  indikator_urgensi?: string | null;
};

export type PatientLatestScreeningStatus = {
  id_pra_asesmen: number;
  id_sesi_jurnal?: number | null;
  id_psikolog?: number | null;
  nama_psikolog?: string | null;
  konteks_pemicu?: string | null;
  status:
    | "menunggu_pilih_psikolog"
    | "menunggu_review"
    | "sedang_direview"
    | "feedback_tersedia"
    | "perlu_eskalasi"
    | string;
  status_validasi?: string | null;
  indikator_urgensi?: string | null;
  skor_keparahan?: number | null;
  feedback_tersedia: boolean;
  dibuat_pada?: string | null;
  divalidasi_pada?: string | null;
};

export type PatientDashboardSummary = {
  pesan_baru: number;
  total_konsultasi: number;
  screening_terakhir?: PatientLatestScreeningStatus | null;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

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

function getLocalBackendFallback(input: RequestInfo | URL) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      return parsed.toString();
    }
    if (parsed.hostname === "127.0.0.1") {
      parsed.hostname = "localhost";
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchApi(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) {
      const fallbackUrl = getLocalBackendFallback(input);
      if (fallbackUrl) {
        try {
          return await fetch(fallbackUrl, init);
        } catch {
          // Keep the stable user-facing message below.
        }
      }

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

export async function submitJournalVoiceAnswer(
  accessToken: string,
  idSesiJurnal: number,
  payload: {
    urutan_pertanyaan: number;
    teks_pertanyaan: string;
    audio: Blob;
  },
): Promise<JournalVoiceAnswer> {
  const params = new URLSearchParams({
    urutan_pertanyaan: String(payload.urutan_pertanyaan),
    teks_pertanyaan: payload.teks_pertanyaan,
  });
  const response = await fetchApi(
    `${API_BASE_URL}/api/journal/sessions/${idSesiJurnal}/voice-answer?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": payload.audio.type || "audio/webm",
      },
      body: payload.audio,
    },
  );

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<JournalVoiceAnswer>;
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

export async function assignPreAssessmentPsychologist(
  accessToken: string,
  idPraAsesmen: number,
  idPsikolog: number,
): Promise<PreAssessment> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/pre-assessment/reports/${idPraAsesmen}/assign-psikolog`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id_psikolog: idPsikolog }),
    },
  );

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<PreAssessment>;
}

export async function createBookingCheckout(
  accessToken: string,
  payload: BookingCheckoutPayload,
): Promise<BookingCheckoutResponse> {
  const response = await fetchApi(`${API_BASE_URL}/api/booking/checkout`, {
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

  return response.json() as Promise<BookingCheckoutResponse>;
}

export async function reschedulePatientBooking(
  accessToken: string,
  idPemesananKonsultasi: number,
  payload: BookingReschedulePayload,
): Promise<BookingReceipt> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/booking/${idPemesananKonsultasi}/reschedule`,
    {
      method: "PATCH",
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

  return response.json() as Promise<BookingReceipt>;
}

export async function fetchPatientBookings(
  accessToken: string,
): Promise<BookingReceipt[]> {
  const response = await fetchApi(`${API_BASE_URL}/api/booking/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<BookingReceipt[]>;
}

export async function fetchPaymentReceipt(
  accessToken: string,
  orderId: string,
): Promise<BookingReceipt> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/pembayaran/orders/${encodeURIComponent(orderId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<BookingReceipt>;
}

export async function fetchPsikologScheduleBookings(
  accessToken: string,
  params: { startDate?: string; endDate?: string } = {},
): Promise<PsikologScheduleBooking[]> {
  const searchParams = new URLSearchParams();
  if (params.startDate) searchParams.set("start_date", params.startDate);
  if (params.endDate) searchParams.set("end_date", params.endDate);

  const query = searchParams.toString();
  const response = await fetchApi(
    `${API_BASE_URL}/api/jadwal/psikolog/bookings${query ? `?${query}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<PsikologScheduleBooking[]>;
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

export type PsikologRecentReport = {
  id_pra_asesmen: number;
  nama_pasien?: string | null;
  konteks_pemicu?: string | null;
  indikator_urgensi?: string | null;
  status_validasi?: string | null;
  feedback_tersedia: boolean;
  dibuat_pada?: string | null;
};

export type PsikologDashboardSummary = {
  feedback_belum_direspon: number;
  feedback_sudah_direspon: number;
  total_laporan: number;
  laporan_terbaru: PsikologRecentReport[];
};

export async function fetchPsikologDashboardSummary(
  accessToken: string,
): Promise<PsikologDashboardSummary> {
  const response = await fetchApi(`${API_BASE_URL}/api/dashboard/psikolog/summary`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<PsikologDashboardSummary>;
}

export function dashboardPathForRole(role: BackendUser["peran"]) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "psikolog") return "/psikolog/dashboard";
  return "/pasien/dashboard";
}

export function entryPathForUser(user: BackendUser) {
  if (user.peran === "psikolog" && !user.apakah_sudah_ganti_password) {
    return "/reset-password";
  }

  return dashboardPathForRole(user.peran);
}

export async function fetchPsikologPreAssessments(
  accessToken: string,
): Promise<PreAssessment[]> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/pre-assessment/psikolog/reports`,
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

export async function fetchPsikologPreAssessmentReport(
  accessToken: string,
  idPraAsesmen: number,
): Promise<PreAssessment> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/pre-assessment/psikolog/reports/${idPraAsesmen}`,
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

export async function submitPreAssessmentFeedback(
  accessToken: string,
  idPraAsesmen: number,
  payload: {
    feedback_psikolog: string;
    status_validasi?: string;
    catatan_internal_psikolog?: string | null;
    akurasi_ai_psikolog?: string | null;
    severity_final_psikolog?: string | null;
    rekomendasi_tindak_lanjut_psikolog?: string | null;
  },
): Promise<PreAssessment> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/pre-assessment/psikolog/reports/${idPraAsesmen}/feedback`,
    {
      method: "PATCH",
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

  return response.json() as Promise<PreAssessment>;
}

export async function savePreAssessmentFeedbackDraft(
  accessToken: string,
  idPraAsesmen: number,
  payload: {
    draft_feedback_psikolog?: string | null;
    draft_catatan_internal?: string | null;
    draft_akurasi_ai?: string | null;
    draft_severity_final?: string | null;
    draft_rekomendasi_tindak_lanjut?: string | null;
  },
): Promise<PreAssessment> {
  const response = await fetchApi(
    `${API_BASE_URL}/api/pre-assessment/psikolog/reports/${idPraAsesmen}/draft`,
    {
      method: "PATCH",
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

  return response.json() as Promise<PreAssessment>;
}


export type MidtransPaymentCreateResponse = {
  id_pemesanan_konsultasi: number;
  id_transaksi_pembayaran: number;
  order_id: string;
  snap_token: string;
  redirect_url: string;
  client_key: string;
  snap_script_url: string;
  jumlah_bayar: string | number;
  status_transaksi?: string | null;
};

export async function initiatePaymentForBooking(
  accessToken: string,
  id_pemesanan_konsultasi: number,
): Promise<MidtransPaymentCreateResponse> {
  const response = await fetchApi(`${API_BASE_URL}/api/pembayaran/midtrans/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id_pemesanan_konsultasi }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<MidtransPaymentCreateResponse>;
}
