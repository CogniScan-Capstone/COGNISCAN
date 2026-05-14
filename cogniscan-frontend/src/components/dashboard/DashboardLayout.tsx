import type { ReactNode } from "react";
import { DashboardSidebar, type DashboardSidebarProps } from "./DashboardSidebar";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = DashboardSidebarProps & {
  children: ReactNode;
  title?: string;
  description?: string;
  headerAction?: ReactNode;
  contentClassName?: string;
};

export function DashboardLayout({
  children,
  title,
  description,
  headerAction,
  contentClassName,
  ...sidebarProps
}: DashboardLayoutProps) {
  return (
    <main className="min-h-screen bg-surface-low text-on-surface">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardSidebar {...sidebarProps} />

        <section className={cn("min-w-0 px-6 py-6 md:px-10", contentClassName)}>
          {(title || description || headerAction) && (
            <header className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                {title ? (
                  <h1 className="text-[22px] font-extrabold uppercase leading-tight tracking-[-0.01em] text-on-surface">
                    {title}
                  </h1>
                ) : null}
                {description ? (
                  <p className="mt-1 text-[15px] leading-6 text-on-surface-variant">
                    {description}
                  </p>
                ) : null}
              </div>
              {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
            </header>
          )}

          {children}
        </section>
      </div>
    </main>
  );
}

