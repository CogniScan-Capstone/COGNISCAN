# Progress CogniScan

Tanggal update: 2026-06-01

Dokumen ini menyimpan konteks kerja terbaru untuk sesi berikutnya. Fokus utama saat ini adalah stabilisasi alur end-to-end setelah feedback psikolog: screening teks/voice, assignment psikolog, booking jadwal, pembayaran Midtrans, link konsultasi Jitsi, reschedule paid booking tanpa pembayaran ulang, hasil konsultasi psikolog, follow-up booking tanpa screening ulang, reminder WhatsApp WAHA, tab konsultasi dinamis, security guard lintas role, dan performa navigasi antar tab.

## Ringkasan Status

Status terkini (2026-06-01):
- Phase 8A bagian 1 sudah diverifikasi ulang: backend compile/OpenAPI, migration `a6b7c8d9e0f1 (head)`, frontend lint, TypeScript check, dan production build berhasil.
- Phase 8B tahap awal sudah dibuat: backend sekarang punya pytest suite terstruktur untuk auth/role guard, profil pasien wajib lengkap, active psikolog guard, aturan state booking/payment/missed/expiry, validasi hasil konsultasi, dan reminder WAHA idempotency tanpa menyentuh DB produksi/Midtrans/WAHA asli.
- Frontend sekarang punya script `typecheck` dan `verify`; `npm run verify` menjalankan lint, TypeScript check, dan build sebagai regression gate frontend yang konsisten.
- Sisa Phase 8B berikutnya adalah menambah integration/API test dengan database test terisolasi dan test frontend sungguhan jika nanti testing library/Playwright ditambahkan secara resmi ke `package.json`.
- Phase 8C tahap inti sudah dibuat: hasil konsultasi sekarang memiliki field rekam medis internal v1, endpoint riwayat konsultasi pasien untuk psikolog, UI psikolog untuk mengisi/readback catatan klinis, dan tombol riwayat pasien dari detail jadwal. Migration aktif terbaru menjadi `b8c9d0e1f2a3 (head)`.

Status terkini (2026-05-30):
- Aplikasi sudah melewati Phase 6B dan Phase 7 MVP utama sudah tersambung: feedback psikolog, pesan pasien, booking, pembayaran, link meeting, availability jadwal psikolog, tab konsultasi pasien, flow request/approval reschedule, reschedule paid booking tanpa pembayaran ulang, cancel/no-show/expiry booking, hasil konsultasi psikolog, follow-up booking tanpa screening ulang, UI screening teks/voice yang lebih jelas, reminder WAHA, dashboard admin dinamis, global route guard frontend, validasi wajib profil registrasi, dan cache navigasi antar tab.
- Perubahan UX/flow terbaru sudah menutup beberapa gap setelah testing manual: tab konsultasi pasien memberi label jelas untuk jadwal yang sudah terlewat, pasien bisa membatalkan konsultasi terlewat sebagai status final no-refund, layout pilih jadwal booking pasien dibuat melebar, dan kalender availability psikolog dibuat lebih fleksibel untuk bulan/tahun berikutnya.
- E2E manual utama untuk booking, batal booking, hasil konsultasi, follow-up booking, migration aktif, dan reminder WA sudah dilaporkan berhasil; sisa WAHA sekarang adalah validasi deployment target/multi-worker dan pengamanan dashboard/API.
- Sisa utama sekarang adalah build/verifikasi final sebelum demo, rekam medis lanjutan, testing otomatis, audit log formal, privacy hardening lanjutan, dan dokumentasi operasional terbaru.

Fitur yang baru diselesaikan (2026-05-30):
- **Label konsultasi pasien yang sudah terlewat**: `/pasien/konsultasi` sekarang menampilkan badge `Sudah Terlewat` berdasarkan tanggal/waktu aktual jika jadwal paid sudah melewati waktu selesai + grace period, walaupun status backend/cache masih belum tersinkron penuh.
- **Cancel konsultasi terlewat oleh pasien**: endpoint cancel menerima status `menunggu_konfirmasi_psikolog` dan `terlewat` sebagai pembatalan pasien no-refund; frontend mengaktifkan tombol `Batalkan Konsultasi` pada card terlewat dan copy modal disesuaikan agar tidak menyebut slot future dilepas.
- **Auto-refresh missed booking lebih toleran data lama**: status `menunggu_pembayaran` yang sudah paid ikut dihitung sebagai kandidat missed agar data lama yang inkonsisten bisa masuk alur `menunggu_konfirmasi_psikolog`.
- **Layout booking jadwal pasien diperlebar**: `/pasien/booking/jadwal` tidak lagi dibatasi `max-w-235`; kalender, pilihan waktu, metode, policy, dan tombol konfirmasi memakai grid full-width agar ruang kanan tidak kosong besar.
- **Navigasi bulan/tahun jadwal psikolog diperjelas**: `/psikolog/jadwal` memiliki dropdown bulan eksplisit, rentang tahun ke depan, helper navigasi bulan yang stabil, dan form tambah/bulk slot otomatis mengikuti bulan yang sedang dibuka.
- **Reminder WA setelah pembayaran berhasil**: booking yang status pembayarannya berubah ke `berhasil` langsung mencoba mengirim konfirmasi WhatsApp tipe `booking_paid`; idempotency tetap memakai tabel `reminder_konsultasi`.
- **WAHA manual test berhasil**: endpoint admin `POST /api/booking/reminders/send-due` sudah berhasil dites dengan WAHA session connected; reminder tetap memakai log `reminder_konsultasi` sebagai idempotency agar tidak dobel.
- **E2E manual utama berhasil**: flow booking, batal booking, hasil konsultasi, follow-up booking, migration `a6b7c8d9e0f1`, dan reminder WA sudah dilaporkan berhasil pada environment lokal/staging.
- **Hardening rate limit ringan**: backend menambahkan `slowapi` limiter untuk endpoint mutasi auth/profile, voice/finalize screening, checkout/payment receipt, cancel/reschedule booking, admin action, jadwal psikolog, submit hasil konsultasi, dan reminder manual.

Fitur yang baru diselesaikan (2026-05-26):
- **Dashboard admin dinamis**: `GET /api/dashboard/admin/summary` ditambahkan; dashboard admin membaca total pasien, psikolog pending/terverifikasi/ditolak, total screening, screening menunggu review, konsultasi dibayar, dan pendaftaran psikolog terbaru dari database.
- **Cleanup data psikolog test**: 5 record `Psikolog Test ...` di tabel `psikolog` dan 3 user lokal psikolog test di tabel `pengguna` dihapus; tabel `psikolog` aktif sekarang hanya berisi `dr tanwirul`.
- **Security guard frontend global**: Next.js `src/proxy.ts` ditambahkan untuk melindungi `/admin/*`, `/psikolog/*`, `/pasien/*`, dan auth pages memakai Supabase session + validasi backend `/api/auth/me`.
- **Guard pasien frontend**: layout guard client-side ditambahkan untuk route dashboard pasien dan screening pasien sebagai fallback setelah proxy.
- **Validasi registrasi pasien/psikolog diperketat**: field wajib pasien (nama, email/password, tanggal lahir, jenis kelamin, WA, alamat) dan field wajib psikolog (profil, kontak, praktik, tarif, STR/SIP aktif, dokumen, bio) divalidasi di frontend dan backend.
- **Guard pasien aktif backend**: fitur pasien seperti dashboard, screening/journal, pra-asesmen, booking, dan pembayaran kini memakai `get_current_active_pasien`; profil yang belum lengkap diarahkan ke `/pasien/profile` oleh proxy/layout.
- **Backend active psikolog guard**: endpoint psikolog sensitif di dashboard, pre-assessment/feedback, jadwal, reschedule approval, dan hasil konsultasi kini memakai `get_current_active_psikolog`, sehingga psikolog wajib terverifikasi dan sudah mengganti temporary password.
- **Optimasi rendering antar tab**: cache role backend singkat di proxy, `createBrowserClient` Supabase SSR-aware, dan stale-while-revalidate diperluas ke admin dashboard, admin pendaftaran, pasien booking, pasien konsultasi, pasien receipt, dan kalender jadwal psikolog.
- **WAHA manual test flow diklarifikasi**: endpoint admin `POST /api/booking/reminders/send-due` bisa dites dari Postman memakai token admin; window reminder saat ini `h_minus_24` toleransi 20 menit dan `h_minus_2` toleransi 15 menit.

