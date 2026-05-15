import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  MessageSquare,
  Video,
} from "lucide-react";
import {
  DashboardLayout,
  DashboardTable,
  DashboardTableCell,
  DashboardTableHeader,
  MetricCard,
  StatusBadge,
} from "@/components/dashboard";
import { getPsikologNav, psikologUser } from "@/components/psikolog";
import { cn } from "@/lib/utils";

type SessionRow = {
  id: string;
  initials: string;
  initialsTone: "green" | "purple" | "neutral";
  name: string;
  topic: string;
  time: string;
  method: "online" | "offline";
  status: "selesai" | "berlangsung" | "menunggu";
};

const sessions: SessionRow[] = [
  {
    id: "rina-marlina",
    initials: "RM",
    initialsTone: "green",
    name: "Rina Marlina",
    topic: "Keluarga",
    time: "09:00 WIB",
    method: "online",
    status: "selesai",
  },
  {
    id: "dimas-pratama",
    initials: "DP",
    initialsTone: "purple",
    name: "Dimas Pratama",
    topic: "Kecemasan",
    time: "10:00 WIB",
    method: "online",
    status: "berlangsung",
  },
  {
    id: "sari-wulandari",
    initials: "SW",
    initialsTone: "neutral",
    name: "Sari Wulandari",
    topic: "Pendidikan",
    time: "13:00 WIB",
    method: "offline",
    status: "menunggu",
  },
  {
    id: "bagas-nugroho",
    initials: "BN",
    initialsTone: "neutral",
    name: "Bagas Nugroho",
    topic: "Keuangan",
    time: "14:00 WIB",
    method: "online",
    status: "menunggu",
  },
];

const initialsToneClass: Record<SessionRow["initialsTone"], string> = {
  green: "bg-primary-fixed-dim text-primary",
  purple: "bg-secondary-container text-[#6f5794]",
  neutral: "bg-surface-container text-on-surface-variant",
};

const statusLabel: Record<SessionRow["status"], string> = {
  selesai: "Selesai",
  berlangsung: "Berlangsung",
  menunggu: "Menunggu",
};

const statusDot: Record<SessionRow["status"], string> = {
  selesai: "bg-primary",
  berlangsung: "bg-[#d37300]",
  menunggu: "bg-on-surface-muted",
};

const statusText: Record<SessionRow["status"], string> = {
  selesai: "text-primary",
  berlangsung: "text-[#d37300]",
  menunggu: "text-on-surface-muted",
};

export default function PsikologDashboardPage() {
  return (
    <DashboardLayout
      title="Dashboard"
      navItems={getPsikologNav("dashboard")}
      user={psikologUser}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="space-y-8">
        <section className="grid gap-6 lg:grid-cols-2">
          <MetricCard
            label="Konsultasi Hari Ini"
            value="6"
            icon={<CalendarDays />}
            iconTone="purple"
          />
          <MetricCard
            label="Pesan Masuk"
            value="14"
            icon={<MessageSquare />}
            iconTone="green"
          />
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold text-[#6f5794]">
                Konsultasi Hari Ini
              </h2>
              <p className="mt-1 text-[14px] text-on-surface-variant">
                Kelola antrian dan jadwal sesi aktif pasien Anda.
              </p>
            </div>
            <Link
              href="/psikolog/jadwal"
              className="inline-flex items-center gap-1 text-[14px] font-semibold text-primary hover:underline"
            >
              Lihat Semua
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <DashboardTable>
            <table className="w-full min-w-[820px] border-collapse">
              <DashboardTableHeader>
                <tr>
                  <DashboardTableCell as="th" className="border-b-0 px-6 py-3">
                    Pasien
                  </DashboardTableCell>
                  <DashboardTableCell as="th" className="border-b-0 px-6 py-3">
                    Topik
                  </DashboardTableCell>
                  <DashboardTableCell as="th" className="border-b-0 px-6 py-3">
                    Waktu
                  </DashboardTableCell>
                  <DashboardTableCell as="th" className="border-b-0 px-6 py-3">
                    Metode
                  </DashboardTableCell>
                  <DashboardTableCell as="th" className="border-b-0 px-6 py-3">
                    Status
                  </DashboardTableCell>
                  <DashboardTableCell
                    as="th"
                    className="border-b-0 px-6 py-3 text-right"
                  >
                    Aksi
                  </DashboardTableCell>
                </tr>
              </DashboardTableHeader>
              <tbody>
                {sessions.map((session, index) => {
                  const isLast = index === sessions.length - 1;
                  const isActive = session.status === "berlangsung";
                  return (
                    <tr
                      key={session.id}
                      className={cn(
                        isActive && "bg-primary-container/10",
                        "transition-colors hover:bg-surface-container/60",
                      )}
                    >
                      <DashboardTableCell
                        className={cn("font-semibold", isLast && "border-b-0")}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                              initialsToneClass[session.initialsTone],
                            )}
                          >
                            {session.initials}
                          </span>
                          <span className="text-on-surface">{session.name}</span>
                        </div>
                      </DashboardTableCell>
                      <DashboardTableCell className={cn(isLast && "border-b-0")}>
                        <StatusBadge tone="purple">{session.topic}</StatusBadge>
                      </DashboardTableCell>
                      <DashboardTableCell
                        className={cn("font-medium", isLast && "border-b-0")}
                      >
                        {session.time}
                      </DashboardTableCell>
                      <DashboardTableCell className={cn(isLast && "border-b-0")}>
                        <span className="inline-flex items-center gap-2 text-on-surface-variant">
                          {session.method === "online" ? (
                            <Video className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                          )}
                          {session.method === "online" ? "Online" : "Offline"}
                        </span>
                      </DashboardTableCell>
                      <DashboardTableCell className={cn(isLast && "border-b-0")}>
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 font-semibold",
                            statusText[session.status],
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              statusDot[session.status],
                            )}
                          />
                          {statusLabel[session.status]}
                        </span>
                      </DashboardTableCell>
                      <DashboardTableCell
                        className={cn(
                          "text-right",
                          isLast && "border-b-0",
                        )}
                      >
                        {session.status === "berlangsung" ? (
                          <Link
                            href={`/psikolog/feedback/${session.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-full bg-[#3f5a3f] px-5 text-sm font-semibold text-white transition hover:bg-[#324a32]"
                          >
                            Masuk Sesi
                          </Link>
                        ) : (
                          <Link
                            href={`/psikolog/feedback/${session.id}`}
                            className={cn(
                              "text-sm font-semibold transition-colors",
                              session.status === "selesai"
                                ? "text-on-surface hover:text-primary"
                                : "text-on-surface-muted hover:text-on-surface",
                            )}
                          >
                            Lihat Detail
                          </Link>
                        )}
                      </DashboardTableCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DashboardTable>
        </section>
      </div>
    </DashboardLayout>
  );
}
