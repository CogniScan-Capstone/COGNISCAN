"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, X } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { adminUser, getAdminNav } from "@/components/admin";
import {
  approveAdminPsikolog,
  fetchAdminPsikologDetail,
  psikologStatusLabel,
  rejectAdminPsikolog,
  resetAdminPsikologTemporaryPassword,
  type AdminPsikolog,
} from "@/lib/admin";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

function formatValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function isViewableDocument(value?: string | null) {
  if (!value) return false;
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/");
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <>
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-semibold text-on-surface">{formatValue(value)}</dd>
    </>
  );
}

export default function AdminRegistrationDetailPage() {
  const [registration, setRegistration] = useState<AdminPsikolog | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | "reset" | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRegistration() {
      setIsLoading(true);
      setError("");

      try {
        const idParam = new URLSearchParams(window.location.search).get("id");
        const idPsikolog = Number(idParam);

        if (!Number.isInteger(idPsikolog) || idPsikolog <= 0) {
          throw new Error("ID pendaftaran tidak valid.");
        }

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          throw new Error("Sesi admin tidak ditemukan. Silakan login ulang.");
        }

        const result = await fetchAdminPsikologDetail(token, idPsikolog);
        if (isMounted) {
          setRegistration(result);
          setAccessToken(token);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat detail pendaftaran.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRegistration();

    return () => {
      isMounted = false;
    };
  }, []);

  const documents = useMemo(() => {
    if (!registration) return [];

    return [
      {
        label: "Dokumen STR",
        name: registration.upload_dokumen_str || "Belum ada dokumen STR",
        href: registration.upload_dokumen_str,
      },
      {
        label: "Dokumen SIP",
        name: registration.upload_dokumen_sip || "Belum ada dokumen SIP",
        href: registration.upload_dokumen_sip,
      },
    ];
  }, [registration]);

  const isPending = registration?.status_akun === "pending";
  const canResetTemporaryPassword =
    registration?.status_akun === "terverifikasi" && !registration.apakah_sudah_ganti_password;

  async function handleApprove() {
    if (!registration || !accessToken || !isPending) return;

    setActionType("approve");
    setActionError("");
    setNotice("");

    try {
      const result = await approveAdminPsikolog(accessToken, registration.id_psikolog);
      setRegistration({
        ...registration,
        status_akun: result.status_akun,
        apakah_sudah_ganti_password: result.apakah_sudah_ganti_password ?? false,
      });
      setNotice("Akun psikolog berhasil dibuat dan temporary password dikirim lewat email.");
      setShowRejectForm(false);
      setRejectReason("");
    } catch (approveError) {
      setActionError(approveError instanceof Error ? approveError.message : "Gagal menyetujui pendaftaran.");
    } finally {
      setActionType(null);
    }
  }

  async function handleReject() {
    if (!registration || !accessToken || !isPending) return;

    if (!showRejectForm) {
      setShowRejectForm(true);
      setActionError("");
      setNotice("");
      return;
    }

    if (rejectReason.trim().length < 5) {
      setActionError("Alasan penolakan minimal 5 karakter.");
      return;
    }

    setActionType("reject");
    setActionError("");
    setNotice("");

    try {
      const result = await rejectAdminPsikolog(accessToken, registration.id_psikolog, rejectReason.trim());
      setRegistration({
        ...registration,
        status_akun: result.status_akun,
      });
      setNotice("Pendaftaran psikolog ditolak dan email pemberitahuan dikirim jika SMTP aktif.");
      setShowRejectForm(false);
    } catch (rejectError) {
      setActionError(rejectError instanceof Error ? rejectError.message : "Gagal menolak pendaftaran.");
    } finally {
      setActionType(null);
    }
  }

  async function handleResetTemporaryPassword() {
    if (!registration || !accessToken || !canResetTemporaryPassword) return;

    setActionType("reset");
    setActionError("");
    setNotice("");

    try {
      const result = await resetAdminPsikologTemporaryPassword(accessToken, registration.id_psikolog);
      setRegistration({
        ...registration,
        status_akun: result.status_akun,
        apakah_sudah_ganti_password: result.apakah_sudah_ganti_password ?? false,
      });
      setNotice("Temporary password baru sudah dikirim ke email psikolog.");
    } catch (resetError) {
      setActionError(resetError instanceof Error ? resetError.message : "Gagal mengirim ulang temporary password.");
    } finally {
      setActionType(null);
    }
  }

  return (
    <DashboardLayout
      navItems={getAdminNav("pendaftaran")}
      user={adminUser}
      contentClassName="relative lg:px-6 xl:px-6"
    >
      <div className="pointer-events-none max-w-[980px] opacity-25 blur-[2px]">
        <header className="mb-6">
          <h1 className="text-[22px] font-extrabold tracking-[-0.01em] text-[#8d5367]">
            Pendaftaran Masuk
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Daftar psikolog yang mengajukan pendaftaran dan menunggu verifikasi dokumen.
          </p>
        </header>
        <div className="h-[620px] rounded-[14px] bg-white shadow-[0_20px_40px_-30px_rgba(27,28,26,0.35)]" />
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 px-5 py-10">
        <section className="w-full max-w-[620px] overflow-hidden rounded-[16px] bg-white shadow-[0_30px_70px_-30px_rgba(27,28,26,0.55)]">
          <div className="h-2 bg-primary" />
          <div className="max-h-[calc(100vh-72px)] overflow-y-auto px-6 pb-8 pt-6">
            <header className="mb-7 flex items-center justify-between">
              <div>
                <h1 className="text-[22px] font-extrabold tracking-[-0.01em] text-[#8d5367]">
                  Detail Pendaftaran
                </h1>
                {registration ? (
                  <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                    Status: {psikologStatusLabel(registration.status_akun)}
                  </p>
                ) : null}
              </div>
              <Link
                href="/admin/pendaftaran"
                aria-label="Tutup detail pendaftaran"
                className="rounded-md p-1 text-on-surface transition hover:bg-surface-container"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Link>
            </header>

            {isLoading ? (
              <div className="rounded-[10px] bg-surface-container px-6 py-6 text-sm text-on-surface-variant">
                Memuat detail pendaftaran...
              </div>
            ) : error ? (
              <div className="rounded-[10px] border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : registration ? (
              <>
                <section className="rounded-[10px] bg-surface-container px-6 py-4">
                  <dl className="grid grid-cols-[132px_1fr] gap-x-4 gap-y-2 text-sm">
                    <DetailRow label="Nama Lengkap:" value={registration.nama_lengkap} />
                    <DetailRow label="NIK:" value={registration.nik} />
                    <DetailRow label="Email:" value={registration.email} />
                    <DetailRow label="No. HP:" value={registration.nomor_hp} />
                    <DetailRow label="Kota:" value={registration.kota} />
                    <DetailRow label="Provinsi:" value={registration.provinsi} />
                    <DetailRow label="Tarif:" value={registration.tarif_konsultasi ? `Rp ${Number(registration.tarif_konsultasi).toLocaleString("id-ID")}` : null} />
                  </dl>
                </section>

                <section className="mt-5 rounded-[10px] bg-surface-container px-6 py-4">
                  <dl className="grid grid-cols-[132px_1fr] gap-x-4 gap-y-2 text-sm">
                    <DetailRow label="No. STR:" value={registration.no_str} />
                    <DetailRow label="No. SIP:" value={registration.no_sip} />
                    <DetailRow label="Alamat Praktik:" value={registration.alamat_praktik} />
                  </dl>
                </section>

                <section className="mt-7">
                  <h2 className="mb-4 text-sm font-medium uppercase text-[#8d5367]">
                    Verifikasi Dokumen
                  </h2>
                  <div className="space-y-3">
                    {documents.map((doc) => {
                      const canView = isViewableDocument(doc.href);

                      return (
                        <article
                          key={doc.label}
                          className="flex items-center justify-between gap-4 rounded-[10px] border border-outline-variant px-4 py-4"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#fff0f0] text-red-600">
                              <FileText className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-[15px] font-extrabold text-on-surface">{doc.label}</h3>
                              <p className="mt-1 truncate text-xs text-on-surface-muted">{doc.name}</p>
                            </div>
                          </div>
                          {canView ? (
                            <a
                              href={doc.href ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-extrabold text-primary hover:text-primary-container"
                            >
                              Lihat
                            </a>
                          ) : (
                            <span className="text-sm font-semibold text-on-surface-muted">Tersimpan</span>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>

                {notice ? (
                  <div className="mt-6 flex gap-3 rounded-[10px] border border-[#c2d8c6] bg-[#e5efe5] px-4 py-3 text-sm font-semibold text-primary">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>{notice}</p>
                  </div>
                ) : null}

                {actionError ? (
                  <div className="mt-6 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {actionError}
                  </div>
                ) : null}

                {showRejectForm && isPending ? (
                  <label className="mt-6 block">
                    <span className="mb-2 block text-sm font-extrabold text-on-surface">
                      Alasan penolakan
                    </span>
                    <textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={4}
                      placeholder="Tuliskan alasan yang jelas untuk psikolog."
                      className="w-full resize-none rounded-[10px] border border-outline-variant bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary-container/20"
                    />
                  </label>
                ) : null}

                <footer className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  {canResetTemporaryPassword ? (
                    <button
                      type="button"
                      onClick={handleResetTemporaryPassword}
                      disabled={actionType !== null}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-primary px-8 text-[15px] font-extrabold text-primary transition hover:bg-primary-container/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionType === "reset" ? "Mengirim..." : "Kirim Ulang Password"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={!isPending || actionType !== null}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-full border px-8 text-[15px] font-extrabold transition",
                      isPending
                        ? "border-red-600 text-red-600 hover:bg-red-50"
                        : "cursor-not-allowed border-outline-variant text-on-surface-muted",
                    )}
                  >
                    {actionType === "reject" ? "Menolak..." : showRejectForm ? "Konfirmasi Tolak" : "Tolak"}
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={!isPending || actionType !== null}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-full px-8 text-[15px] font-extrabold shadow-[0_16px_26px_-18px_rgba(65,87,62,0.75)] transition",
                      isPending
                        ? "bg-primary text-white hover:bg-[#365f39]"
                        : "cursor-not-allowed bg-surface-container text-on-surface-muted shadow-none",
                    )}
                  >
                    {actionType === "approve" ? "Menyetujui..." : "Setujui Pendaftaran"}
                  </button>
                </footer>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
