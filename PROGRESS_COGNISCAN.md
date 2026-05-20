# Progress CogniScan

Tanggal update: 2026-05-20 (Session 3)

Dokumen ini menyimpan konteks kerja terbaru untuk sesi berikutnya. Fokus utama saat ini adalah stabilisasi Phase 6B end-to-end, lalu masuk Phase 7 (Jadwal, Booking, Konsultasi).

## Ringkasan Status

Aplikasi sudah melewati Phase 6B (Feedback Psikolog) dan sebagian besar fitur dashboard/feedback sudah dinamis dan terhubung backend. Status aplikasi siap masuk Phase 7.

Fitur yang baru diselesaikan (2026-05-20):
- **Dashboard Psikolog** sudah memakai data dinamis dari backend (`GET /api/dashboard/psikolog/summary`).
- **Feedback Psikolog** sudah terhubung ke backend: psikolog bisa melihat daftar pra-asesmen, melihat detail hasil AI, membuka/menutup sesi dialog, dan mengirim feedback profesional.
- **Pesan Pasien** dan **Dashboard Pasien** sudah memakai data dinamis, termasuk status screening terakhir dan tab pesan `Menunggu Review` / `Selesai Review`.
- **Halaman selesai screening pasien** tidak lagi menampilkan ringkasan AI, skor, rekomendasi AI, atau distorsi terdeteksi di sisi pasien; UI fokus ke ucapan terima kasih, kerahasiaan jawaban, dan pilih psikolog.
- **Assignment psikolog** dari halaman selesai screening sudah tersambung ke `PATCH /api/pre-assessment/reports/{id_pra_asesmen}/assign-psikolog`.
- **Analyzer model/prompt update**: default model diarahkan ke `gemini-3-flash-preview`, prompt v2 ditambah pedoman rekomendasi psikoedukasi yang konkret, bukan ringkasan ulang.
- **Local API reliability**: frontend default API memakai `http://127.0.0.1:8000`, ada fallback `localhost` <-> `127.0.0.1`, dan CORS development backend diperlonggar untuk origin lokal.
- **Fix `MissingGreenlet`**: list pesan pasien sekarang eager-load `sesi_jurnal.pasien` dan `sesi_jurnal.jawaban` agar `nama_pasien` dan `dialog_jurnal` tidak memicu lazy-load saat response serialization.
- **Caching frontend (stale-while-revalidate)**: Navigasi antar halaman sekarang instan karena data di-cache di memory dan refresh di background.
- **Pre-hydration loader**: Hard reload menampilkan loading icon CogniScan custom (maskot + orbit ring) langsung sebelum React hydrate.
- **Sticky feedback form**: Kolom feedback psikolog sekarang sticky saat scroll analisis AI yang panjang.
- **Tombol "Tulis Respon" dihapus dari dashboard psikolog** — proses tulis respon hanya dari tab Feedback.
- **Backend `.env` fix**: Whitespace di variabel environment yang menyebabkan error konfigurasi sudah diperbaiki.

## Backend

### Phase 1-3: Foundation, Model, Migration

Status: selesai secara fungsional.

Yang sudah ada:
- FastAPI app di `cogniscan-backend/api/main.py`.
- Konfigurasi app/database/security/logging di `api/core`.
- SQLAlchemy model untuk tabel utama di `api/models`.
- Alembic baseline existing schema sudah tercatat menurut catatan `cogniscan-backend/skills/SKILL.md`.
- Supabase dipakai sebagai PostgreSQL dan Supabase Auth.

Catatan:
- Runtime backend memakai `DATABASE_URL`.
- Alembic/migration memakai `DATABASE_URL_SYNC`.

### Phase 4: Auth, Role, Profil

Status: sebagian besar selesai.

Yang sudah ada:
- Backend verify JWT Supabase.
- `GET /api/auth/me`.
- Profil pasien:
  - `POST /api/auth/profile/pasien`
  - `GET /api/auth/profile/pasien`
  - `PATCH /api/auth/profile/pasien`
