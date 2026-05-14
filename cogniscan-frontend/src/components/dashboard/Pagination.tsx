import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  getPageHref?: (page: number) => string;
  className?: string;
};

export function Pagination({ currentPage, totalPages, getPageHref, className }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className={cn("flex items-center justify-end gap-3", className)} aria-label="Pagination">
      <PageControl
        label="Halaman sebelumnya"
        page={Math.max(1, currentPage - 1)}
        disabled={currentPage === 1}
        href={getPageHref?.(Math.max(1, currentPage - 1))}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </PageControl>

      {pages.map((page) => (
        <PageControl
          key={page}
          label={`Halaman ${page}`}
          page={page}
          active={page === currentPage}
          href={getPageHref?.(page)}
        >
          {page}
        </PageControl>
      ))}

      <PageControl
        label="Halaman berikutnya"
        page={Math.min(totalPages, currentPage + 1)}
        disabled={currentPage === totalPages}
        href={getPageHref?.(Math.min(totalPages, currentPage + 1))}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </PageControl>
    </nav>
  );
}

function PageControl({
  children,
  label,
  active,
  disabled,
  href,
}: {
  children: React.ReactNode;
  label: string;
  page: number;
  active?: boolean;
  disabled?: boolean;
  href?: string;
}) {
  const classes = cn(
    "inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] border border-outline-variant px-2 text-sm font-semibold transition-colors",
    active
      ? "border-primary bg-primary text-white"
      : "bg-white text-on-surface-variant hover:border-primary hover:text-primary",
    disabled && "pointer-events-none opacity-45",
  );

  if (href && !disabled) {
    return (
      <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} aria-current={active ? "page" : undefined} className={classes} disabled={disabled}>
      {children}
    </button>
  );
}

