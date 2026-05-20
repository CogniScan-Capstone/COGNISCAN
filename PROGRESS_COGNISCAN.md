# Progress CogniScan

Tanggal update: 2026-05-20

Dokumen ini menyimpan konteks kerja terbaru untuk sesi berikutnya. Fokus utama saat ini adalah menyelesaikan alur pasien setelah screening, validasi psikolog, lalu masuk ke booking/konsultasi.

## Ringkasan Status

Aplikasi sudah melewati fase fondasi backend, auth, admin approval psikolog, screening pasien, integrasi analyzer, dan beberapa integrasi frontend pasien. Status aplikasi saat ini berada di sekitar akhir Phase 6 dan siap masuk Phase 6B.

Fitur yang baru disentuh terakhir:
- Dashboard pasien sudah memakai data dinamis dari backend untuk `pesan_baru` dan `total_konsultasi`.
- Halaman profile pasien tidak lagi menampilkan teks loading statis, sudah memakai icon spinner dan durasi mengikuti request backend.
- Error screening `MissingGreenlet` saat membuat sesi jurnal sudah diperbaiki di backend.
- UI screening sekarang menampilkan indikator proses saat menyimpan/menganalisis jawaban.
- Loading statis berbasis timer untuk proses backend frontend sudah dihapus. Loading sekarang mengikuti response backend.

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

Status: tersedia.

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

Status: baru dibuat, belum tentu sudah commit.

Endpoint:
- `GET /api/dashboard/pasien/summary`

File:
- `cogniscan-backend/api/routers/dashboard.py`
- `cogniscan-backend/api/services/dashboard_service.py`
- `cogniscan-backend/api/schemas/dashboard.py`

Data:
- `pesan_baru`: jumlah pra-asesmen pasien yang sudah punya `feedback_psikolog`.
- `total_konsultasi`: jumlah row `pemesanan_konsultasi` milik pasien.

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

Status: membaca hasil dari backend.

Yang sudah ada:
- Fetch report dari `GET /api/pre-assessment/reports/{id_pra_asesmen}`.
- Fetch psikolog tersedia dari `GET /api/pre-assessment/psikolog/available`.
- Loading mengikuti request backend.

Belum selesai:
- Pilihan psikolog belum benar-benar menyimpan assignment ke `pra_asesmen.id_psikolog`.
- Tombol lanjut konsultasi belum masuk flow booking nyata.

### Pesan Pasien

Status: mulai dinamis.

Yang sudah ada:
- Halaman pesan pasien membaca daftar pra-asesmen/feedback.
- Detail pesan membaca report spesifik.
- Loading sudah mengikuti request backend.

Catatan:
- Pastikan backend punya endpoint list report pasien. Jika belum stabil, perlu lengkapi di `pre_assessment`.

### Loading Frontend

Status: loading backend sudah dinamis.

Perubahan terbaru:
- `src/lib/loadingDelay.ts` dihapus.
- `GlobalPageLoader` yang memakai timer statis dihapus.
- Root `src/app/layout.tsx` tidak lagi memasang global loader statis.
- Sisa timer yang masih ada bukan untuk loading backend:
  - scroll landing page
  - auto-hide toast psikolog profile
  - indikator draft tersimpan

## Fase Berikutnya

### Prioritas 1: Refactor UX Screening

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

### Prioritas 2: Phase 6B Feedback Psikolog

Tujuan:
- Psikolog bisa melihat hasil pra-asesmen yang perlu direview.
- Psikolog memberi feedback profesional.
- Pasien melihat feedback sebagai pesan.

Endpoint yang perlu dibuat:
- `GET /api/psikolog/pre-assessments`
- `GET /api/psikolog/pre-assessments/{id_pra_asesmen}`
- `PATCH /api/psikolog/pre-assessments/{id_pra_asesmen}/feedback`

Field penting:
- `pra_asesmen.id_psikolog`
- `pra_asesmen.feedback_psikolog`
- `pra_asesmen.status_validasi`
- `pra_asesmen.divalidasi_pada`

Status validasi yang disarankan:
- `menunggu`
- `sedang_direview`
- `selesai`
- `perlu_eskalasi`

### Prioritas 3: Assignment Psikolog

Tujuan:
- Pilihan psikolog dari halaman selesai screening benar-benar tersimpan.

Opsi flow:
- Pasien memilih psikolog, backend set `pra_asesmen.id_psikolog`.
- Psikolog hanya melihat pra-asesmen yang assigned ke dirinya.

Endpoint yang perlu dibuat:
- `PATCH /api/pre-assessment/reports/{id_pra_asesmen}/assign-psikolog`

Validasi:
- Hanya pasien pemilik pra-asesmen yang boleh assign.
- Psikolog harus `terverifikasi`.
- Psikolog harus sudah ganti temporary password.

### Prioritas 4: Phase 7 Jadwal, Booking, Pembayaran, Konsultasi

Status saat ini:
- File router/service/schema untuk booking, jadwal, konsultasi, pembayaran masih kosong atau belum aktif penuh.

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

### Prioritas 5: Testing

Test yang paling perlu:
- Auth pasien sign up/sign in/profile sync.
- Admin approve/reject/reset password psikolog.
- Screening start/submit/finalize.
- Crisis response.
- Dashboard pasien summary.
- Feedback psikolog.

Untuk analyzer/LLM:
- Jangan call Gemini asli di test otomatis.
- Pakai mock `analyze_narrative_for_pre_assessment`.

## Catatan Risiko

- Jangan log raw narasi pasien.
- Jangan return password/token di response.
- Jangan modifikasi `analyzer/` atau `prompts/` tanpa instruksi eksplisit.
- Jangan hard-delete data pasien tanpa retention/audit policy.
- Untuk endpoint yang return ORM dengan relationship, pakai `selectinload` atau response object eksplisit agar tidak kena `MissingGreenlet`.
- Backend route baru perlu restart server FastAPI jika reload tidak menangkap perubahan.
- Frontend env `NEXT_PUBLIC_API_BASE_URL` harus mengarah ke backend aktif, disarankan lokal memakai `http://127.0.0.1:8000`.

## Verifikasi Terakhir

Yang sudah dijalankan:
- Frontend lint: `npm.cmd run lint` berhasil.
- Backend import app: `C:\anaconda\envs\cogniscan-backend\python.exe -c "from api.main import app; print(app.title)"` berhasil.
- Compile backend journal service berhasil.

Yang belum dijalankan penuh:
- E2E manual lengkap pasien screening sampai hasil selesai setelah semua perubahan terakhir.
- E2E feedback psikolog karena Phase 6B belum selesai.
- E2E booking/konsultasi karena Phase 7 belum tersedia.
