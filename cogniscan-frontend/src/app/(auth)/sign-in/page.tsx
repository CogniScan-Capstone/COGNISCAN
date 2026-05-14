import Link from "next/link";
import { AuthLogo, AuthShell } from "@/components/auth/AuthShell";
import { Field, PrimaryAuthButton } from "@/components/auth/fields";

export default function SignInPage() {
  return (
    <AuthShell compact className="max-w-[448px]">
      <form className="px-12 pb-16 pt-14 sm:px-12">
        <div className="mb-10 text-center">
          <AuthLogo />
          <h1 className="mt-9 text-2xl font-bold tracking-[-0.01em] text-[#a98ad6]">
            Welcome Back
          </h1>
          <p className="mt-2 text-[15px] text-on-surface-variant">
            Sign in to continue your mental wellness journey.
          </p>
        </div>

        <div className="space-y-6">
          <Field label="Email Address" placeholder="name@example.com" type="email" />
          <Field label="Password" placeholder="........" type="password" showEye />
        </div>

        <PrimaryAuthButton className="mt-6">Sign In</PrimaryAuthButton>

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