Fitur yang baru diselesaikan (2026-05-25):
- **Hasil konsultasi psikolog**: psikolog bisa menutup sesi dari detail jadwal, menandai pasien hadir/tidak hadir, menulis ringkasan untuk pasien, rekomendasi, dan catatan internal.
- **Follow-up booking tanpa screening ulang**: pasien bisa booking sesi lanjutan dari konsultasi yang sudah selesai/ditutup memakai `id_booking_sebelumnya`, tanpa membuat `pra_asesmen` baru.
- **UX screening teks/voice**: halaman jawab pertanyaan sekarang memakai segmented control `Tulis Jawaban` / `Rekam Suara`, input dibuat eksklusif, consent dipindah dekat tombol global, dan visualizer rekaman membaca frekuensi mikrofon real-time.
- **Availability jadwal psikolog nyata**: slot booking pasien membaca data `jadwal_psikolog` dari backend; psikolog bisa membuat slot tunggal/bulk, melihat slot tersedia/terisi/lampau, dan menghapus slot kosong.
- **Flow request/approval reschedule**: pasien mengajukan reschedule, psikolog approve/reject dari panel jadwal, dan pasien baru bisa memilih slot baru setelah request disetujui tanpa pembayaran ulang.
- **Konsultasi terlewat/no-show**: booking paid yang melewati waktu selesai + grace period 15 menit berubah menjadi `menunggu_konfirmasi_psikolog`; psikolog menentukan hasil akhir `selesai` atau `terlewat` lewat form hasil konsultasi.
- **Cancel booking pending**: pasien bisa membatalkan booking yang belum dibayar; transaksi ditandai `dibatalkan`, slot dilepas, dan riwayat tetap ada.
- **Cancel konsultasi paid**: pasien bisa membatalkan konsultasi berbayar sebelum waktu mulai dengan konfirmasi no-refund; status menjadi `dibatalkan_pasien`, alasan pembatalan disimpan, slot future dilepas, dan tidak ada refund otomatis.
- **Payment expiry**: pending payment memiliki batas waktu 24 jam; jika kedaluwarsa, status menjadi `payment_kedaluwarsa`, slot dilepas, dan ada endpoint admin/cron `POST /api/booking/status/refresh`.
- **Grace period link online**: link Jitsi hanya menjadi CTA masuk ruang saat window konsultasi aktif, yaitu dari waktu mulai sampai waktu selesai + 15 menit.
- **Label status pasien/psikolog/receipt**: UI pasien dan psikolog sekarang menampilkan label jelas untuk `menunggu_konfirmasi_psikolog`, `terlewat`, `dibatalkan_pasien`, `payment_kedaluwarsa`, `menunggu_reschedule`, `reschedule_disetujui`, dan `reschedule_ditolak`.

Fitur yang baru diselesaikan (2026-05-22):
- **Midtrans payment flow**: backend memiliki service pembayaran/Midtrans, transaksi menyimpan field Snap/order/payment/status Midtrans, frontend booking memakai Snap UI, receipt/detail membaca status pembayaran dinamis, dan webhook/status sync tersedia.
- **Booking konsultasi**: pasien bisa lanjut booking dari feedback final, memilih tanggal/waktu/metode online/offline, checkout membuat booking + transaksi Midtrans, dan booking aktif hanya setelah pembayaran berhasil.
- **Proteksi duplikasi booking**: feedback yang sudah punya booking aktif/pending/paid tidak lagi menampilkan alur "Lanjut Konsultasi" yang sama; jika pending diarahkan lanjut pembayaran, jika paid diarahkan lihat jadwal.
- **Jadwal tidak boleh masa lalu**: frontend men-disable tanggal/bulan/waktu yang sudah lewat dan backend menolak jadwal lampau dengan timezone `Asia/Jakarta`.
- **Tab konsultasi pasien dinamis**: data konsultasi mengambil paid booking, menampilkan tanggal/waktu, metode, link/platform online, atau alamat praktik offline.
- **Jadwal psikolog dinamis**: halaman jadwal psikolog membaca booking pasien yang sudah dibuat/terbayar, bukan placeholder statis.
- **Link Jitsi otomatis**: booking online yang sudah dibayar/terkonfirmasi otomatis mendapatkan `platform_pertemuan` dan `link_pertemuan`; link tampil di receipt, konsultasi pasien, dan jadwal psikolog.
- **Voice note screening dengan Gemini 3 Flash**: pasien bisa menjawab dengan suara; audio diproses di memory tanpa Supabase Storage, hasil AI hanya disimpan sebagai teks ringkasan/transkrip untuk psikolog, dan pasien tidak melihat output AI.
- **Voice answer guard**: mode teks dan voice dibuat eksklusif agar jawaban tidak saling tertimpa; pasien bisa rekam ulang jika perlu.
- **Pertanyaan screening dinamis per topik**: pertanyaan diambil dari config frontend yang disusun dari output `question-generator`; topik `pekerjaan` sudah dihapus.
- **Submit jawaban saat selesai**: jawaban teks dan voice disimpan sementara di browser dan baru dikirim seluruhnya saat pasien menekan `Selesai`, sehingga pindah pertanyaan tidak lagi menunggu request backend.
- **Assignment psikolog setelah voice/crisis**: halaman selesai screening tetap membuka pilihan psikolog jika belum assigned, termasuk kasus `perlu_eskalasi`; assignment tidak lagi ditolak hanya karena status krisis.
- **Tab pesan pasien lebih akurat**: "Selesai Review" hanya muncul jika `status_validasi = selesai`, `divalidasi_pada` ada, dan `feedback_psikolog` tidak kosong. Data pesan tidak memakai cache stale saat mount.
- **Feedback draft psikolog**: psikolog bisa menyimpan draft feedback, draft tidak terlihat pasien/admin sebagai feedback final, dan submit final membersihkan draft.
- **Skor pasien**: tampilan persentase score di sisi pasien dihapus; skor diperlakukan sebagai nilai diskrit/internal sesuai kebutuhan psikolog.
- **Registrasi psikolog disederhanakan**: field spesialisasi, pengalaman, bio singkat, universitas, tahun lulus, kadaluarsa STR, dan kadaluarsa SIP dihapus dari tampilan dan payload frontend.
- **Reset password disatukan**: `/reset-password` sekarang dipakai untuk reset/ganti temporary password psikolog dengan field konfirmasi password; halaman `change password` lama tidak dipakai sebagai tampilan utama.
- **No. WhatsApp pasien**: label nomor pasien diseragamkan menjadi `Nomor WhatsApp`.
- **Kebijakan no-refund/no-show**: booking normal wajib centang persetujuan kebijakan sebelum membuka pembayaran Midtrans.
- **Reschedule tanpa pembayaran ulang**: endpoint `PATCH /api/booking/{id_pemesanan_konsultasi}/reschedule` mengubah jadwal booking paid tanpa membuat transaksi Midtrans baru. Frontend memakai mode `/pasien/booking/jadwal?reschedule_booking_id={id_booking}`.
- **Reminder WhatsApp WAHA**: backend memiliki service WAHA, dispatcher reminder, tabel log `reminder_konsultasi`, migration baru, dan endpoint admin/cron `POST /api/booking/reminders/send-due`.

Catatan historis 2026-05-20 yang masih berlaku:

