import Link from "next/link";
import { ArrowRight, CalendarDays, KeyRound, Phone } from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser } from "@/components/patient";

function ProfileInput({
  label,
  value,
  icon,
  type = "text",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-medium text-on-surface-variant">{label}</span>
      <span className="relative block">
        {icon ? (
          <span className="absolute left-4 top-1/2 flex -translate-y-1/2 text-on-surface-variant [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
        <input
          type={type}
          defaultValue={value}
          className={`h-12 w-full rounded-[10px] border border-outline-variant bg-white px-4 text-[15px] text-on-surface outline-none transition focus:border-primary-container focus:ring-4 focus:ring-primary-container/15 ${
            icon ? "pl-11" : ""
          }`}
        />
      </span>
    </label>
  );
}

export default function PatientProfilePage() {
  return (
    <DashboardLayout
      navItems={getPatientNav("dashboard")}
      user={patientUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div>
        <header className="mb-10">
          <h1 className="text-[34px] font-extrabold tracking-[-0.02em] text-[#6f5794]">
            Profil Saya
          </h1>
          <p className="mt-1 text-[16px] text-on-surface-variant">
            Kelola informasi akun dan data pribadimu.
          </p>
        </header>

        <DashboardCard className="border border-outline-variant/70 px-10 py-10">
          <h2 className="mb-10 text-sm font-extrabold uppercase tracking-[0.16em] text-[#6f5794]">
            Informasi Pribadi
          </h2>

          <form>
            <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
              <div className="space-y-5">
                <ProfileInput label="Nama Lengkap" value="Budi Santoso" />
                <ProfileInput label="Email" value="budi.santoso@email.com" type="email" />
                <ProfileInput label="No. HP" value="+62 812-3456-7890" icon={<Phone />} />
                <ProfileInput label="Tanggal Lahir" value="15/05/1992" icon={<CalendarDays />} />
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-[15px] font-medium text-on-surface-variant">
                    Alamat Lengkap
                  </span>
                  <textarea
                    defaultValue="Jl. Melati No. 12, Jakarta Selatan"
                    rows={4}
                    className="w-full resize-none rounded-[10px] border border-outline-variant bg-white px-4 py-3 text-[15px] text-on-surface outline-none transition focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                  />
                </label>

                <fieldset>
                  <legend className="mb-3 text-[15px] font-medium text-on-surface-variant">
                    Jenis Kelamin
                  </legend>
                  <div className="flex gap-8">
                    <label className="inline-flex items-center gap-3 text-[15px] text-on-surface">
                      <input
                        type="radio"
                        name="gender"
                        defaultChecked
                        className="h-5 w-5 appearance-none rounded-full border border-outline-variant bg-white checked:border-[6px] checked:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/20"
                      />
                      Laki-laki
                    </label>
                    <label className="inline-flex items-center gap-3 text-[15px] text-on-surface">
                      <input
                        type="radio"
                        name="gender"
                        className="h-5 w-5 appearance-none rounded-full border border-outline-variant bg-white checked:border-[6px] checked:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/20"
                      />
                      Perempuan
                    </label>
                  </div>
                </fieldset>

                <div className="rounded-[12px] border border-outline-variant bg-surface px-5 py-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-[#6f5794]">
                      <KeyRound className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-on-surface">
                        Password Akun
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                        Untuk keamanan akun, perubahan password dilakukan di halaman terpisah.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/reset-password"
                    className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full border border-primary px-5 text-[14px] font-semibold text-primary transition hover:bg-primary-container/10"
                  >
                    Buat Password Baru
                  </Link>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="mt-14 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-primary px-8 text-[16px] font-medium text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:-translate-y-0.5 hover:bg-[#365f39]"
            >
              Simpan Perubahan
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
}
