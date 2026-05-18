import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

export function AuthShell({ children, className, compact = false }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-surface px-5 py-10 text-on-surface md:px-8">
      <div
        className={cn(
          "mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center",
          compact ? "max-w-[560px]" : "max-w-[1020px]",
        )}
      >
        <section
          className={cn(
            "w-full rounded-[12px] border border-outline-variant/40 bg-white shadow-[0_28px_70px_-38px_rgba(27,28,26,0.38)]",
            "before:block before:h-1 before:w-full before:rounded-t-[12px] before:bg-[#a98ad6]",
            className,
          )}
        >
          {children}
        </section>
      </div>
    </main>
  );
}

export function AuthLogo() {
  return (
    <Link
      href="/"
      className="mx-auto inline-flex items-center gap-1 text-[22px] font-extrabold tracking-[-0.04em] text-[#343a40]"
      aria-label="CogniScan beranda"
    >
      <Image
        src="/logo.png"
        alt="CogniScan Logo"
        width={120}
        height={80}
        priority
        className="h-auto w-auto"
      />
    </Link>
  );
}