Pada 2026-05-20, aplikasi sudah melewati Phase 6B (Feedback Psikolog) dan sebagian besar fitur dashboard/feedback sudah dinamis. Saat itu Phase 7 baru akan dimulai; status terbaru Phase 7 ada di bagian 2026-05-22 di atas.

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
- Profil pasien wajib lengkap untuk memakai fitur pasien: `nama_lengkap`, `jenis_kelamin`, `tanggal_lahir`, `alamat_lengkap`, dan `no_hp_wa`.
- Registrasi calon psikolog:
  - `POST /api/auth/register/psikolog`
- Registrasi calon psikolog sekarang mewajibkan data profesional dan legalitas dasar: kontak, spesialisasi, pengalaman, universitas/tahun lulus, alamat praktik, kota/provinsi, tarif, STR/SIP aktif, dokumen STR/SIP, dan bio.
- Update profil psikolog:
  - `PATCH /api/auth/profile/psikolog`
- Ganti temporary password psikolog:
  - `POST /api/auth/change-temporary-password`
- Role guard pasien/admin/psikolog tersedia di `api/dependencies/auth.py`.

Perubahan terbaru:
- Tampilan reset password disatukan di frontend route `/reset-password` dengan field konfirmasi password.
- Psikolog yang login memakai temporary password diarahkan ke `/reset-password`, bukan tampilan `change password` lama.
- Endpoint backend tetap `POST /api/auth/change-temporary-password` untuk membuka akses psikolog setelah password baru tersimpan.
- Form registrasi psikolog frontend tidak lagi meminta/mengirim spesialisasi, pengalaman, bio singkat, universitas, tahun lulus, kadaluarsa STR, dan kadaluarsa SIP.
- Label nomor pasien diseragamkan menjadi `Nomor WhatsApp`.
- Frontend memiliki global route guard di `cogniscan-frontend/src/proxy.ts` untuk `/admin/*`, `/psikolog/*`, `/pasien/*`, dan auth pages.
- Guard frontend memvalidasi Supabase session lalu cek role aktual ke backend `/api/auth/me`; hasil role aktif dicache singkat 60 detik dalam cookie `httpOnly` untuk mempercepat navigasi.
- Pasien dashboard dan pasien screening memiliki layout guard client-side tambahan sebagai fallback.
- Pasien dengan `profile_lengkap=false` diarahkan ke `/pasien/profile`; fitur pasien lain tetap ditolak backend sampai profil wajib lengkap.
- Endpoint psikolog sensitif memakai `get_current_active_psikolog`, bukan hanya `require_role("psikolog")`.

Belum ideal:
- Test otomatis auth/admin belum lengkap.
- Middleware/proxy route guard sudah ada, tetapi perlu test manual lintas role dan automated security regression test.
- Backend tetap sumber keamanan final; audit ownership dan audit log formal masih perlu dilanjutkan.

### Phase 4B: Admin Verifikasi Psikolog

Status: selesai untuk MVP.

Yang sudah ada:
- `GET /api/admin/psikolog`
- `GET /api/admin/psikolog/{id_psikolog}`
- `POST /api/admin/psikolog/{id_psikolog}/approve`
- `POST /api/admin/psikolog/{id_psikolog}/reject`
- `POST /api/admin/psikolog/{id_psikolog}/reset-temporary-password`
- Approval membuat/menyambungkan Supabase Auth user dan mengirim temporary password via email.
- `GET /api/dashboard/admin/summary` menyediakan angka dashboard admin dari database aktif.
- Frontend `/admin/dashboard` tidak lagi memakai placeholder; data mengambil summary backend.
- Data psikolog test lama sudah dibersihkan dari tabel aplikasi sehingga daftar psikolog aktif hanya menampilkan `dr tanwirul`.

Belum ideal:
- Supabase Storage untuk dokumen STR/SIP masih placeholder nama file.
- Audit log formal belum lengkap.
- Jika akun test psikolog pernah dibuat di Supabase Auth, cleanup Auth user masih opsional dilakukan lewat dashboard Supabase.

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
- `POST /api/journal/sessions/{id_sesi_jurnal}/voice-answer`
- `GET /api/journal/sessions/{id_sesi_jurnal}`
- `POST /api/journal/sessions/{id_sesi_jurnal}/finalize`

Yang sudah ada:
- Start session mencatat consent di `log_persetujuan`.
- Submit answer melakukan upsert jawaban per nomor pertanyaan.
- Finalize memvalidasi jawaban lengkap, menjalankan analyzer, dan membuat pra-asesmen.
- Crisis case dikembalikan dengan kontak bantuan.
- Voice answer memproses audio via Gemini 3 Flash tanpa menyimpan file audio mentah ke Supabase Storage/database.
- Response voice answer ke pasien hanya status diterima; transkrip/ringkasan klinis disimpan sebagai teks jawaban untuk psikolog.
- Frontend otomatis lanjut ke pertanyaan berikutnya setelah voice selesai diproses dan mengunci input teks agar jawaban voice tidak tertimpa.

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

Tambahan terbaru:
- Endpoint draft tersedia di `PATCH /api/pre-assessment/psikolog/reports/{id_pra_asesmen}/draft`.
- Draft feedback psikolog tidak tampil sebagai feedback final di sisi pasien.
- Submit feedback final membersihkan draft dan baru membuat pasien masuk tab `Selesai Review`.
- Predicate feedback final wajib: `status_validasi = selesai`, `divalidasi_pada` ada, dan `feedback_psikolog` tidak kosong.

### Phase 7: Jadwal, Booking, Pembayaran, Konsultasi

Status: MVP aktif dan terhubung frontend.

Endpoint dan service utama:
- `POST /api/booking/checkout` membuat booking + transaksi Midtrans dari feedback final.
- `GET /api/booking/availability` membaca slot tersedia dari jadwal psikolog, termasuk mode follow-up booking.
- `GET /api/booking/me` membaca booking pasien.
- `PATCH /api/booking/{id_pemesanan_konsultasi}/reschedule` mengubah jadwal booking paid tanpa membuat transaksi baru.
- `POST /api/konsultasi/{id_pemesanan_konsultasi}/hasil` menyimpan hasil konsultasi dari psikolog.
- `POST /api/booking/reminders/send-due` memproses reminder WhatsApp jatuh tempo lewat WAHA.
- Router pembayaran menangani pembuatan Snap transaction, status/receipt, dan webhook Midtrans.
- Router jadwal membaca jadwal/booking pasien untuk sisi psikolog.

File penting:
- `cogniscan-backend/api/services/booking_service.py`
- `cogniscan-backend/api/services/meeting_service.py`
- `cogniscan-backend/api/services/booking_reminder_service.py`
- `cogniscan-backend/api/services/whatsapp_service.py`
- `cogniscan-backend/api/services/pembayaran_service.py`
- `cogniscan-backend/api/services/midtrans_service.py`
- `cogniscan-backend/api/services/jadwal_service.py`
- `cogniscan-backend/api/services/konsultasi_service.py`
- `cogniscan-backend/api/models/reminder_konsultasi.py`
- `cogniscan-backend/alembic/versions/d3e4f5a6b7c8_add_reminder_konsultasi.py`
- `cogniscan-backend/alembic/versions/a6b7c8d9e0f1_add_consultation_result_followup.py`
- `cogniscan-backend/api/schemas/booking.py`
- `cogniscan-backend/api/schemas/pembayaran.py`
- `cogniscan-backend/api/schemas/jadwal.py`
- `cogniscan-backend/api/schemas/konsultasi.py`
- `cogniscan-frontend/src/lib/booking.ts`

