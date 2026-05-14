import { CheckCircle2, Eye, LockKeyhole } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PrimaryAuthButton } from "@/components/auth/fields";

const checks = ["Minimal 8 Karakter", "Huruf Kapital (A-Z)", "Angka (0-9)", "Simbol (@, #, $)"];

export default function ResetPasswordPage() {
  return (
    <AuthShell compact className="max-w-[450px]">
      <form className="px-8 pb-9 pt-7 sm:px-8">
        <h1 className="mb-8 text-center text-2xl font-extrabold tracking-[-0.01em] text-[#8d5367]">
          Buat Password Baru
        </h1>
        <label className="relative block">
          <span className="sr-only">Password baru</span>
          <LockKeyhole
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary"
            aria-hidden="true"
          />
          <input
            type="password"
            placeholder="Masukkan password baru"
            className="h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-12 text-[15px] text-on-surface outline-none transition focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
          />
          <Eye
            className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4f584d]"
            aria-hidden="true"
          />
        </label>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-1.5 rounded-full bg-primary" />
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {checks.map((check) => (
            <p key={check} className="flex items-center gap-2 text-xs text-on-surface-variant">
              <CheckCircle2 className="h-4 w-4 fill-primary text-white" aria-hidden="true" />
              {check}
            </p>
          ))}
        </div>

        <PrimaryAuthButton className="mt-8 text-base">Simpan Password Baru</PrimaryAuthButton>
        <p className="mx-auto mt-5 max-w-[310px] text-center text-xs leading-5 text-on-surface-variant">
          Kamu akan otomatis diarahkan ke dashboard setelah password berhasil disimpan.
        </p>
      </form>
    </AuthShell>
  );
}
