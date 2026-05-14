import Link from "next/link";
import { ArrowRight, HeartHandshake } from "lucide-react";

const psychologists = [
  {
    name: "Dr. Anisa Rahma, M.Psi",
    field: "Psikolog Klinis",
    price: "Rp. 350.000 / Konsultasi",
    selected: true,
  },
  {
    name: "Dr. Budi Santoso, M.Psi",
    field: "Psikolog Pendidikan",
    price: "Rp. 500.000 / Konsultasi",
    selected: false,
  },
];

export default function ScreeningCompletePage() {
  return (
    <main className="min-h-screen bg-surface px-5 py-12 text-on-surface">
      <section className="mx-auto max-w-[580px] rounded-[24px] bg-white px-8 py-12 shadow-[0_24px_45px_-32px_rgba(27,28,26,0.36)] sm:px-10">
        <div className="text-center">
          <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-secondary-container text-[#a98ad6]">
            <HeartHandshake className="h-16 w-16" aria-hidden="true" />
          </div>
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em] text-[#a98ad6]">
            Terima Kasih!
          </h1>
          <p className="mt-3 text-[16px] font-semibold text-on-surface">
            Kamu sudah menyelesaikan semua pertanyaan screening.
          </p>
          <p className="mx-auto mt-2 max-w-[460px] text-[15px] leading-6 text-on-surface-muted">
            Silahkan pilih psikolog dan tunggu respon dari mereka. Hasil dan feedback akan
            segera dikirimkan untukmu.
          </p>
        </div>

        <div className="my-9 border-t border-outline-variant" />

        <h2 className="mb-6 text-[18px] font-extrabold text-[#a98ad6]">Pilih Psikolog Kamu</h2>
        <div className="space-y-4">
          {psychologists.map((psy) => (
            <article
              key={psy.name}
              className={`rounded-[18px] border px-6 py-6 ${
                psy.selected ? "border-primary" : "border-outline-variant"
              }`}
            >
              <h3 className="text-[18px] font-medium text-on-surface">{psy.name}</h3>
              <p className="mt-1 text-[14px] text-on-surface-muted">{psy.field}</p>
              <p className="mt-1 text-[15px] font-medium text-on-surface-muted">{psy.price}</p>
              <button
                type="button"
                className={`mt-5 h-10 rounded-full px-7 text-[14px] font-semibold transition ${
                  psy.selected
                    ? "bg-primary text-white"
                    : "border border-primary text-primary hover:bg-primary-container/10"
                }`}
              >
                {psy.selected ? "Dipilih" : "Pilih"}
              </button>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-[10px] border-l-4 border-[#a98ad6] bg-secondary-container/45 px-5 py-4 text-[15px] leading-6 text-on-surface-variant">
          Jawabanmu bersifat rahasia dan hanya dapat diakses oleh psikolog yang kamu pilih.
        </div>

        <Link
          href="/pasien/konsultasi"
          className="mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-primary-container px-8 text-[18px] font-medium text-white shadow-[0_18px_28px_-20px_rgba(65,87,62,0.75)] transition hover:-translate-y-0.5 hover:bg-[#789477]"
        >
          Submit
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}