Yang sudah ada:
- Checkout booking membuat `pemesanan_konsultasi` dan `transaksi_pembayaran`.
- Transaksi pembayaran menyimpan field Midtrans seperti order id, transaction id, snap token, redirect URL, fraud/status, expiry, dan raw response seperlunya.
- Booking terkait `id_pra_asesmen`, sehingga satu feedback tidak bisa dipakai untuk membuat booking aktif berulang.
- Follow-up booking bisa dibuat dari konsultasi sebelumnya memakai `id_booking_sebelumnya` tanpa screening ulang.
- Status booking/konsultasi bergantung pada pembayaran berhasil, bukan hanya tombol dari pesan.
- Online booking membawa platform/link meeting Jitsi yang dibuat otomatis setelah paid/terkonfirmasi; offline booking membawa alamat praktik psikolog.
- Frontend menolak pilihan tanggal/waktu lampau dan backend tetap melakukan validasi akhir.
- Booking normal pasien wajib meminta persetujuan kebijakan no-refund/no-show dan reschedule sebelum membuka Midtrans.
- Reschedule paid booking mempertahankan transaksi lama, membuka slot lama, mengunci slot baru, dan tidak membuat Snap transaction baru.
- Booking yang melewati waktu selesai + grace period masuk status `menunggu_konfirmasi_psikolog`, lalu psikolog menentukan `selesai` atau `terlewat`.
- Hasil konsultasi menyimpan `pasien_hadir`, `ringkasan_untuk_pasien`, `rekomendasi`, dan `catatan_internal`; sesi lanjutan tidak dibatasi oleh checkbox psikolog.
- Receipt dan list konsultasi pasien membawa ringkasan/rekomendasi hasil konsultasi yang memang boleh dilihat pasien.
- Reminder WhatsApp memakai WAHA `POST /api/sendText`, konfigurasi env `WAHA_ENABLED`, `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION`, dan `WAHA_SEND_TIMEOUT_SECONDS`.
- Tabel `reminder_konsultasi` menjadi log idempotency agar pasien tidak menerima reminder dobel untuk booking dan tipe reminder yang sama.
- Scheduler internal reminder tersedia di `api/services/booking_reminder_scheduler.py` dan start lewat FastAPI lifespan di `api/main.py` jika `BOOKING_REMINDER_SCHEDULER_ENABLED=true`.
- Env scheduler: `BOOKING_REMINDER_INTERVAL_SECONDS` dan `BOOKING_REMINDER_RUN_ON_STARTUP`.
- Rate limit ringan tersedia lewat `slowapi` dan env `RATE_LIMIT_*`; default storage masih `memory://` untuk development.

Belum ideal:
- Scheduler internal sudah berhasil divalidasi secara lokal/manual, tetapi perlu strategi deployment agar proses FastAPI tetap hidup dan tidak membuat multiple dispatcher jika nanti scale multi-worker.
- Migration `a6b7c8d9e0f1_add_consultation_result_followup.py` sudah di-apply ke database aktif; `alembic current` menampilkan `a6b7c8d9e0f1 (head)`.
- Hasil konsultasi sudah ada untuk MVP, tetapi rekam medis lanjutan, audit akses, dan format klinis final masih perlu dilanjutkan.
- E2E manual hasil konsultasi + follow-up booking sudah dilaporkan berhasil; automated regression test masih perlu dibuat.

## Frontend

### Auth

Status: terhubung ke Supabase Auth + backend profile sync.

Yang sudah ada:
- Sign in memakai Supabase Auth lalu `GET /api/auth/me`.
- Sign up pasien membuat Supabase Auth user lalu sync profil ke backend.
- Sign up psikolog mengirim data ke backend candidate registration.
- Psikolog dengan temporary password diarahkan ke `/reset-password`.

Perubahan terbaru:
- Delay loading buatan 3 detik di flow auth sudah dihapus.
- Loading auth sekarang mengikuti durasi proses asli Supabase/backend.
- Supabase browser client memakai `createBrowserClient` dari `@supabase/ssr` agar session tersedia untuk Next.js proxy/middleware.
- Next.js `src/proxy.ts` melindungi route role dan auth pages, lalu redirect user sesuai role dari backend.
- Karena session sekarang dibaca lewat cookie SSR, user session lama mungkin perlu logout/login ulang sekali setelah perubahan ini.

### Admin Dashboard Frontend

Status: data dinamis dari database.

Yang sudah ada:
- `/admin/dashboard` membaca `GET /api/dashboard/admin/summary`.
- Metrik utama menampilkan total pasien, psikolog aktif, psikolog menunggu verifikasi, dan konsultasi dibayar.
- Metrik tambahan menampilkan total psikolog, total screening, dan screening menunggu review.
- Tabel pendaftaran terbaru menampilkan nama, email, dokumen STR/SIP, tanggal daftar, status, dan tombol detail.
- Kolom `Spesialisasi` di dashboard admin dihapus karena field tersebut tidak lagi dipakai di flow registrasi psikolog terbaru.
- Data test psikolog sudah dibersihkan dari database aplikasi.

### Dashboard Pasien

Status: data utama sudah dinamis.

Yang sudah ada:
- Halaman dashboard pasien membaca `GET /api/dashboard/pasien/summary`.
- Card `Pesan Baru` dan `Total Konsultasi` tidak lagi hardcoded.

Catatan:
- Pastikan backend sudah restart setelah route dashboard ditambahkan.

### Profile Pasien

Status: sudah memakai data backend, loading dinamis, dan validasi field wajib.

Yang sudah ada:
- Fetch profile dari `GET /api/auth/profile/pasien`.
- Update profile dari `PATCH /api/auth/profile/pasien`.
- Nama, tanggal lahir, jenis kelamin, nomor WhatsApp, dan alamat tidak boleh dikosongkan saat update.
- Teks `Memuat profil...` sudah diganti icon spinner.
- Loading berhenti setelah request selesai di `finally`.

### Screening Pasien

Status: berjalan dengan input teks dan voice note yang dipisah eksplisit.

Yang sudah ada:
- Halaman screening membuat journal session, submit jawaban, finalize, lalu redirect ke halaman selesai.
- Pertanyaan screening sudah dinamis per topik dari config frontend berbasis output `question-generator`.
- Topik `pekerjaan` sudah dihapus dari flow screening dan navigasi terkait.
- Jawaban teks dan voice disimpan sementara di state browser saat pasien berpindah pertanyaan.
- Saat pasien menekan `Selesai`, frontend baru membuat/memakai journal session, submit seluruh jawaban, lalu finalize analyzer.
- Saat proses submit akhir, UI sekarang menampilkan:
  - spinner di tombol
  - status `Menyimpan jawaban...`
  - status `Menganalisis jawaban...` pada pertanyaan terakhir
  - textarea/navigasi dikunci sementara
- Halaman jawab pertanyaan memakai segmented control `Tulis Jawaban` / `Rekam Suara`, sehingga pasien jelas memilih satu metode input.
- Area kerja memakai conditional rendering: textarea hanya muncul pada mode teks, kartu rekaman hanya muncul pada mode suara.
- Mode input eksklusif: pindah ke teks membersihkan voice answer aktif, pindah ke voice membersihkan teks aktif untuk pertanyaan yang sama.
- Consent pemrosesan AI berada tepat di atas tombol aksi global dan tombol `Simpan & Lanjut` baru aktif jika input valid + consent dicentang.
- Tombol voice internal untuk lanjut/upload sudah dihapus; voice blob disimpan ketika tombol global ditekan.
- Recorder menampilkan status rekam merah, timer berjalan, dan visualizer frekuensi real-time dari mic memakai Web Audio API `AnalyserNode`.
- Hasil proses AI voice tidak ditampilkan ke pasien; jawaban voice tetap diproses sebagai teks saat submit akhir screening.

Masalah UX tersisa:
- Belum ada draft localStorage per topik/user; jika browser refresh sebelum `Selesai`, jawaban sementara masih bisa hilang.
- Opsional backend berikutnya: buat endpoint bulk answer agar frontend tidak perlu mengirim jawaban satu per satu saat submit akhir.

### Halaman Selesai Screening

Status: membaca backend untuk assignment, tetapi tidak menampilkan ringkasan AI ke pasien.

