"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { dashboardPathForRole, fetchCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

export default function PsikologDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const verifiedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyPsikologAccess() {
      // Skip re-verification if already verified — allows instant tab switching
      if (verifiedRef.current) {
        if (pathname === "/psikolog/ganti-password") {
          router.replace("/psikolog/dashboard");
          return;
        }
        if (isMounted) setIsAllowed(true);
        return;
      }

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

        if (mustChangePassword) {
          router.replace("/reset-password");
          return;
        }

        if (!mustChangePassword && isChangePasswordPage) {
          router.replace("/psikolog/dashboard");
          return;
        }

        verifiedRef.current = true;
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
    // Render nothing instead of a heavy LoadingPage overlay — pages have
    // their own lightweight loading states so the user sees content faster.
    return null;
  }

  return children;
}
