"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Calendar } from "lucide-react";
import { AuthLogo, AuthShell } from "@/components/auth/AuthShell";
import { PhoneField, PrimaryAuthButton, TextAreaField } from "@/components/auth/fields";

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateOfBirth(e.target.value);
    setShowDatePicker(false);
  };

  return (
    <AuthShell className="max-w-[800px]">
      <form className="px-8 pb-16 pt-20 sm:px-16 md:px-20">
        <div className="mb-12 text-center">
          <AuthLogo />
          <h1 className="mt-7 text-2xl font-bold tracking-[-0.01em] text-[#a98ad6]">
            Create Your Account
          </h1>
          <p className="mt-2 text-[15px] text-on-surface-variant">
            Start your mental wellness journey with CogniScan.
          </p>
        </div>

        <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
                Full Name
              </span>
              <input
                className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                placeholder="John Doe"
                type="text"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
                Email Address
              </span>
              <input
                className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                placeholder="john@example.com"
                type="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
                Password
              </span>
              <span className="relative block">
                <input
                  className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 pr-12 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                  placeholder="........"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4f584d] hover:text-[#343832] transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </span>
              <p className="mt-2 text-[13px] text-[#737c8f]">Must be at least 8 characters long.</p>
            </label>

            <label className="block">
              <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
                Date of Birth
              </span>
              <span className="relative block">
                <input
                  className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 pr-3 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                  type="date"
                  value={dateOfBirth}
                  onChange={handleDateChange}
                  onFocus={() => setShowDatePicker(true)}
                />
              </span>
            </label>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
                Confirm Password
              </span>
              <span className="relative block">
                <input
                  className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 pr-12 text[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
                  placeholder="........"
                  type={showConfirmPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4f584d] hover:text-[#343832] transition"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>

            <fieldset>
              <legend className="mb-4 text-[15px] font-semibold leading-none text-[#343832]">
                Gender
              </legend>
              <div className="flex h-12 items-center gap-8">
                <label className="inline-flex items-center gap-3 text-[15px] text-on-surface">
                  <input
                    type="radio"
                    name="gender"
                    className="h-5 w-5 appearance-none rounded-full border border-[#c9cec4] bg-white checked:border-[6px] checked:border-primary-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/20"
                  />
                  Male
                </label>
                <label className="inline-flex items-center gap-3 text-[15px] text-on-surface">
                  <input
                    type="radio"
                    name="gender"
                    className="h-5 w-5 appearance-none rounded-full border border-[#c9cec4] bg-white checked:border-[6px] checked:border-primary-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/20"
                  />
                  Female
                </label>
              </div>
            </fieldset>

            <PhoneField />
            <TextAreaField label="Full Address" placeholder="Street name, Building, City..." />
          </div>
        </div>

        <PrimaryAuthButton className="mt-12">Create Account</PrimaryAuthButton>

        <p className="mt-12 text-center text-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-primary-container hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}