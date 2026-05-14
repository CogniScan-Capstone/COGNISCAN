import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DashboardCard } from "@/components/dashboard";
import { cn } from "@/lib/utils";

type ScreeningTopicCardProps = {
  title: string;
  description: string;
  icon: string;
  href: string;
  className?: string;
};

export function ScreeningTopicCard({
  title,
  description,
  icon,
  href,
  className,
}: ScreeningTopicCardProps) {
  return (
    <DashboardCard
      as="article"
      className={cn(
        "flex min-h-[280px] flex-col items-center justify-center px-7 py-8 text-center",
        className,
      )}
    >
      <div className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-secondary-container/50 text-3xl">
        <span aria-hidden="true">{icon}</span>
      </div>
      <h3 className="text-[17px] font-semibold leading-6 text-on-surface">{title}</h3>
      <p className="mt-3 max-w-[230px] text-[15px] leading-6 text-on-surface-variant">
        {description}
      </p>
      <Link
        href={href}
        className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-4 py-2 text-[14px] font-semibold text-on-secondary-container transition-colors hover:bg-secondary-container/80"
      >
        Mulai Screening
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </DashboardCard>
  );
}

