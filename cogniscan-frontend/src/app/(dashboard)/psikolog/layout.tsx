"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import LoadingPage from "@/components/loading/page";
import { dashboardPathForRole, fetchCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

export default function PsikologDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyPsikologAccess() {
      setIsAllowed(false);

      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        router.replace("/sign-in");
        return;
      }

      try {
        const user = await fetchCurrentUser(accessToken);
        if (user.peran !== "psikolog") {
          router.replace(dashboardPathForRole(user.peran));
          return;
        }

        const mustChangePassword = !user.apakah_sudah_ganti_password;
        const isChangePasswordPage = pathname === "/psikolog/ganti-password";

        if (mustChangePassword && !isChangePasswordPage) {
          router.replace("/psikolog/ganti-password");
          return;
        }

        if (!mustChangePassword && isChangePasswordPage) {
          router.replace("/psikolog/dashboard");
          return;
        }

        if (isMounted) setIsAllowed(true);
      } catch {
        await supabase.auth.signOut();
        router.replace("/sign-in");
      }
    }

    verifyPsikologAccess();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (!isAllowed) {
    return <LoadingPage text="" />;
  }

  return children;
}
