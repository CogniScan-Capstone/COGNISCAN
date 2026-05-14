"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye } from "lucide-react";
import { AuthLogo, AuthShell } from "@/components/auth/AuthShell";
import { PrimaryAuthButton } from "@/components/auth/fields";
import { dashboardPathForRole, fetchCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session?.access_token) {
        throw new Error("Email atau password tidak valid");
      }

      const user = await fetchCurrentUser(data.session.access_token);
      router.replace(dashboardPathForRole(user.peran));
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal masuk ke akun");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell compact className="max-w-[448px]">
      <form className="px-12 pb-16 pt-14 sm:px-12" onSubmit={handleSubmit}>
        <div className="mb-10 text-center">
          <AuthLogo />
          <h1 className="mt-9 text-2xl font-bold text-[#a98ad6]">Welcome Back</h1>
          <p className="mt-2 text-[15px] text-on-surface-variant">
            Sign in to continue your mental wellness journey.
          </p>
        </div>

        <div className="space-y-6">
          <label className="block">
            <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
              Email Address
            </span>
            <input
              autoComplete="email"
              className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
              Password
            </span>
            <span className="relative block">
              <input
                autoComplete="current-password"
                className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 pr-12 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="........"
                required
                type="password"
                value={password}
              />
              <Eye
                className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4f584d]"
                aria-hidden="true"
              />
            </span>
          </label>
        </div>

        {errorMessage ? (
          <p className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <PrimaryAuthButton className="mt-6" disabled={isSubmitting}>
          {isSubmitting ? "Signing In..." : "Sign In"}
        </PrimaryAuthButton>

        <p className="mt-10 text-center text-sm text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-semibold text-primary-container hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
