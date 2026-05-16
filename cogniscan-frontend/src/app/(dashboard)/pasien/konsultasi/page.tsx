"use client";

import { useState } from "react";
import { CalendarDays, Clock3, MapPin, Monitor, CheckCircle2 } from "lucide-react";
import { DashboardCard, DashboardLayout, StatusBadge } from "@/components/dashboard";
import { getPatientNav, patientProfileHref, patientUser } from "@/components/patient";

const consultations = [
  {
    id: 1,
    date: "Rabu, 14 Mei 2026",
    time: "10:00 WIB",
    method: "Online (Google Meet)",
    icon: <Monitor />,
    status: "menunggu",
  },
  {
    id: 2,
    date: "Jumat, 16 Mei 2026",
    time: "14:00 WIB",
    method: "Offline (Klinik CogniScan Pusat)",
    icon: <MapPin />,
    status: "menunggu",
  },
  {
    id: 3,
    date: "Selasa, 12 Mei 2026",
    time: "09:00 WIB",
    method: "Online (Google Meet)",
    icon: <Monitor />,
    status: "selesai",
  },
  {
    id: 4,
    date: "Senin, 11 Mei 2026",
    time: "15:00 WIB",
    method: "Offline (Klinik CogniScan Pusat)",
    icon: <MapPin />,
    status: "selesai",
  },
];

export default function PatientConsultationPage() {
  const [activeTab, setActiveTab] = useState<"menunggu" | "selesai">("menunggu");

  const filteredConsultations = consultations.filter((c) => c.status === activeTab);

  return (
    <DashboardLayout
      title="Konsultasi"
      navItems={getPatientNav("konsultasi")}
      user={patientUser}
      profileHref={patientProfileHref}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div>
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
              onClick={() => setActiveTab("menunggu")}
              className={`inline-flex h-12 items-center gap-2 border-b-2 text-[16px] font-extrabold ${
                activeTab === "menunggu"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant"
              }`}
            >
              Menunggu
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#dfe9de] px-2 text-sm text-primary">
                {consultations.filter((c) => c.status === "menunggu").length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("selesai")}
              className={`inline-flex h-12 items-center gap-2 border-b-2 text-[16px] font-extrabold ${
                activeTab === "selesai"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant"
              }`}
            >
              Selesai
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#dfe9de] px-2 text-sm text-primary">
                {consultations.filter((c) => c.status === "selesai").length}
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {filteredConsultations.map((item) => (
            <DashboardCard key={item.id} className="px-6 py-6">
              <StatusBadge
                tone={activeTab === "menunggu" ? "danger" : "success"}
                className={`mb-5 h-7 border-[${
                  activeTab === "menunggu" ? "#f5d6e1" : "#d4edda"
                }] bg-[${
                  activeTab === "menunggu" ? "#fde9f0" : "#e8f5e9"
                }] text-[${activeTab === "menunggu" ? "#9a536b" : "#2e7d32"}]`}
              >
                {activeTab === "menunggu" ? (
                  <Clock3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                )}
                {activeTab === "menunggu" ? "Menunggu" : "Selesai"}
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