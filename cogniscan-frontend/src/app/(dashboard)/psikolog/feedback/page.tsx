"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { DashboardCard, DashboardLayout } from "@/components/dashboard";
import { getPsikologNav, psikologUser } from "@/components/psikolog";
import { cn } from "@/lib/utils";

type Priority = "high" | "medium" | "low";
type ResponseStatus = "belum-direspon" | "sudah-direspon";
type SortKey = "terbaru" | "terlama" | "prioritas";

type FeedbackItem = {
  id: string;
  name: string;
  topic: string;
  topicTone: "peach" | "orange" | "lilac" | "green" | "blue";
  relativeTime: string;
  createdAt: number;
  priority: Priority;
  status: ResponseStatus;
  message: string;
  italic?: boolean;
};

const feedback: FeedbackItem[] = [
  {
    id: "rina-marlina",
    name: "Rina Marlina",
    topic: "Keluarga",
    topicTone: "peach",
    relativeTime: "2 jam yang lalu",
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    priority: "high",
    status: "belum-direspon",
    message:
      "Saya merasa kesulitan untuk berkomunikasi dengan anak saya belakangan ini. Setiap kali saya mencoba berbicara, dia justru menjauh. Mohon arahannya untuk sesi minggu depan apakah kita bisa fokus pada topik ini?",
  },
  {
    id: "sari-wulandari",
    name: "Sari Wulandari",
    topic: "Pendidikan",
    topicTone: "orange",
    relativeTime: "Kemarin, 14:20",
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    priority: "low",
    status: "sudah-direspon",
    message:
      "Terima kasih atas sarannya dokter, saya sudah mulai menerapkan jadwal belajar baru dan merasa jauh lebih tenang.",
    italic: true,
  },
  {
    id: "dimas-pratama",
    name: "Dimas Pratama",
    topic: "Kecemasan",
    topicTone: "lilac",
    relativeTime: "Kemarin, 09:15",
    createdAt: Date.now() - 1000 * 60 * 60 * 28,
    priority: "high",
    status: "belum-direspon",
    message:
      "Beberapa hari ini saya susah tidur dan jantung sering berdebar kencang menjelang ujian. Saya butuh strategi cepat untuk menenangkan diri sebelum sesi ujian besok.",
  },
  {
    id: "bagas-nugroho",
    name: "Bagas Nugroho",
    topic: "Keuangan",
    topicTone: "green",
    relativeTime: "2 hari lalu",
    createdAt: Date.now() - 1000 * 60 * 60 * 50,
    priority: "medium",
    status: "belum-direspon",
    message:
      "Pekerjaan saya sedang tidak stabil dan saya merasa cemas memikirkan tagihan bulan depan. Apakah ada teknik untuk mengelola pikiran berulang seperti ini?",
  },
  {
    id: "lina-marlina",
    name: "Lina Marlina",
    topic: "Hubungan",
    topicTone: "blue",
    relativeTime: "3 hari lalu",
    createdAt: Date.now() - 1000 * 60 * 60 * 74,
    priority: "medium",
    status: "sudah-direspon",
    message:
      "Saya dan pasangan sudah mencoba teknik komunikasi yang dokter sarankan, perlahan terasa lebih lega. Terima kasih banyak.",
    italic: true,
  },
];

const PAGE_SIZE = 2;

const topicToneClass: Record<FeedbackItem["topicTone"], string> = {
  peach: "border-[#f1d2c5] bg-[#fce6dc] text-[#a3553c]",
  orange: "border-[#fadcb5] bg-[#fdedd6] text-[#a35a1a]",
  lilac: "border-[#dbcfee] bg-[#e8e0f0] text-[#6f5794]",
  green: "border-[#c4ddc5] bg-[#dfeedf] text-[#3f5a3f]",
  blue: "border-[#c7d5ec] bg-[#e8effb] text-[#47658f]",
};