- Registrasi calon psikolog:
  - `POST /api/auth/register/psikolog`
- Update profil psikolog:
  - `PATCH /api/auth/profile/psikolog`
- Ganti temporary password psikolog:
  - `POST /api/auth/change-temporary-password`
- Role guard pasien/admin/psikolog tersedia di `api/dependencies/auth.py`.

Belum ideal:
- Test otomatis auth/admin belum lengkap.
- Guard frontend masih client-side di beberapa area; backend tetap sumber keamanan final.

### Phase 4B: Admin Verifikasi Psikolog

Status: selesai untuk MVP.

Yang sudah ada:
- `GET /api/admin/psikolog`
- `GET /api/admin/psikolog/{id_psikolog}`
- `POST /api/admin/psikolog/{id_psikolog}/approve`
- `POST /api/admin/psikolog/{id_psikolog}/reject`
- `POST /api/admin/psikolog/{id_psikolog}/reset-temporary-password`
- Approval membuat/menyambungkan Supabase Auth user dan mengirim temporary password via email.

Belum ideal:
- Supabase Storage untuk dokumen STR/SIP masih placeholder nama file.
- Audit log formal belum lengkap.

### Phase 5: Analyzer Integration

Status: tersedia dan sudah memakai konfigurasi terbaru.

Yang sudah ada:
- `api/services/analyzer_service.py` membungkus `analyzer.main.analyze_narrative`.
- Data masking dasar sebelum narasi dikirim ke LLM:
  - email
  - URL
  - nomor HP Indonesia
  - NIK 16 digit
- Output analyzer dinormalisasi ke struktur backend:
  - `ringkasan_kondisi`
  - `indikator_urgensi`
  - `skor_keparahan`
  - `rekomendasi`
  - flag crisis/self-harm
  - daftar distorsi
- Hasil analyzer disimpan ke `pra_asesmen` dan `distorsi_terdeteksi`.

Catatan:
- `analyzer/main.py` sekarang memakai default `DEFAULT_MODEL_NAME = "gemini-3-flash-preview"` dan tetap bisa dioverride lewat `.env` `GEMINI_MODEL`.
- `.env.example` backend juga diarahkan ke `GEMINI_MODEL=gemini-3-flash-preview`.
- `prompts/system_prompt_v2.md` sudah ditambah pedoman `psychoeducation_message`: 2-3 rekomendasi psikoedukasi konkret, dipisah baris baru, tidak sekadar merangkum hasil AI.
- Jangan ubah folder `analyzer/` atau `prompts/` kecuali diminta eksplisit.

### Phase 6: Journal/Screening Pasien

Status: tersedia dan sudah terhubung frontend.

Endpoint:
- `POST /api/journal/sessions/start`
- `POST /api/journal/sessions/{id_sesi_jurnal}/answers`
- `GET /api/journal/sessions/{id_sesi_jurnal}`
- `POST /api/journal/sessions/{id_sesi_jurnal}/finalize`

Yang sudah ada:
- Start session mencatat consent di `log_persetujuan`.
- Submit answer melakukan upsert jawaban per nomor pertanyaan.
- Finalize memvalidasi jawaban lengkap, menjalankan analyzer, dan membuat pra-asesmen.
- Crisis case dikembalikan dengan kontak bantuan.

Fix terbaru:
- `start_journal_session()` sebelumnya return ORM `SesiJurnal` mentah dan memicu `MissingGreenlet` saat FastAPI membaca relationship `jawaban`.
- Sekarang `start_journal_session()` return `JournalSessionResponse` eksplisit dengan `jawaban=[]`.

Catatan UX:
- Saat ini frontend masih menyimpan jawaban per pertanyaan saat tombol `Selanjutnya`.
- Ini bisa terasa lambat karena tiap pertanyaan menunggu request backend.
- Rekomendasi berikutnya: simpan jawaban di frontend dulu, lalu kirim semua saat klik `Selesai`. Untuk keamanan draft, tambahkan localStorage per topik.

