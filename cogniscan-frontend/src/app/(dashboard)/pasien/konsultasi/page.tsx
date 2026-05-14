import { CalendarDays, Clock3, MapPin, Monitor } from "lucide-react";
import { DashboardCard, DashboardLayout, StatusBadge } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser } from "@/components/patient";

const consultations = [
  {
    date: "Rabu, 14 Mei 2026",
    time: "10:00 WIB",
    method: "Online (Google Meet)",
    icon: <Monitor />,
  },
  {
    date: "Jumat, 16 Mei 2026",
    time: "14:00 WIB",
    method: "Offline (Klinik CogniScan Pusat)",
    icon: <MapPin />,
  },
];

export default function PatientConsultationPage() {
  return (
    <DashboardLayout
      title="Konsultasi"
      navItems={getPatientNav("konsultasi")}
      user={patientUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="max-w-[940px]">
        <header className="mb-9">
          <h2 className="text-[38px] font-extrabold tracking-[-0.03em] text-[#6f5794]">
            Konsultasi Saya
          </h2>
          <p className="mt-1 text-[16px] text-on-surface-variant">
            Pantau status sesi konsultasimu.
          </p>
        </header>

        <div className="mb-8 border-b border-outline-variant">
          <div className="flex flex-wrap gap-8">
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 border-b-2 border-primary text-[16px] font-extrabold text-primary"
            >
              Menunggu
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#dfe9de] px-2 text-sm text-primary">
                2
              </span>
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center border-b-2 border-transparent text-[16px] font-medium text-on-surface-variant"
            >
              Selesai
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {consultations.map((item) => (
            <DashboardCard key={`${item.date}-${item.time}`} className="px-6 py-6">
              <StatusBadge
                tone="danger"
                className="mb-5 h-7 border-[#f5d6e1] bg-[#fde9f0] text-[#9a536b]"
              >
                <Clock3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Menunggu
              </StatusBadge>

              <div className="border-t border-surface-variant pt-5">
                <div className="space-y-4 text-[17px] text-on-surface-variant">
                  <p className="flex items-center gap-3">
                    <CalendarDays className="h-6 w-6 text-primary" aria-hidden="true" />
                    {item.date}
                  </p>
                  <p className="flex items-center gap-3">
                    <Clock3 className="h-6 w-6 text-primary" aria-hidden="true" />
                    {item.time}
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="text-primary [&_svg]:h-6 [&_svg]:w-6">{item.icon}</span>
                    {item.method}
                  </p>
                </div>
              </div>
            </DashboardCard>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
