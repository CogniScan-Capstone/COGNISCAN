# 🧠 CogniScan

> **Platform Skrining Kesehatan Mental Berbasis AI untuk Generasi Muda Indonesia**

CogniScan adalah aplikasi web *hybrid guided journaling* yang dirancang khusus untuk mendeteksi **distorsi kognitif** pada anak muda Indonesia (usia 15-35 tahun). Memanfaatkan kekuatan Large Language Model (Google Gemini), sistem ini menelaah narasi curhatan pengguna secara mendalam dan memberikan wawasan psikolinguistik sebelum mereka berkonsultasi lebih lanjut dengan psikolog profesional.

---

## ✨ Fitur Utama

- 📝 **Hybrid Guided Journaling**: Panduan menulis jurnal yang interaktif untuk menggali kondisi emosional pengguna secara natural.
- 🤖 **AI Cognitive Distortion Detection**: Analisis otomatis berbasis taksonomi psikologi (diadaptasi untuk konteks Indonesia) yang mampu mengenali pola pikir negatif (seperti *Overgeneralization*, *Mental Filter*, *Emotional Reasoning*, dll).
- 📊 **Pre-Assessment Dashboard**: Menyediakan ringkasan tingkat keparahan (*severity score*) dan mendeteksi metrik krisis secara dini.
- 🔒 **Privacy First**: Aman dan sesuai dengan standar kerahasiaan data pengguna.

## 🛠️ Tech Stack (Monorepo)

Proyek ini dibangun menggunakan arsitektur modern yang terbagi menjadi dua bagian di dalam satu repository:

### 1. Frontend (`/cogniscan-frontend`)
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS

### 2. Backend (`/cogniscan-backend`)
- **Framework:** FastAPI (Python 3.11)
- **Database:** PostgreSQL (via Supabase)
- **ORM:** SQLAlchemy (Async) + Alembic
- **AI Engine:** Google Gemini SDK

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

### Menjalankan Backend (Terminal 1)
```bash
cd cogniscan-backend
conda activate cogniscan-backend
uvicorn api.main:app --reload
```
*Backend akan berjalan di `http://127.0.0.1:8000` (Kunjungi `/docs` untuk mengetes API).*

### Menjalankan Frontend (Terminal 2)
```bash
cd cogniscan-frontend
npm run dev
```
*Buka `http://localhost:3000` di browser untuk melihat tampilan antarmuka web.*

---
*Dibangun sebagai bagian dari Proyek Inovasi Digital (Capstone) 2026.*