### Dashboard Pasien Backend

Status: selesai dan terhubung frontend.

Endpoint:
- `GET /api/dashboard/pasien/summary`

File:
- `cogniscan-backend/api/routers/dashboard.py`
- `cogniscan-backend/api/services/dashboard_service.py`
- `cogniscan-backend/api/schemas/dashboard.py`

Data:
- `pesan_baru`: jumlah pra-asesmen pasien yang sudah punya `feedback_psikolog`.
- `total_konsultasi`: jumlah row `pemesanan_konsultasi` milik pasien.
- `screening_terakhir`: status screening terakhir (`menunggu_pilih_psikolog`, `menunggu_review`, `sedang_direview`, `feedback_tersedia`, `perlu_eskalasi`) untuk ringkasan kecil di dashboard.

### Dashboard Psikolog Backend

Status: selesai dan terhubung frontend.

Endpoint:
- `GET /api/dashboard/psikolog/summary`

File:
- `cogniscan-backend/api/routers/dashboard.py`
- `cogniscan-backend/api/services/dashboard_service.py`
- `cogniscan-backend/api/schemas/dashboard.py`

Data:
- `feedback_belum_direspon`: jumlah pra-asesmen assigned yang belum ada feedback.
- `feedback_sudah_direspon`: jumlah pra-asesmen assigned yang sudah ada feedback atau status `selesai`.
- `total_laporan`: total pra-asesmen assigned ke psikolog.
- `laporan_terbaru`: 5 laporan terbaru dengan nama pasien, topik, tanggal, urgensi, dan status feedback.

### Phase 6B: Feedback Psikolog Backend

Status: selesai dan terhubung frontend.

Endpoint:
- `GET /api/pre-assessment/psikolog/reports` — list semua pra-asesmen yang di-assign ke psikolog.
- `GET /api/pre-assessment/psikolog/reports/{id_pra_asesmen}` — detail hasil AI lengkap + jawaban pasien.
- `PATCH /api/pre-assessment/psikolog/reports/{id_pra_asesmen}/feedback` — kirim feedback profesional.
- `GET /api/pre-assessment/reports` — list hasil pra-asesmen pasien untuk tab Pesan.
- `GET /api/pre-assessment/reports/{id_pra_asesmen}` — detail hasil pra-asesmen pasien.
- `PATCH /api/pre-assessment/reports/{id_pra_asesmen}/assign-psikolog` — simpan pilihan psikolog pasien.

Fitur:
- Psikolog melihat daftar laporan pasien yang perlu direview.
- Psikolog membuka detail laporan: melihat analisis AI, jawaban pasien, distorsi terdeteksi.
- Psikolog mengirim feedback profesional (akurasi, catatan, rekomendasi).
- Status validasi di-update ke `selesai` setelah feedback dikirim.
- Pasien bisa melihat feedback di halaman Pesan.

## Frontend

### Auth

Status: terhubung ke Supabase Auth + backend profile sync.

Yang sudah ada:
- Sign in memakai Supabase Auth lalu `GET /api/auth/me`.
- Sign up pasien membuat Supabase Auth user lalu sync profil ke backend.
- Sign up psikolog mengirim data ke backend candidate registration.
- Psikolog dengan temporary password diarahkan ke halaman ganti password.

Perubahan terbaru:
- Delay loading buatan 3 detik di flow auth sudah dihapus.
- Loading auth sekarang mengikuti durasi proses asli Supabase/backend.

### Dashboard Pasien

Status: data utama sudah dinamis.

Yang sudah ada:
- Halaman dashboard pasien membaca `GET /api/dashboard/pasien/summary`.
- Card `Pesan Baru` dan `Total Konsultasi` tidak lagi hardcoded.

Catatan:
- Pastikan backend sudah restart setelah route dashboard ditambahkan.

### Profile Pasien

