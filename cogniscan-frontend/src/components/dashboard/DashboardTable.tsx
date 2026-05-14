import type { ReactNode } from "react";
import { DashboardCard } from "./DashboardCard";
import { cn } from "@/lib/utils";

type DashboardTableProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardTable({ children, className }: DashboardTableProps) {
  return (
    <DashboardCard className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto">{children}</div>
    </DashboardCard>
  );
}

export function DashboardTableHeader({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface-container text-left text-xs font-extrabold uppercase tracking-[0.08em] text-on-surface-variant">
      {children}
    </thead>
  );
}

export function DashboardTableCell({
  children,
  className,
  as = "td",
}: {
  children: ReactNode;
  className?: string;
  as?: "td" | "th";
}) {
  const Comp = as;

  return (
    <Comp className={cn("border-b border-surface-variant px-6 py-4 text-[15px]", className)}>
      {children}
    </Comp>
  );
}