Yang sudah ada:
- Fetch report dari `GET /api/pre-assessment/reports/{id_pra_asesmen}`.
- Fetch psikolog tersedia dari `GET /api/pre-assessment/psikolog/available`.
- Simpan pilihan psikolog via `PATCH /api/pre-assessment/reports/{id_pra_asesmen}/assign-psikolog`.
- Loading mengikuti request backend.
- Ringkasan kondisi AI, rekomendasi AI, urgensi/skor, dan distorsi terdeteksi disembunyikan dari sisi pasien setelah selesai menjawab.
- UI menampilkan ucapan terima kasih, pesan kerahasiaan jawaban, pilihan psikolog, atau status review jika sudah assigned.
- Pilihan psikolog tetap muncul untuk screening voice dan kasus `perlu_eskalasi` selama belum assigned/final feedback.
- Tombol lanjut konsultasi tidak dipakai dari halaman selesai; konsultasi dibuka setelah feedback psikolog final di pesan.

### Pesan Pasien

Status: dinamis dan terhubung backend.

Yang sudah ada:
- Halaman pesan pasien membaca daftar pra-asesmen/feedback.
- Detail pesan membaca report spesifik.
- Tab filter `Menunggu Review` dan `Selesai Review`.
- Status menunggu review tampil sebagai pesan antrean peninjauan psikolog, bukan warning privilege.
- Tab `Selesai Review` hanya berisi feedback final yang benar-benar sudah divalidasi psikolog.
- Detail feedback menampilkan pilihan lanjut konsultasi hanya jika belum ada booking aktif untuk feedback tersebut.
- Jika booking masih pending payment, pasien diarahkan lanjut pembayaran; jika sudah paid, tombol lanjut konsultasi hilang dan pasien diarahkan ke jadwal/konsultasi.
- Loading sudah mengikuti request backend.
- Cache stale-while-revalidate aktif, tetapi `/pasien/pesan` memakai `ttlMs: 0` agar status review tidak stale saat baru selesai screening.
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

### Booking dan Pembayaran Pasien

Status: terhubung ke backend dan Midtrans Snap.

Yang sudah ada:
- `/pasien/booking` membaca feedback final dan booking pasien untuk menentukan state eligible, pending payment, atau sudah terjadwal.
- `/pasien/booking/jadwal` memilih tanggal, waktu, dan metode online/offline.
- Konfirmasi booking memanggil checkout backend, membuat transaksi Midtrans, lalu membuka Snap UI.
- Booking normal wajib centang persetujuan kebijakan no-refund/no-show dan reschedule sebelum tombol konfirmasi aktif.
- Mode reschedule dibuka lewat `/pasien/booking/jadwal?reschedule_booking_id={id_booking}`.
- Dalam mode reschedule, frontend memanggil endpoint reschedule dan tidak membuka Midtrans.
- Mode follow-up dibuka lewat `/pasien/booking/jadwal?followup_booking_id={id_booking}` dan tetap memakai checkout Midtrans baru tanpa membuat screening baru.
- Tanggal/bulan/waktu lampau tidak bisa dipilih di frontend.
- Layout `/pasien/booking/jadwal` sudah dibuat full-width agar kalender, pilihan waktu, metode, policy, dan tombol konfirmasi tidak menumpuk di kiri serta tidak menyisakan ruang kanan besar.
- `/pasien/booking/receipt` dan `/pasien/booking/receipt/detail` membaca data booking/pembayaran dinamis.

Catatan:
- Key Midtrans harus sepasang sesuai environment yang sama. Sandbox server key harus dipakai dengan sandbox client key, bukan dicampur production.
- Jika transaksi ditolak `Access denied due to unauthorized transaction`, cek kembali `MIDTRANS_IS_PRODUCTION`, server key, dan client key.

### Konsultasi Pasien dan Jadwal Psikolog

Status: data utama sudah dinamis dari paid booking dan hasil konsultasi psikolog.

Yang sudah ada:
- `/pasien/konsultasi` menampilkan daftar konsultasi dari booking yang sudah dibayar.
- Konsultasi online menampilkan platform dan link meeting Jitsi.
- Konsultasi offline menampilkan alamat praktik psikolog, hari, tanggal, dan waktu.
- `/psikolog/jadwal` dan detail tanggal membaca booking pasien dari backend.
- Status `menunggu_konfirmasi_psikolog` ditampilkan sebagai kondisi pasca-waktu konsultasi yang masih menunggu keputusan psikolog.
- Card pasien yang waktunya sudah melewati grace period menampilkan label `Sudah Terlewat` agar pasien bisa membedakan jadwal aktif vs jadwal lampau.
- Pasien bisa memilih `Batalkan Konsultasi` pada jadwal yang sudah terlewat; status menjadi `dibatalkan_pasien` dengan no-refund, bukan dipaksa hanya reschedule.
- Detail jadwal psikolog memiliki form `Selesaikan Konsultasi` untuk menandai hadir/tidak hadir, ringkasan pasien, rekomendasi, dan catatan internal.
- Halaman `/psikolog/jadwal` mendukung navigasi bulan/tahun berikutnya dengan dropdown bulan, pilihan tahun, dan form slot yang mengikuti bulan aktif.
- Pasien melihat ringkasan dan rekomendasi hasil konsultasi yang memang ditujukan untuk pasien, bukan catatan internal.
- Konsultasi yang sudah `selesai` atau `ditutup` bisa membuka CTA `Booking Sesi Lanjutan`.

Belum ideal:
- E2E manual konsultasi sampai psikolog submit hasil sudah dilaporkan berhasil; test otomatis/regression belum tersedia.
- Validasi klinis untuk format hasil konsultasi dan rekam medis final masih perlu diputuskan.

### Reminder WhatsApp WAHA

Status: service backend, endpoint admin/cron, scheduler internal, dan manual test dengan WAHA session connected sudah tersedia/berhasil.

Yang sudah ada:
- Service `api/services/whatsapp_service.py` mengirim pesan ke WAHA `POST /api/sendText`.
- Service `api/services/booking_reminder_service.py` mencari booking paid/terkonfirmasi yang jatuh tempo H-24 dan H-2 jam.
- Model dan tabel `reminder_konsultasi` mencatat status reminder agar tidak terkirim dobel.
- Endpoint `POST /api/booking/reminders/send-due` memproses reminder jatuh tempo dan butuh role admin.
- Env WAHA ditambahkan di backend: `WAHA_ENABLED`, `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION`, `WAHA_SEND_TIMEOUT_SECONDS`.
- Scheduler internal `booking_reminder_scheduler` aktif jika `BOOKING_REMINDER_SCHEDULER_ENABLED=true`, berjalan tiap `BOOKING_REMINDER_INTERVAL_SECONDS`, dan bisa dispatch saat startup jika `BOOKING_REMINDER_RUN_ON_STARTUP=true`.
- Manual test Postman disiapkan lewat endpoint `POST /api/booking/reminders/send-due` dengan token admin.
- Manual test WAHA dengan session connected sudah berhasil; reminder jatuh tempo bisa dikirim lewat endpoint admin/cron.

Belum ideal:
- Scheduler otomatis sudah berhasil divalidasi pada environment lokal/manual; environment target tetap perlu strategi multi-worker agar dispatcher tidak berjalan ganda.
- WAHA dashboard/API perlu diamankan dengan credential dashboard, `WAHA_API_KEY`, bind lokal/private network, atau reverse proxy internal jika dipakai bersama.

### Caching Frontend (Stale-While-Revalidate)

Status: aktif di banyak halaman utama untuk mempercepat navigasi antar tab.

File:
- `cogniscan-frontend/src/proxy.ts` - route guard + cache role backend singkat 60 detik di cookie `httpOnly`.
- `cogniscan-frontend/src/lib/apiCache.ts` — in-memory cache store.
- `cogniscan-frontend/src/lib/useCachedApi.ts` — hook stale-while-revalidate.

Halaman yang pakai cache:
- `/psikolog/dashboard` (key: `psikolog-dashboard-summary`)
- `/psikolog/feedback` (key: `psikolog-feedback-list`)
- `/psikolog/jadwal` (key per rentang bulan `psikolog-jadwal:{start}:{end}`)
- `/pasien/dashboard` (key: `pasien-dashboard-summary`)
- `/pasien/pesan` (key: `pasien-messages-list`)
- `/pasien/booking` (key: `pasien-booking-context`)
- `/pasien/konsultasi` (key: `pasien-konsultasi-bookings`)
- `/pasien/booking/receipt` (key: `pasien-booking-receipts`)
- `/admin/dashboard` (key: `admin-dashboard-summary`)
- `/admin/pendaftaran` (key: `admin-psikolog-list`)

