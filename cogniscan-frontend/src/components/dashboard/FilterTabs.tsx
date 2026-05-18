import Link from "next/link";
import { cn } from "@/lib/utils";

type FilterTab = {
  label: string;
  href?: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
};

type FilterTabsProps = {
  tabs: FilterTab[];
  className?: string;
};

export function FilterTabs({ tabs, className }: FilterTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)} role="tablist">
      {tabs.map((tab) => {
        const content = (
          <>
            {tab.label}
            {typeof tab.count === "number" ? <span>({tab.count})</span> : null}
          </>
        );
        const classes = cn(
          "inline-flex min-h-12 items-center justify-center gap-1 rounded-full px-7 text-[15px] font-semibold transition-colors",
          tab.active
            ? "bg-primary text-white"
            : "bg-surface-container text-on-surface-variant hover:bg-primary-container/15 hover:text-primary",
        );

        return tab.href ? (
          <Link key={tab.label} href={tab.href} className={classes} aria-current={tab.active ? "page" : undefined}>
            {content}
          </Link>
        ) : (
          <button key={tab.label} type="button" className={classes} aria-pressed={tab.active} onClick={tab.onClick}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
