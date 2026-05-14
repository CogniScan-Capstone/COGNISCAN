import type { ReactNode } from "react";
import { DashboardCard } from "./DashboardCard";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  iconTone?: "green" | "purple" | "yellow" | "neutral";
  helper?: string;
  className?: string;
};

const iconToneClass = {
  green: "bg-[#c8edc7] text-primary",
  purple: "bg-secondary-container text-[#765a9c]",
  yellow: "bg-tertiary-container text-[#d37300]",
  neutral: "bg-surface-container text-on-surface-variant",
};

export function MetricCard({
  label,
  value,
  icon,
  iconTone = "green",
  helper,
  className,
}: MetricCardProps) {
  return (
    <DashboardCard
      className={cn(
        "flex min-h-[100px] items-center justify-between gap-5 px-6 py-5",
        className,
      )}
    >
      <div>
        <p className="text-[16px] font-medium leading-6 text-on-surface-variant">{label}</p>
        <div className="mt-1 text-[34px] font-extrabold leading-none tracking-[-0.03em] text-on-surface">
          {value}
        </div>
        {helper ? <p className="mt-2 text-sm text-on-surface-muted">{helper}</p> : null}
      </div>
      {icon ? (
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] [&_svg]:h-6 [&_svg]:w-6",
            iconToneClass[iconTone],
          )}
        >
          {icon}
        </div>
      ) : null}
    </DashboardCard>
  );
}