Perilaku:
- Kunjungan pertama: loading spinner → fetch → simpan cache.
- Kunjungan ulang: tampilkan cache instan (0ms) → refresh di background.
- Cache valid 30 detik (configurable).
- Jika halaman mengirim `ttlMs: 0`, cache dilewati saat mount. Ini dipakai untuk `/pasien/pesan` agar screening baru tidak salah masuk tab `Selesai Review` karena data lama.
- Cache hanya untuk UX frontend; backend tetap memvalidasi token, role, ownership, dan status data pada setiap API request.

### Loading Frontend

Status: loading backend sudah dinamis + pre-hydration loader.

Perubahan terbaru:
- `loading.tsx` di route group `(dashboard)` dan `(screening)` menampilkan spinner Lucide kecil di tengah layar.
- Root `layout.tsx` memiliki pre-hydration loader inline HTML yang muncul saat hard reload sebelum React hydrate.
- Pre-hydration loader menggunakan design yang sama dengan `LoadingPage` component: maskot CogniScan + orbit ring + animated dots.
- Loader otomatis hilang (fade out) begitu React render `<main>` atau `<nav>`.
- Fallback timeout 5 detik jika React gagal mount.

## Fase Berikutnya

### Prioritas 1: Smoke Test End-to-End Phase 7/8A

Tujuan:
- Pastikan alur pasien dari screening sampai konsultasi lanjutan berjalan utuh setelah perubahan UI screening, hasil konsultasi psikolog, dan follow-up booking.

Status terbaru:
- Checklist utama sudah dijalankan secara manual dan dilaporkan berhasil; pertahankan daftar ini sebagai regression checklist sebelum demo/deployment.

Urutan test manual:
1. Login pasien, jalankan screening mode teks sampai selesai.
2. Jalankan screening mode voice pada pertanyaan lain, pastikan visualizer bergerak mengikuti suara dan tombol lanjut hanya aktif setelah consent dicentang.
3. Pastikan perpindahan pertanyaan tidak menunggu request backend dan submit akhir baru terjadi saat `Selesai`.
4. Pastikan screening baru masuk tab `Menunggu Review`, bukan `Selesai Review`.
5. Pilih psikolog dari halaman selesai screening.
6. Login psikolog, cek feedback list/detail, pastikan jawaban voice terlihat sebagai teks ringkasan/transkrip.
7. Simpan draft feedback, refresh, pastikan draft tetap ada tetapi belum muncul di pasien.
8. Kirim feedback final.
9. Login pasien, buka pesan detail feedback, pilih lanjut konsultasi.
10. Booking tanggal/waktu/metode, pastikan tanggal/waktu lampau tidak bisa dipilih.
11. Pastikan checkbox kebijakan no-refund/no-show wajib dicentang sebelum pembayaran.
12. Konfirmasi booking, bayar via Midtrans Snap sandbox.
13. Pastikan booking online punya link Jitsi setelah paid.
14. Pastikan feedback yang sama tidak bisa membuat booking normal kedua.
15. Pastikan tab Booking dan Konsultasi menampilkan jadwal paid booking.
16. Login psikolog, cek jadwal pasien muncul di tab Jadwal.
17. Setelah waktu konsultasi lewat grace period, pastikan status menjadi `menunggu_konfirmasi_psikolog`.
18. Submit form hasil konsultasi sebagai psikolog, lalu pastikan pasien melihat ringkasan/rekomendasi dan bukan catatan internal.
19. Uji CTA `Booking Sesi Lanjutan`, pastikan URL memakai `followup_booking_id` dan checkout membuat transaksi baru tanpa screening ulang.
20. Uji reschedule paid booking via `/pasien/booking/jadwal?reschedule_booking_id={id_booking}`, pastikan tidak membuka Midtrans dan jadwal berubah.
21. WAHA manual reminder sudah berhasil; lanjut validasi scheduler otomatis di environment target.

### Prioritas 2: Apply Migration Terbaru dan Validasi DB

Tujuan:
- Menyamakan schema database aktif dengan kode backend terbaru.

Status terbaru:
- `alembic upgrade head` sudah dijalankan dan `alembic current` menampilkan `a6b7c8d9e0f1 (head)`.
- Backend perlu tetap direstart setelah migration atau perubahan kode agar router/schema terbaru terbaca.

### Prioritas 3: Scheduler Reminder WAHA

Tujuan:
- Mengaktifkan reminder WhatsApp pasien secara periodik.

Status terbaru:
- Manual test endpoint `POST /api/booking/reminders/send-due` dengan WAHA session connected sudah berhasil.
- Reminder langsung setelah booking selesai dibayar sudah berhasil muncul pada simulasi pembayaran.

Yang perlu divalidasi:
- Scheduler internal backend di environment target berjalan stabil dengan `BOOKING_REMINDER_SCHEDULER_ENABLED=true`.
- Jika deployment memakai multi-worker, pastikan hanya satu dispatcher reminder yang aktif atau pindahkan ke worker/cron tunggal.
- Konfigurasi WAHA dashboard/API diamankan sebelum dipakai bersama/production.
- Manual test H-24 dan H-2 sudah berhasil secara endpoint; ulangi lagi sebelum demo/deployment final jika konfigurasi WAHA berubah.

### Prioritas 4: Hasil Konsultasi dan Rekam Medis

Status terbaru:
- Form hasil konsultasi sisi psikolog sudah tersedia untuk MVP.
- Ringkasan/rekomendasi pasien sudah dipisah dari catatan internal.
- Follow-up booking sudah tersedia lewat `id_booking_sebelumnya`.
- Rekam medis internal v1 sudah tersedia di `hasil_konsultasi`: keluhan utama, observasi psikolog, asesmen klinis, intervensi, rencana tindak lanjut, tingkat risiko, dan versi format.
- Endpoint psikolog `GET /api/konsultasi/pasien/{id_pasien}/riwayat` sudah tersedia dan hanya mengembalikan riwayat pasien yang pernah ditangani psikolog login.
- UI `/psikolog/jadwal/[date]` sudah bisa mengisi field rekam medis internal, readback catatan internal lama, dan membuka riwayat konsultasi pasien dari card jadwal.

Yang perlu dilanjutkan:
- Review format rekam medis v1 dengan psikolog: field mana yang wajib, istilah klinis final, dan apakah perlu tanda tangan/lock setelah submit.
- Audit akses hasil konsultasi/riwayat pasien.
- Ekspor/print riwayat konsultasi jika dibutuhkan.

### Prioritas 5: Testing dan Privacy Hardening

Test yang paling perlu:
- Route guard frontend: pasien/admin/psikolog tidak bisa membuka route role lain dan user sudah login tidak diarahkan ke auth page.
- Validasi registrasi pasien/psikolog: payload kosong/blank dari frontend dan Postman harus ditolak sebelum user bisa memakai fitur role.
- Backend active pasien guard: pasien dengan profil tidak lengkap hanya boleh melengkapi profil, bukan memulai screening/booking/pembayaran.
- Backend active psikolog guard: psikolog belum terverifikasi/belum ganti temporary password tidak bisa akses dashboard, feedback, jadwal, dan hasil konsultasi.
- Booking checkout + duplicate prevention.
- Follow-up booking tanpa `pra_asesmen` baru.
- Submit hasil konsultasi psikolog dan akses pasien ke ringkasan yang boleh dibagikan.
- Midtrans status/webhook mapping.
- Voice answer tanpa storage audio mentah.
- Predicate feedback final di dashboard, pesan, booking, dan selesai screening.
- Past-date booking backend/frontend.
- Akses data sensitif dan audit log.
- Rate limit ringan endpoint sensitif sudah ditambahkan; perlu tuning angka limit berdasarkan pola trafik nyata dan gunakan Redis/Valkey jika production multi-instance.

