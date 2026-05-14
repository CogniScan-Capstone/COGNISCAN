import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral" | "purple";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
};

const toneClass: Record<StatusTone, string> = {
  success: "border-[#c2d8c6] bg-[#e5efe5] text-primary",
  warning: "border-[#f0d36d] bg-[#fff2bf] text-[#d37300]",
  danger: "border-[#efb6b6] bg-[#ffe1e1] text-[#d13a31]",
  info: "border-[#c7d5ec] bg-[#e8effb] text-[#47658f]",
  neutral: "border-surface-variant bg-surface-container text-on-surface-variant",
  purple: "border-secondary-container bg-secondary-container text-[#6f5794]",
};

export function StatusBadge({ children, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-full border px-3 text-xs font-semibold leading-none",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

