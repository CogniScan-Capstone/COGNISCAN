"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { dashboardPathForRole, fetchCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyAdminAccess() {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        router.replace("/sign-in");
        return;
      }

      try {
        const user = await fetchCurrentUser(accessToken);
        if (user.peran !== "admin") {
          router.replace(dashboardPathForRole(user.peran));
          return;
        }

        if (isMounted) setIsAllowed(true);
      } catch {
        await supabase.auth.signOut();
        router.replace("/sign-in");
      }
    }

    verifyAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-sm text-on-surface-variant">Memeriksa akses admin...</p>
      </main>
    );
  }

  return children;
}