### Prioritas 6: Operasional dan Security Deployment

Yang perlu dilakukan:
- Amankan WAHA dashboard/API dengan dashboard password, `WAHA_API_KEY`, dan network binding privat atau reverse proxy internal.
- Cleanup user test lama di Supabase Auth jika masih ada, karena tabel aplikasi sudah dibersihkan tetapi Auth user bisa tersisa.
- Tambahkan audit log formal untuk admin action, psikolog membuka laporan pasien, psikolog submit hasil konsultasi, pasien membuka hasil konsultasi, payment sync, dan reminder WAHA.
- Rate limit ringan sudah ditambahkan untuk auth mutation, screening finalize/voice, payment create/status, admin action, jadwal/hasil konsultasi, dan reminder manual endpoint; sisa production hardening adalah tuning limit dan storage terpusat.

## Fase Berikutnya Historis (2026-05-20)

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

Status saat itu (2026-05-20):
- File router/service/schema untuk booking, jadwal, konsultasi, pembayaran masih kosong atau belum aktif penuh.
- `pra_asesmen.id_psikolog` sudah terisi dari pilihan pasien dan bisa dipakai sebagai konteks awal booking.

Yang perlu dibuat:
- CRUD jadwal psikolog.
- List jadwal tersedia untuk pasien.
- Booking konsultasi pasien.
- Integrasi pembayaran (status terbaru 2026-05-22 sudah memakai Midtrans Snap).
- Hasil konsultasi dari psikolog.

Endpoint awal yang disarankan:
- `GET /api/jadwal/psikolog/{id_psikolog}`
- `POST /api/psikolog/jadwal`
- `PATCH /api/psikolog/jadwal/{id_jadwal_psikolog}`
- `POST /api/booking`
- `GET /api/booking/pasien`
- `GET /api/booking/psikolog`
- `POST /api/booking/checkout`
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
- Voice note tidak boleh upload audio mentah ke Supabase Storage atau menyimpan audio di database; hanya teks hasil proses yang boleh disimpan.
- Visualizer voice membaca stream mikrofon lewat Web Audio API di browser; jangan jadikan data frekuensi sebagai data medis yang disimpan.
- Jangan gunakan `status_validasi = selesai` saja sebagai tanda feedback final. Harus ada `divalidasi_pada` dan `feedback_psikolog` non-kosong.
- Midtrans sandbox/production key tidak boleh dicampur. Mismatch key menyebabkan Snap ditolak `Access denied due to unauthorized transaction`.
- Validasi jadwal lampau wajib ada di backend walaupun frontend sudah men-disable pilihan.
- Jangan lakukan reschedule lewat checkout normal karena akan membuat transaksi Midtrans baru. Reschedule paid booking wajib memakai `PATCH /api/booking/{id}/reschedule`.
- Jangan perlakukan `menunggu_konfirmasi_psikolog` sebagai status final; psikolog harus menutup sesi menjadi `selesai`, `terlewat`, atau status final lain yang disepakati.
- Follow-up booking wajib memakai `id_booking_sebelumnya`, bukan membuat `pra_asesmen` dummy atau memakai ulang `id_pra_asesmen` lama sebagai booking normal.
- Sebelum test manual follow-up booking dan hasil konsultasi, jalankan Alembic `upgrade head` agar kolom dan unique index terbaru tersedia di database aktif.
- Jangan kirim reminder WA tanpa log idempotency. Gunakan `reminder_konsultasi` agar pasien tidak menerima reminder dobel.
- WAHA dianggap siap hanya jika env aktif dan session WAHA sudah login/connected; env terisi saja belum cukup.
- WAHA dashboard tidak ikut login CogniScan; jangan expose ke internet tanpa dashboard credential, API key, HTTPS/reverse proxy, dan pembatasan akses jaringan.
- Cache role frontend di proxy hanya optimasi UX singkat; jangan jadikan cache frontend sebagai sumber otorisasi. Backend tetap wajib validasi token, role, ownership, dan status akun.
- Setelah perubahan Supabase SSR client/proxy, user dengan session lama mungkin perlu logout/login ulang agar cookie session tersedia untuk middleware.
- Setelah validasi profil wajib, akun pasien lama yang belum lengkap akan diarahkan ke `/pasien/profile` dan belum bisa memakai screening/booking sampai data wajib dilengkapi.

## Verifikasi Terakhir

Yang sudah dijalankan pada update 2026-06-01 Phase 8B tahap awal:
- Backend:
  - `conda run -n cogniscan-backend pytest` berhasil dengan `31 passed`.
  - `conda run -n cogniscan-backend python -m compileall -q api tests` berhasil.
  - `conda run -n cogniscan-backend ruff check tests` berhasil dengan `All checks passed!`.
- Frontend:
  - `npm.cmd run verify` berhasil; command ini menjalankan `npm run lint`, `npm run typecheck`, dan `npm run build`.
  - Build Next.js tetap berhasil generate 27 static pages dan mendeteksi `Proxy (Middleware)`.
- Catatan:
  - Test backend Phase 8B saat ini bersifat unit/regression cepat dan tidak memakai database produksi, Midtrans, Gemini, atau WAHA sungguhan.
  - Integration test dengan database test terisolasi dan frontend component/E2E test masih menjadi pekerjaan lanjutan.

Yang sudah dijalankan pada update 2026-06-01 Phase 8C rekam medis:
- Database:
  - Migration `b8c9d0e1f2a3_add_clinical_record_fields.py` dibuat dan `alembic upgrade head` berhasil.
  - `conda run -n cogniscan-backend alembic current` menampilkan `b8c9d0e1f2a3 (head)`.
- Backend:
  - `conda run -n cogniscan-backend pytest` berhasil dengan `32 passed`.
  - `conda run -n cogniscan-backend python -m compileall -q api tests` berhasil.
  - `conda run -n cogniscan-backend python -c "from api.main import app; schema=app.openapi(); print('openapi ok', len(schema.get('paths', {})))"` berhasil dengan `openapi ok 50`.
  - `conda run -n cogniscan-backend ruff check ...` untuk file Phase 8C yang diubah berhasil.
- Frontend:
  - `npm.cmd run verify` berhasil; lint, TypeScript check, dan Next.js build berhasil.
- Catatan:
  - `ruff check api tests` penuh masih menemukan beberapa isu historis di file lama yang tidak disentuh, seperti unused import/redefinition di modul lain. File yang disentuh Phase 8C sudah lulus ruff.

Yang sudah dijalankan pada update 2026-05-30:
- Database:
  - `conda run -n cogniscan-backend alembic current` menampilkan `a6b7c8d9e0f1 (head)`, sehingga migration terbaru sudah aktif di database.
- Backend:
  - `conda run -n cogniscan-backend python -m py_compile api\services\booking_service.py` berhasil setelah perubahan cancel konsultasi terlewat dan status missed booking.
  - `conda run -n cogniscan-backend python -m py_compile api\core\config.py api\core\rate_limit.py api\main.py api\routers\auth.py api\routers\booking.py api\routers\journal.py api\routers\pembayaran.py api\routers\admin.py api\routers\konsultasi.py api\routers\jadwal.py` berhasil setelah hardening rate limit.
  - `conda run -n cogniscan-backend python -c "from api.main import app; schema=app.openapi(); print('openapi ok', len(schema.get('paths', {})))"` berhasil dengan `openapi ok 49`.
  - `conda run -n cogniscan-backend ruff check ...` untuk file hardening backend berhasil.
  - Duplikat route `GET /api/auth/profile/pasien` dibersihkan; warning duplicate operation ID OpenAPI sudah tidak muncul pada verifikasi terbaru.
- Frontend:
  - `npm.cmd run lint` berhasil setelah perubahan `/pasien/konsultasi`, `/pasien/booking/jadwal`, dan `/psikolog/jadwal`.
  - `npx.cmd tsc --noEmit` berhasil setelah perubahan tersebut.
