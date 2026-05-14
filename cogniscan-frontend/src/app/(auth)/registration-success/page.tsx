import { Mail } from "lucide-react";

export default function RegistrationSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#969792] px-5 py-10">
      <section className="w-full max-w-[470px] rounded-[18px] bg-surface px-8 py-10 text-center shadow-[0_28px_70px_-35px_rgba(27,28,26,0.65)] sm:px-11">
        <h1 className="text-xl font-extrabold text-[#a98ad6]">Pendaftaran Berhasil Dikirim!</h1>
        <p className="mt-3 font-bold text-on-surface">Akun kamu sedang dalam proses verifikasi.</p>
        <div className="my-5 border-t border-dashed border-outline-variant" />
        <div className="border-l-4 border-primary-container bg-[#e9ebe5] px-4 py-4 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary-container">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Informasi Password
          </p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Password akun kamu akan dikirimkan ke email yang telah di daftarkan
          </p>
          <p className="mt-2 text-xs italic text-on-surface-muted">
            Pastikan kamu memeriksa email mu
          </p>
        </div>
      </section>
    </main>
  );
}

