import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
};

export function DashboardCard({ children, className, as: Comp = "div" }: DashboardCardProps) {
  return (
    <Comp
      className={cn(
        "rounded-[18px] bg-white shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)]",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

