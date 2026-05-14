import Link from "next/link";
import { AuthLogo, AuthShell } from "@/components/auth/AuthShell";
import { Field, PhoneField, PrimaryAuthButton, TextAreaField } from "@/components/auth/fields";

export default function SignUpPage() {
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
            <Field label="Full Name" placeholder="John Doe" />
            <Field label="Email Address" placeholder="john@example.com" type="email" />
            <Field
              label="Password"
              placeholder="........"
              type="password"
              helper="Must be at least 8 characters long."
              showEye
            />
            <Field label="Date of Birth" placeholder="mm/dd/yyyy" />
          </div>

          <div className="space-y-5">
            <Field label="Confirm Password" placeholder="........" type="password" showEye />
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

