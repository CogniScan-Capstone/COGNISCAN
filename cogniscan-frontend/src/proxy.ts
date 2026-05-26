import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type BackendUser = {
  id: string;
  email: string;
  peran?: "admin" | "pasien" | "psikolog" | string | null;
  apakah_aktif?: boolean | null;
  nama_lengkap?: string | null;
  status_akun?: string | null;
  apakah_sudah_ganti_password?: boolean | null;
  profile_lengkap?: boolean | null;
};

type CachedBackendUser = Pick<
  BackendUser,
  | "id"
  | "peran"
  | "apakah_aktif"
  | "status_akun"
  | "apakah_sudah_ganti_password"
  | "profile_lengkap"
> & {
  cached_at: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const AUTH_ROUTES = new Set([
  "/sign-in",
  "/sign-up",
  "/sign-up-psikolog",
  "/registration-success",
  "/reset-password",
]);
const BACKEND_USER_CACHE_COOKIE = "cogniscan_backend_user";
const BACKEND_USER_CACHE_MAX_AGE_SECONDS = 60;

function roleForPath(pathname: string) {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/psikolog")) return "psikolog";
  if (pathname.startsWith("/pasien")) return "pasien";
  return null;
}

function dashboardPathForRole(role: BackendUser["peran"]) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "psikolog") return "/psikolog/dashboard";
  return "/pasien/dashboard";
}

function entryPathForUser(
  user: Pick<BackendUser, "peran" | "apakah_sudah_ganti_password" | "profile_lengkap">,
) {
  if (user.peran === "psikolog" && !user.apakah_sudah_ganti_password) {
    return "/reset-password";
  }

  if (user.peran === "pasien" && user.profile_lengkap === false) {
    return "/pasien/profile";
  }

  return dashboardPathForRole(user.peran);
}

function redirectTo(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return NextResponse.redirect(url);
}

function readCachedBackendUser(request: NextRequest, userId?: string) {
  const raw = request.cookies.get(BACKEND_USER_CACHE_COOKIE)?.value;
  if (!raw) return null;

  try {
    const cached = JSON.parse(atob(raw)) as CachedBackendUser;
    const isExpired =
      Date.now() - cached.cached_at > BACKEND_USER_CACHE_MAX_AGE_SECONDS * 1000;
    if (isExpired || (userId && cached.id !== userId)) return null;
    if (cached.peran === "psikolog" && !cached.apakah_sudah_ganti_password) {
      return null;
    }
    if (cached.peran === "pasien" && cached.profile_lengkap === false) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function writeBackendUserCache(response: NextResponse, user: BackendUser) {
  if (user.peran === "psikolog" && !user.apakah_sudah_ganti_password) return;
  if (user.peran === "pasien" && user.profile_lengkap === false) return;

  const cachePayload: CachedBackendUser = {
    id: user.id,
    peran: user.peran,
    apakah_aktif: user.apakah_aktif,
    status_akun: user.status_akun,
    apakah_sudah_ganti_password: user.apakah_sudah_ganti_password,
    profile_lengkap: user.profile_lengkap,
    cached_at: Date.now(),
  };

  response.cookies.set(
    BACKEND_USER_CACHE_COOKIE,
    btoa(JSON.stringify(cachePayload)),
    {
      httpOnly: true,
      maxAge: BACKEND_USER_CACHE_MAX_AGE_SECONDS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  );
}

function clearBackendUserCache(response: NextResponse) {
  response.cookies.set(BACKEND_USER_CACHE_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

async function fetchBackendUser(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as BackendUser;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const { pathname } = request.nextUrl;
  const requiredRole = roleForPath(pathname);
  const isAuthRoute = AUTH_ROUTES.has(pathname);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (requiredRole) return redirectTo(request, "/sign-in");
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    if (requiredRole) return redirectTo(request, "/sign-in");
    return response;
  }

  let backendUser: BackendUser | CachedBackendUser | null = readCachedBackendUser(
    request,
    session.user.id,
  );
  if (!backendUser) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      clearBackendUserCache(response);
      if (requiredRole) return redirectTo(request, "/sign-in");
      return response;
    }

    backendUser = await fetchBackendUser(session.access_token);
    if (backendUser) writeBackendUserCache(response, backendUser);
  }

  if (!backendUser) {
    clearBackendUserCache(response);
    if (requiredRole) return redirectTo(request, "/sign-in");
    return response;
  }

  if (isAuthRoute && pathname !== "/reset-password") {
    return redirectTo(request, entryPathForUser(backendUser));
  }

  if (!requiredRole) return response;

  if (backendUser.peran !== requiredRole) {
    return redirectTo(request, entryPathForUser(backendUser));
  }

  if (backendUser.peran === "psikolog" && !backendUser.apakah_sudah_ganti_password) {
    return redirectTo(request, "/reset-password");
  }

  if (
    backendUser.peran === "pasien" &&
    backendUser.profile_lengkap === false &&
    pathname !== "/pasien/profile"
  ) {
    return redirectTo(request, "/pasien/profile");
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/psikolog/:path*",
    "/pasien/:path*",
    "/sign-in",
    "/sign-up",
    "/sign-up-psikolog",
    "/registration-success",
    "/reset-password",
  ],
};
