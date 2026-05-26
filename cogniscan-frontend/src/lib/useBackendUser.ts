"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser, type BackendUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

function getMetadataName(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.nama_lengkap;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// Simple in-memory cache shared across hook instances within a session.
// Avoids redundant /api/auth/me calls when multiple components or pages
// mount the hook during the same browser session.
let cachedUser: BackendUser | null = null;
let cachedSessionUserId: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

export function clearBackendUserCache() {
  cachedUser = null;
  cachedSessionUserId = null;
  cacheTimestamp = 0;
}

export function useBackendUser() {
  const [user, setUser] = useState<BackendUser | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      const sessionUser = data.session?.user;
      if (!accessToken || !sessionUser) {
        clearBackendUserCache();
        if (mounted) setUser(null);
        return;
      }

      if (
        cachedUser &&
        cachedSessionUserId === sessionUser.id &&
        Date.now() - cacheTimestamp < CACHE_TTL_MS
      ) {
        if (mounted) setUser(cachedUser);
        return;
      }

      if (cachedSessionUserId && cachedSessionUserId !== sessionUser.id) {
        clearBackendUserCache();
      }

      // Show Supabase metadata immediately for fast first-paint.
      const metadataName = getMetadataName(sessionUser?.user_metadata);
      if (mounted && sessionUser) {
        const quickUser: BackendUser = {
          id: sessionUser.id,
          email: sessionUser.email ?? "",
          peran:
            typeof sessionUser.user_metadata?.peran === "string"
              ? sessionUser.user_metadata.peran
              : undefined,
          nama_lengkap: metadataName,
        };
        setUser(quickUser);
      }

      try {
        const currentUser = await fetchCurrentUser(accessToken);
        const fullUser: BackendUser = {
          ...currentUser,
          nama_lengkap: currentUser.nama_lengkap?.trim() || metadataName,
        };
        cachedUser = fullUser;
        cachedSessionUserId = sessionUser.id;
        cacheTimestamp = Date.now();
        if (mounted) setUser(fullUser);
      } catch {
        if (mounted && !sessionUser) setUser(null);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user || session.user.id !== cachedSessionUserId) {
        clearBackendUserCache();
        if (mounted) setUser(null);
      }
      void loadUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return user;
}
