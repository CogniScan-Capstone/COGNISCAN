import Link from "next/link";
import type { ReactNode } from "react";
import { Brain, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  active?: boolean;
};

export type DashboardUser = {
  name: string;
  role: string;
  avatar?: ReactNode;
};

export type DashboardSidebarProps = {
  navItems: DashboardNavItem[];
  user: DashboardUser;
  logoutHref?: string;
  profileHref?: string;
};

export function DashboardSidebar({
  navItems,
  user,
  logoutHref = "/sign-in",
  profileHref,
}: DashboardSidebarProps) {
  const profileContent = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed-dim text-sm font-bold text-primary">
        {user.avatar ?? initials(user.name)}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[15px] font-medium leading-5 text-on-surface">{user.name}</p>
        <p className="truncate text-[13px] leading-5 text-on-surface-variant">{user.role}</p>
      </div>
    </>
  );

  return (
    <aside className="sticky top-0 hidden h-screen border-r border-outline-variant/70 bg-white px-6 py-10 lg:flex lg:flex-col">
      <Link href="/" className="mb-14 inline-flex items-center gap-1" aria-label="CogniScan beranda">
        <span className="text-[38px] font-extrabold tracking-[-0.06em] text-[#343a40]">
          Cogni<span className="font-serif italic font-medium text-primary-container">Scan</span>
        </span>
        <Brain className="h-16 w-16 stroke-[1.1] text-primary-fixed-dim" aria-hidden="true" />
      </Link>

      <nav className="flex flex-col gap-3" aria-label="Navigasi dashboard">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex h-12 items-center gap-3 rounded-full px-4 text-[16px] font-medium transition-colors",
              "text-on-surface-variant hover:bg-primary-container/10 hover:text-primary",
              item.active && "bg-primary text-white hover:bg-primary hover:text-white",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center [&_svg]:h-5 [&_svg]:w-5">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-outline-variant pt-7">
        <div className="flex items-center gap-3">
          {profileHref ? (
            <Link
              href={profileHref}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-opacity hover:opacity-80"
            >
              {profileContent}
            </Link>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-3">{profileContent}</div>
          )}
          <Link
            href={logoutHref}
            aria-label="Keluar"
            className="rounded-md p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
