"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { dashboardPathForRole, fetchCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const verifiedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyAdminAccess() {
      if (verifiedRef.current) {
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
        if (user.peran !== "admin") {
          router.replace(dashboardPathForRole(user.peran));
          return;
        }

        verifiedRef.current = true;
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
    return null;
  }

  return children;
}