- Repository:
  - `git diff --check` untuk file yang diubah berhasil; warning yang muncul hanya LF/CRLF normal dari Git.
- Manual/operasional:
  - WAHA manual test via endpoint admin `POST /api/booking/reminders/send-due` berhasil dengan WAHA session connected.
  - Simulasi pembayaran Midtrans sandbox berhasil memicu reminder WhatsApp tipe `booking_paid`.
  - Booking, batal booking, hasil konsultasi, follow-up booking, dan reminder WA dilaporkan berhasil pada pengujian manual.

Yang sudah dijalankan pada update 2026-05-26 validasi registrasi/profile guard:
- Backend:
  - `python -m compileall cogniscan-backend/api` berhasil.
  - `conda run -n cogniscan-backend python -c "from api.main import app; schema=app.openapi(); print('openapi ok', len(schema.get('paths', {})))"` berhasil dengan `openapi ok 48`.
  - Catatan historis: saat itu OpenAPI masih memberi warning duplicate operation ID dari router auth lama; sudah dibersihkan pada update 2026-05-30.
- Frontend:
  - `npm run lint` berhasil.
  - `npx tsc --noEmit` berhasil.
  - `npm run build` berhasil dan Next.js mendeteksi `Proxy (Middleware)`.

Yang sudah dijalankan pada update 2026-05-26 security + admin dashboard + cache navigasi:
- Database:
  - Query read-only memastikan data psikolog test memang ada di tabel `psikolog`.
  - 5 record `Psikolog Test ...` dihapus dari tabel `psikolog`.
  - 3 user lokal psikolog test terkait dihapus dari tabel `pengguna`.
  - Verifikasi akhir tabel `psikolog` hanya menampilkan `(6, 'dr tanwirul', 'terverifikasi')`.
- Backend:
  - `conda run -n cogniscan-backend python -m py_compile api\routers\dashboard.py api\routers\pre_assessment.py api\routers\jadwal.py api\routers\konsultasi.py` berhasil.
  - `conda run -n cogniscan-backend python -c "from api.main import app; app.openapi(); print('openapi ok', len(app.routes))"` berhasil dengan `openapi ok 57`.
  - Catatan historis: saat itu OpenAPI masih memberi warning duplicate operation ID dari router auth lama; sudah dibersihkan pada update 2026-05-30.
- Frontend:
  - `npm.cmd run lint` berhasil.
  - `npx.cmd tsc --noEmit` berhasil.
  - `npm.cmd run build` berhasil dan Next.js mendeteksi `Proxy (Middleware)`.
- Catatan operasional:
  - Setelah perubahan `createBrowserClient` + `src/proxy.ts`, session lama bisa perlu logout/login ulang sekali agar cookie Supabase tersedia untuk proxy.

Yang sudah dijalankan pada update 2026-05-25 Session hasil konsultasi + screening UI:
- Backend:
  - `conda run -n cogniscan-backend python -m py_compile ...` untuk file booking/jadwal/konsultasi yang diubah berhasil.
  - `conda run -n cogniscan-backend python -c "from api.main import app; app.openapi(); print('openapi ok', len(app.routes))"` berhasil dengan `openapi ok 56`.
  - `conda run -n cogniscan-backend alembic heads` menampilkan `a6b7c8d9e0f1 (head)`.
  - Catatan: `alembic upgrade head` ke database aktif belum dijalankan pada sesi ini.
- Frontend:
  - `npm.cmd run lint` berhasil.
  - `npx.cmd tsc --noEmit` berhasil.
- Repository:
  - `git diff --check` berhasil; warning yang muncul hanya LF/CRLF normal dari Git.
- Catatan:
  - Catatan historis: saat itu OpenAPI masih memberi warning duplicate operation ID dari router auth lama; sudah dibersihkan pada update 2026-05-30.

Yang sudah dijalankan pada update 2026-05-25:
- Database:
  - `conda run -n cogniscan-backend alembic upgrade head` berhasil sampai revision `f5a6b7c8d9e0`.
  - `conda run -n cogniscan-backend alembic heads` menampilkan `f5a6b7c8d9e0 (head)`.
- Backend:
  - `python -m py_compile` untuk schema/model/service/router booking-payment-jadwal yang diubah berhasil.
  - `python -c "from api.main import app; app.openapi(); print('openapi ok', len(app.routes))"` berhasil dengan `openapi ok 55`.
- Frontend:
  - `npm.cmd run lint` berhasil.
  - `npx.cmd tsc --noEmit` berhasil.
- Repository:
  - `git diff --check` berhasil; warning yang muncul hanya LF/CRLF normal dari Git.
- Server lokal:
  - `http://localhost:3000` merespons `200 OK`.
  - `http://127.0.0.1:8000/docs` merespons `200 OK`.

Yang sudah dijalankan pada update 2026-05-22:
- Backend syntax/import:
  - `python -m py_compile` untuk file service/router/schema yang diubah.
  - `python -c "from api.main import app; app.openapi(); print('openapi ok', len(app.routes))"` berhasil.
- Frontend:
  - `npx.cmd tsc --noEmit` berhasil.
  - `npm.cmd run lint` berhasil.
- Catatan historis: saat itu OpenAPI masih memberi warning duplicate operation ID dari router auth lama; sudah dibersihkan pada update 2026-05-30.

Yang sudah dijalankan pada update 2026-05-22 Session 5:
- Backend:
  - `python -m py_compile` untuk `booking_service.py`, `booking_reminder_service.py`, `whatsapp_service.py`, `routers/booking.py`, `schemas/booking.py`, `models/reminder_konsultasi.py`, `models/pemesanan_konsultasi.py`, dan `core/config.py` berhasil.
- Frontend:
  - `npm run lint` berhasil.
  - `npx tsc --noEmit` berhasil.
- Repository:
  - `git diff --check` berhasil; warning yang muncul hanya LF/CRLF normal dari Git.

Yang belum dijalankan penuh pada update 2026-05-22:
- E2E manual lengkap dengan pembayaran Midtrans sandbox dari screening voice/teks sampai jadwal psikolog.
- E2E manual reschedule paid booking pada database asli.
- Catatan update 2026-05-30: E2E manual utama booking/konsultasi/follow-up sekarang sudah dilaporkan berhasil; automated regression test masih belum ada.
- Catatan update 2026-05-30: WAHA manual test dengan session connected sudah berhasil; yang belum adalah validasi scheduler otomatis di target environment.
- Test otomatis terstruktur untuk payment webhook, duplicate booking, past-date booking, voice answer, reschedule paid booking, dan reminder WAHA idempotency.

Verifikasi historis sebelum Session 5:
- Frontend lint: `npm.cmd run lint` berhasil setelah perubahan terakhir.
- Backend syntax check:
  - `python -m py_compile analyzer\main.py`
  - `python -m py_compile api\main.py`
  - `python -m py_compile api\services\pre_assessment_service.py`
- CORS preflight lokal ke `/api/pre-assessment/reports` berhasil untuk `http://localhost:3000` dan `http://127.0.0.1:3000`.

Yang belum dijalankan penuh pada catatan historis tersebut:
- E2E penuh terbaru setelah perubahan "sembunyikan AI pasien" dan fix `MissingGreenlet`.
- E2E booking/konsultasi pada catatan 2026-05-20 belum dijalankan karena Phase 7 saat itu belum tersedia.
- Test otomatis terstruktur.

### Verifikasi Historis Sebelumnya

Yang sudah dijalankan:
- Frontend build: `npm run build` berhasil tanpa error (semua halaman compiled).
- Backend import app berhasil.
- E2E manual: pasien screening → pilih psikolog → psikolog login → lihat dashboard dinamis → buka feedback → kirim feedback → pasien lihat feedback di pesan.

Yang belum dijalankan penuh:
- E2E booking/konsultasi pada catatan historis ini belum dijalankan karena Phase 7 saat itu belum tersedia.
- Test otomatis terstruktur.