Status: sudah memakai data backend dan loading dinamis.

Yang sudah ada:
- Fetch profile dari `GET /api/auth/profile/pasien`.
- Update profile dari `PATCH /api/auth/profile/pasien`.
- Teks `Memuat profil...` sudah diganti icon spinner.
- Loading berhenti setelah request selesai di `finally`.

### Screening Pasien

Status: berjalan, tetapi UX masih bisa ditingkatkan.

Yang sudah ada:
- Halaman screening membuat journal session, submit jawaban, finalize, lalu redirect ke halaman selesai.
- Saat proses submit, UI sekarang menampilkan:
  - spinner di tombol
  - status `Menyimpan jawaban...`
  - status `Menganalisis jawaban...` pada pertanyaan terakhir
  - textarea/navigasi dikunci sementara

Masalah UX tersisa:
- Menyimpan tiap pertanyaan membuat perpindahan terasa lambat.
- Rekomendasi: ubah flow agar tombol `Selanjutnya` hanya pindah lokal, lalu submit semua jawaban di akhir.

### Halaman Selesai Screening

Status: membaca backend untuk assignment, tetapi tidak menampilkan ringkasan AI ke pasien.

Yang sudah ada:
- Fetch report dari `GET /api/pre-assessment/reports/{id_pra_asesmen}`.
- Fetch psikolog tersedia dari `GET /api/pre-assessment/psikolog/available`.
- Simpan pilihan psikolog via `PATCH /api/pre-assessment/reports/{id_pra_asesmen}/assign-psikolog`.
- Loading mengikuti request backend.
- Ringkasan kondisi AI, rekomendasi AI, urgensi/skor, dan distorsi terdeteksi disembunyikan dari sisi pasien setelah selesai menjawab.
- UI menampilkan ucapan terima kasih, pesan kerahasiaan jawaban, pilihan psikolog, atau status review jika sudah assigned.

Belum selesai:
- Tombol lanjut konsultasi belum masuk flow booking nyata.

### Pesan Pasien

Status: dinamis dan terhubung backend.

Yang sudah ada:
- Halaman pesan pasien membaca daftar pra-asesmen/feedback.
- Detail pesan membaca report spesifik.
- Tab filter `Menunggu Review` dan `Selesai Review`.
- Status menunggu review tampil sebagai pesan antrean peninjauan psikolog, bukan warning privilege.
- Loading sudah mengikuti request backend.
- Cache stale-while-revalidate aktif.
- Fix backend `MissingGreenlet`: list report pasien eager-load `sesi_jurnal.pasien` dan `sesi_jurnal.jawaban`.

### Dashboard Psikolog Frontend

Status: data dinamis dari backend.

Yang sudah ada:
- Halaman dashboard psikolog membaca `GET /api/dashboard/psikolog/summary`.
- Card metrik (Total Pasien, Belum Direspon, Sudah Direspon) dinamis.
- Tabel laporan terbaru menampilkan data real dari backend.
- Tombol "Tulis Respon" dihapus dari dashboard — hanya "Lihat Detail".
- Navigasi ke halaman detail feedback per laporan.

### Feedback Psikolog Frontend

Status: terhubung penuh ke backend.

Yang sudah ada:
- List feedback membaca `GET /api/pre-assessment/psikolog/reports` dengan filter, search, dan pagination.
- Detail feedback membaca `GET /api/pre-assessment/psikolog/reports/{id}` dengan data AI analysis lengkap.
- Form feedback mengirim ke `PATCH /api/pre-assessment/psikolog/reports/{id}/feedback`.
- Layout dua kolom: AI analysis (kiri) dan form feedback (kanan).
- Ringkasan AI di-highlight, sesi dialog pasien disembunyikan default dan bisa dibuka/tutup lewat toggle.
- Rekomendasi psikoedukasi AI tampil sebagai daftar bernomor tanpa label "Saran AI".
- Kolom feedback sticky saat scroll (CSS `sticky`) agar selalu terlihat.
- Grid `items-start` mencegah kolom kanan stretch.

