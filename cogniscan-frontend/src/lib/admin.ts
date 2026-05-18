import { API_BASE_URL, getApiErrorMessage } from "@/lib/auth";

export type AdminPsikologStatus = "pending" | "terverifikasi" | "ditolak" | string;

export type AdminPsikolog = {
  id_psikolog: number;
  id_pengguna?: string | null;
  nama_lengkap: string;
  email?: string | null;
  nomor_hp?: string | null;
  spesialisasi?: string | null;
  pengalaman_tahun?: number | null;
  universitas_asal?: string | null;
  tahun_lulus?: number | null;
  alamat_praktik?: string | null;
  kota?: string | null;
  provinsi?: string | null;
  tarif_konsultasi?: number | string | null;
  no_str?: string | null;
  no_sip?: string | null;
  tgl_kadaluarsa_str?: string | null;
  tgl_kadaluarsa_sip?: string | null;
  upload_dokumen_str?: string | null;
  upload_dokumen_sip?: string | null;
  bio_singkat?: string | null;
  status_akun?: AdminPsikologStatus | null;
  apakah_sudah_ganti_password?: boolean | null;
  dibuat_pada?: string | null;
};

export type AdminPsikologFilter = "semua" | "pending" | "terverifikasi" | "ditolak";

export type AdminPsikologActionResponse = {
  id_psikolog: number;
  email?: string | null;
  status_akun: string;
  apakah_sudah_ganti_password?: boolean;
  message: string;
};

function adminHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function fetchAdminApi(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Tidak bisa menghubungi backend. Pastikan backend aktif, URL API frontend benar, dan CORS mengizinkan origin frontend.",
      );
    }

    throw error;
  }
}

function listUrl(filter: AdminPsikologFilter) {
  const url = new URL(`${API_BASE_URL}/api/admin/psikolog`);
  url.searchParams.set("status_akun", filter === "semua" ? "" : filter);
  return url.toString();
}

export async function fetchAdminPsikolog(
  accessToken: string,
  filter: AdminPsikologFilter = "semua",
): Promise<AdminPsikolog[]> {
  const response = await fetchAdminApi(listUrl(filter), {
    headers: adminHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<AdminPsikolog[]>;
}

export async function fetchAdminPsikologDetail(
  accessToken: string,
  idPsikolog: number,
): Promise<AdminPsikolog> {
  const response = await fetchAdminApi(`${API_BASE_URL}/api/admin/psikolog/${idPsikolog}`, {
    headers: adminHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<AdminPsikolog>;
}

export async function approveAdminPsikolog(
  accessToken: string,
  idPsikolog: number,
): Promise<AdminPsikologActionResponse> {
  const response = await fetchAdminApi(`${API_BASE_URL}/api/admin/psikolog/${idPsikolog}/approve`, {
    method: "POST",
    headers: {
      ...adminHeaders(accessToken),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<AdminPsikologActionResponse>;
}

export async function resetAdminPsikologTemporaryPassword(
  accessToken: string,
  idPsikolog: number,
): Promise<AdminPsikologActionResponse> {
  const response = await fetchAdminApi(
    `${API_BASE_URL}/api/admin/psikolog/${idPsikolog}/reset-temporary-password`,
    {
      method: "POST",
      headers: {
        ...adminHeaders(accessToken),
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<AdminPsikologActionResponse>;
}

export async function rejectAdminPsikolog(
  accessToken: string,
  idPsikolog: number,
  alasan: string,
): Promise<AdminPsikologActionResponse> {
  const response = await fetchAdminApi(`${API_BASE_URL}/api/admin/psikolog/${idPsikolog}/reject`, {
    method: "POST",
    headers: {
      ...adminHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ alasan }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<AdminPsikologActionResponse>;
}

export function psikologStatusLabel(status?: string | null) {
  if (status === "terverifikasi") return "Disetujui";
  if (status === "ditolak") return "Ditolak";
  return "Menunggu";
}

export function psikologStatusTone(status?: string | null) {
  if (status === "terverifikasi") return "success";
  if (status === "ditolak") return "danger";
  return "warning";
}

export function psikologInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
