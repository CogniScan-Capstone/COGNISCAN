"use client";

import { useRouter } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import {
  changeTemporaryPassword,
  dashboardPathForRole,
  fetchCurrentUser,
  type BackendUser,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  async function handleSubmitPassword(password: string) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      throw new Error(
        "Sesi reset password tidak ditemukan. Silakan masuk ulang atau buka ulang tautan reset password.",
      );
    }

    let currentUser: BackendUser | null = null;
    try {
      currentUser = await fetchCurrentUser(accessToken);
    } catch {
      currentUser = null;
    }

    if (
      currentUser?.peran === "psikolog" &&
      !currentUser.apakah_sudah_ganti_password
    ) {
      await changeTemporaryPassword(accessToken, password);
      router.replace("/psikolog/dashboard");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new Error(error.message);
    }

    router.replace(
      currentUser ? dashboardPathForRole(currentUser.peran) : "/sign-in",
    );
    router.refresh();
  }

  return <ResetPasswordForm onSubmitPassword={handleSubmitPassword} />;
}