### Caching Frontend (Stale-While-Revalidate)

Status: aktif di 4 halaman utama.

File:
- `cogniscan-frontend/src/lib/apiCache.ts` — in-memory cache store.
- `cogniscan-frontend/src/lib/useCachedApi.ts` — hook stale-while-revalidate.

Halaman yang pakai cache:
- `/psikolog/dashboard` (key: `psikolog-dashboard-summary`)
- `/psikolog/feedback` (key: `psikolog-feedback-list`)
- `/pasien/dashboard` (key: `pasien-dashboard-summary`)
- `/pasien/pesan` (key: `pasien-messages-list`)

Perilaku:
- Kunjungan pertama: loading spinner → fetch → simpan cache.
- Kunjungan ulang: tampilkan cache instan (0ms) → refresh di background.
- Cache valid 30 detik (configurable).

### Loading Frontend

Status: loading backend sudah dinamis + pre-hydration loader.

Perubahan terbaru:
- `loading.tsx` di route group `(dashboard)` dan `(screening)` menampilkan spinner Lucide kecil di tengah layar.
- Root `layout.tsx` memiliki pre-hydration loader inline HTML yang muncul saat hard reload sebelum React hydrate.
- Pre-hydration loader menggunakan design yang sama dengan `LoadingPage` component: maskot CogniScan + orbit ring + animated dots.
- Loader otomatis hilang (fade out) begitu React render `<main>` atau `<nav>`.
- Fallback timeout 5 detik jika React gagal mount.

## Fase Berikutnya

### Prioritas 1: Smoke Test End-to-End Phase 6B

Tujuan:
- Pastikan alur yang sudah dinamis benar-benar stabil dari sisi pasien dan psikolog.

Urutan test manual:
1. Login pasien.
2. Jalankan screening sampai selesai.
3. Pastikan halaman selesai hanya menampilkan terima kasih, kerahasiaan jawaban, dan pilih psikolog.
4. Pilih psikolog, lalu kembali ke dashboard.
5. Pastikan dashboard pasien menampilkan ringkasan kecil screening terakhir dan tombol ke Pesan.
6. Buka Pesan, cek tab `Menunggu Review`.
7. Login psikolog, buka Dashboard dan Feedback.
8. Buka detail feedback, cek ringkasan AI, toggle sesi dialog, dan form feedback.
9. Kirim feedback.
10. Login pasien lagi, cek tab `Selesai Review` dan detail pesan.

### Prioritas 2: Refactor UX Screening

Tujuan:
- Hilangkan request backend tiap pertanyaan.
- Jawaban disimpan lokal dulu.
- Saat klik `Selesai`, baru:
  1. buat journal session
  2. submit semua jawaban
  3. finalize analyzer

Rekomendasi teknis:
- Simpan jawaban sementara di React state.
- Tambahkan draft localStorage per topic dan user.
- Loading panjang hanya muncul di akhir dengan teks `Menyimpan dan menganalisis jawaban...`.

Opsional backend:
- Buat endpoint bulk answer agar frontend tidak perlu mengirim 10 request berurutan.

### Prioritas 3: Phase 7 Jadwal, Booking, Pembayaran, Konsultasi

Tujuan:
- Membuat alur setelah feedback psikolog: pasien bisa memilih jadwal konsultasi dan psikolog bisa mengelola jadwal/hasil sesi.

Status saat ini:
- File router/service/schema untuk booking, jadwal, konsultasi, pembayaran masih kosong atau belum aktif penuh.
- `pra_asesmen.id_psikolog` sudah terisi dari pilihan pasien dan bisa dipakai sebagai konteks awal booking.

Yang perlu dibuat:
- CRUD jadwal psikolog.
- List jadwal tersedia untuk pasien.
- Booking konsultasi pasien.
- Placeholder pembayaran untuk MVP.
- Hasil konsultasi dari psikolog.