const priorityLabel: Record<Priority | "all", string> = {
  all: "Semua",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityBadge: Record<Priority, string> = {
  high: "bg-[#fbd6d4] text-[#a3372e]",
  medium: "bg-[#fbe8c5] text-[#a35a1a]",
  low: "bg-surface-container text-on-surface-variant",
};

const priorityDot: Record<Priority, string> = {
  high: "bg-[#d13a31]",
  medium: "bg-[#d37300]",
  low: "bg-on-surface-muted",
};

const statusLabel: Record<ResponseStatus | "all", string> = {
  all: "Semua",
  "belum-direspon": "Belum Direspon",
  "sudah-direspon": "Sudah Direspon",
};

const statusBadge: Record<ResponseStatus, string> = {
  "belum-direspon": "bg-surface-container text-on-surface-variant",
  "sudah-direspon": "bg-[#dfeedf] text-[#3f5a3f]",
};

const sortLabel: Record<SortKey, string> = {
  terbaru: "Terbaru",
  terlama: "Terlama",
  prioritas: "Prioritas Tinggi",
};

export default function PsikologFeedbackPage() {
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">(
    "high",
  );
  const [statusFilter, setStatusFilter] = useState<ResponseStatus | "all">(
    "belum-direspon",
  );
  const [sort, setSort] = useState<SortKey>("terbaru");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = feedback.filter((item) => {
      const matchSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());

      if (!matchSearch) {
        return false;
      }

      if (priorityFilter !== "all" && item.priority !== priorityFilter) {
        return false;
      }

      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      return true;
    });

    const priorityRank: Record<Priority, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };
    list.sort((a, b) => {
      if (sort === "terbaru") return b.createdAt - a.createdAt;
      if (sort === "terlama") return a.createdAt - b.createdAt;
      return priorityRank[b.priority] - priorityRank[a.priority];
    });

    return list;
  }, [priorityFilter, statusFilter, sort, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const resetFilters = () => {
    setPriorityFilter("all");
    setStatusFilter("all");
    setSort("terbaru");
    setSearch("");
    setPage(1);
  };

  return (
    <DashboardLayout
      title="Feedback"
      navItems={getPsikologNav("feedback")}
      user={psikologUser}
      contentClassName="lg:px-10 xl:px-10"
    >
      <div className="space-y-6">
        <DashboardCard className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Dropdown
              label="Prioritas"
              value={priorityLabel[priorityFilter]}
              valueClassName={
                priorityFilter === "all"
                  ? "text-on-surface"
                  : priorityFilter === "high"
                    ? "text-[#a3372e]"
                    : priorityFilter === "medium"
                      ? "text-[#a35a1a]"
                      : "text-on-surface-variant"
              }
              dot={
                priorityFilter !== "all"
                  ? priorityDot[priorityFilter as Priority]
                  : undefined
              }
              items={[
                { value: "all", label: "Semua" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
              onChange={(v) => {
                setPriorityFilter(v as Priority | "all");
                setPage(1);
              }}
            />
            <span className="h-7 w-px bg-outline-variant" aria-hidden="true" />
            <Dropdown
              label="Status"
              value={statusLabel[statusFilter]}
              valueClassName={
                statusFilter === "belum-direspon"
                  ? "text-[#d37300]"
                  : statusFilter === "sudah-direspon"
                    ? "text-primary"
                    : "text-on-surface"
              }
              items={[
                { value: "all", label: "Semua" },
                { value: "belum-direspon", label: "Belum Direspon" },
                { value: "sudah-direspon", label: "Sudah Direspon" },
              ]}
              onChange={(v) => {
                setStatusFilter(v as ResponseStatus | "all");
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama pasien..."
              className="h-10 w-50 rounded-full border border-outline-variant bg-white px-4 text-[14px] text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 text-[14px] font-medium text-on-surface-variant transition-colors hover:text-primary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Reset Filter
            </button>
          </div>
        </DashboardCard>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[14px] text-on-surface-variant">
            Menampilkan {filtered.length} hasil
          </p>

          <Dropdown
            label="Sort"
            value={sortLabel[sort]}
            valueClassName="text-on-surface"
            inline
            items={[
              { value: "terbaru", label: "Terbaru" },
              { value: "terlama", label: "Terlama" },
              { value: "prioritas", label: "Prioritas Tinggi" },
            ]}
            onChange={(v) => setSort(v as SortKey)}
          />
        </div>

        <div className="space-y-5">
          {visible.length === 0 ? (
            <DashboardCard className="px-8 py-14 text-center">
              <p className="text-[15px] text-on-surface-variant">
                Tidak ada feedback yang cocok dengan filter ini.
              </p>
            </DashboardCard>
          ) : (
            visible.map((item) => (
              <DashboardCard key={item.id} className="px-7 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-[17px] font-bold text-on-surface">
                        {item.name}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-bold uppercase tracking-widest",
                          topicToneClass[item.topicTone],
                        )}
                      >
                        {item.topic}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] text-on-surface-muted">
                      {item.relativeTime}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-7 items-center rounded-full px-3 text-[11px] font-bold uppercase tracking-widest",
                        priorityBadge[item.priority],
                      )}
                    >
                      {item.priority} Priority
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-7 items-center rounded-full px-3 text-[11px] font-bold uppercase tracking-widest",
                        statusBadge[item.status],
                      )}
                    >
                      {statusLabel[item.status]}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-muted">
                    Pesan Pasien:
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-[15px] leading-7 text-on-surface-variant",
                      item.italic && "italic",
                    )}
                  >
                    {item.italic ? `"${item.message}"` : item.message}
                  </p>
                </div>

                <hr className="my-6 border-outline-variant/70" />

                <div>
                  {item.status === "belum-direspon" ? (
                    <Link
                      href={`/psikolog/feedback/${item.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[#3f5a3f] px-6 text-[14px] font-semibold text-white transition hover:bg-[#324a32]"
                    >
                      Tulis Respon
                    </Link>
                  ) : (
                    <Link
                      href={`/psikolog/feedback/${item.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-outline-variant px-6 text-[14px] font-semibold text-on-surface transition hover:border-primary hover:text-primary"
                    >
                      Lihat Respon
                    </Link>
                  )}
                </div>
              </DashboardCard>
            ))
          )}
        </div>

        {totalPages > 1 ? (
          <div className="pt-2">
            <FeedbackPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

type DropdownItem = { value: string; label: string };

type DropdownProps = {
  label: string;
  value: string;
  valueClassName?: string;
  items: DropdownItem[];
  onChange: (value: string) => void;
  dot?: string;
  inline?: boolean;
};

function Dropdown({
  label,
  value,
  valueClassName,
  items,
  onChange,
  dot,
  inline,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded-full text-[14px] font-medium transition-colors",
          inline
            ? "text-on-surface-variant hover:text-primary"
            : "h-10 border border-outline-variant bg-white px-4 text-on-surface hover:border-primary",
        )}
      >
        <span className="text-on-surface-variant">{label}:</span>
        {dot ? (
          <span
            className={cn("h-2 w-2 rounded-full", dot)}
            aria-hidden="true"
          />
        ) : null}
        <span className={cn("font-semibold", valueClassName)}>{value}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          className={cn(
            "absolute z-20 mt-2 min-w-45 overflow-hidden rounded-[12px] border border-outline-variant bg-white py-1 shadow-[0_18px_36px_-18px_rgba(27,28,26,0.22)]",
            inline ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                role="option"
                aria-selected={item.label === value}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2 text-left text-[14px] font-medium transition-colors",
                  item.label === value
                    ? "bg-primary-container/15 text-primary"
                    : "text-on-surface hover:bg-surface-container",
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FeedbackPagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav
      className="flex items-center justify-center gap-3"
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Halaman sebelumnya"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === currentPage ? "page" : undefined}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-semibold transition",
            p === currentPage
              ? "bg-[#3f5a3f] text-white"
              : "border border-outline-variant bg-white text-on-surface hover:border-primary hover:text-primary",
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Halaman berikutnya"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}