Endpoint awal yang disarankan:
- `GET /api/jadwal/psikolog/{id_psikolog}`
- `POST /api/psikolog/jadwal`
- `PATCH /api/psikolog/jadwal/{id_jadwal_psikolog}`
- `POST /api/booking`
- `GET /api/booking/pasien`
- `GET /api/booking/psikolog`
- `PATCH /api/booking/{id}/payment-placeholder`
- `POST /api/konsultasi/{id_booking}/hasil`

### Prioritas 4: Testing dan Hardening

Test yang paling perlu:
- Auth pasien sign up/sign in/profile sync.
- Admin approve/reject/reset password psikolog.
- Screening start/submit/finalize.
- Crisis response.
- Dashboard pasien/psikolog summary.
- Feedback psikolog end-to-end.
- Local API fallback/CORS di `localhost`, `127.0.0.1`, dan jika perlu IP LAN privat.
- Response serialization untuk endpoint list/detail yang memakai relationship SQLAlchemy async.

Untuk analyzer/LLM:
- Jangan call Gemini asli di test otomatis.
- Pakai mock `analyze_narrative_for_pre_assessment`.

### Prioritas 5: Privacy dan Product Polish

Yang perlu dijaga:
- Pasien tidak melihat ringkasan AI mentah setelah screening.
- Jawaban pasien tetap diposisikan rahasia dan hanya ditinjau psikolog berwenang.
- Psikolog tetap bisa melihat ringkasan AI dan dialog pasien saat diperlukan.
- Audit akses data sensitif belum tersedia dan sebaiknya masuk Phase 8/supporting.

## Catatan Risiko

- Jangan log raw narasi pasien.
- Jangan tampilkan ringkasan AI mentah, skor, rekomendasi AI, atau distorsi terdeteksi langsung ke pasien setelah screening; sisi pasien cukup terima kasih, status review, pesan kerahasiaan, dan feedback psikolog final.
- Jangan return password/token di response.
- Jangan modifikasi `analyzer/` atau `prompts/` tanpa instruksi eksplisit; perubahan terakhir ke Gemini 3 Flash dan prompt rekomendasi sudah atas permintaan user.
- Jangan hard-delete data pasien tanpa retention/audit policy.
- Untuk endpoint yang return ORM dengan relationship, pakai `selectinload` atau response object eksplisit agar tidak kena `MissingGreenlet`.
- Backend route baru perlu restart server FastAPI jika reload tidak menangkap perubahan.
- Frontend env `NEXT_PUBLIC_API_BASE_URL` harus mengarah ke backend aktif, disarankan lokal memakai `http://127.0.0.1:8000`.

## Verifikasi Terakhir

Yang sudah dijalankan pada update terbaru:
- Frontend lint: `npm.cmd run lint` berhasil setelah perubahan terakhir.
- Backend syntax check:
  - `python -m py_compile analyzer\main.py`
  - `python -m py_compile api\main.py`
  - `python -m py_compile api\services\pre_assessment_service.py`
- CORS preflight lokal ke `/api/pre-assessment/reports` berhasil untuk `http://localhost:3000` dan `http://127.0.0.1:3000`.

Yang belum dijalankan penuh pada update terbaru:
- E2E penuh terbaru setelah perubahan "sembunyikan AI pasien" dan fix `MissingGreenlet`.
- E2E booking/konsultasi karena Phase 7 belum tersedia.
- Test otomatis terstruktur.

### Verifikasi Historis Sebelumnya

Yang sudah dijalankan:
- Frontend build: `npm run build` berhasil tanpa error (semua halaman compiled).
- Backend import app berhasil.
- E2E manual: pasien screening → pilih psikolog → psikolog login → lihat dashboard dinamis → buka feedback → kirim feedback → pasien lihat feedback di pesan.

Yang belum dijalankan penuh:
- E2E booking/konsultasi karena Phase 7 belum tersedia.
- Test otomatis terstruktur.
