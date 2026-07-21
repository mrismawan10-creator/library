# Product Requirements Document
## Prompt Library Dashboard

| | |
|---|---|
| Versi | 1.0 (Final) |
| Status | Locked untuk development MVP |
| Tanggal | 21 Juli 2026 |
| Pemilik produk | Muhammad Rismawan |
| Target pengguna | Single user (pemilik) |
| Platform | Responsive web application |
| Dokumen pendamping | `CLAUDE.md` (aturan operasional Claude Code), Pra-Kickoff v0.1 (arsip) |

---

## Changelog v0.1 → v1.0

Semua keputusan terbuka pada v0.1 §21 telah ditutup. Perubahan hasil audit pra-development:

1. Stack dikunci: Next.js (App Router), TypeScript strict, Tailwind CSS, Supabase (PostgreSQL + Storage), Zod, sharp.
2. Deployment dikunci: lokal terlebih dahulu; saat online, Vercel + Basic Auth middleware berbasis env var. Deployment publik tanpa proteksi dilarang.
3. Angka dikunci: debounce autosave 1500 ms, batas panjang title 120 karakter, batas upload cover 10 MB.
4. Fallback cover MVP dikoreksi: uploaded → category template → system default. Nilai `ai_generated` hanya reserved, bukan bagian urutan fallback MVP.
5. Search diubah dari usulan PostgreSQL full-text search menjadi `ILIKE` + `pg_trgm`. Alasan: konten campuran Indonesia/Inggris; stemmer FTS bahasa Inggris merusak pencarian kata Indonesia.
6. Postur keamanan dieksplisitkan: RLS aktif di semua tabel tanpa policy (deny-all), seluruh akses data lewat server dengan service-role key, anon key tidak dipakai untuk data.
7. Aturan satu featured aktif kini punya mekanisme: partial unique index + transaksi.
8. Alur copy dari kartu didefinisikan lengkap, termasuk penanganan clipboard iOS Safari (ClipboardItem berbasis Promise) dan fallback manual.
9. Poster dan thumbnail digenerate server dengan sharp; tidak bergantung pada Supabase image transformation.
10. Keunikan tag ditegakkan dengan unique index pada `lower(name)`.
11. Export JSON dipastikan menyertakan prompt archived, konsisten dengan FR-18.
12. Strategi placeholder cover ditambahkan agar katalog usable sebelum pipeline upload selesai di Milestone 5.
13. Perilaku cover saat duplicate dikunci: file cover disalin ke prompt baru, bukan direferensikan bersama.

Penomoran bagian dipertahankan sama dengan v0.1 agar referensi silang (termasuk dari `CLAUDE.md`) tetap valid.

---

## 1. Product Overview

Prompt Library Dashboard adalah aplikasi web pribadi untuk mengelola prompt AI dalam bentuk katalog visual bergaya etalase streaming.

Pengguna dapat: menyimpan prompt, mengaturnya lewat kategori dan tag, menambahkan cover poster, melihat cuplikan, membuka prompt lengkap, menyalin seluruh isi prompt dalam satu tindakan, mengedit dengan autosave, menandai favorit dan featured, mencari, memfilter, mengurutkan, mengarsipkan, dan mengekspor seluruh data sebagai JSON.

Aplikasi bersifat AI-agnostic: tidak menjalankan prompt dan tidak terikat pada provider AI tertentu.

## 2. Product Goals

- **G1 — Centralized prompt storage.** Seluruh prompt penting tersimpan pada satu database.
- **G2 — Fast retrieval.** Prompt ditemukan lewat home, kategori, search, filter, favorite, dan recently used.
- **G3 — One-click reuse.** Seluruh isi prompt dapat disalin dari kartu maupun halaman detail.
- **G4 — Visual organization.** Cover poster membantu mengenali prompt tanpa membaca isinya.
- **G5 — Extensible architecture.** Struktur siap dikembangkan untuk AI assistance, artifacts, authentication, dan workspace.

## 3. Non-Goals MVP

MVP tidak bertujuan: menjadi marketplace prompt, menjalankan prompt pada model AI, menyediakan chat AI, mengelola banyak pengguna, menyimpan file hasil prompt, menyediakan version history, kolaborasi, public link, atau sinkronisasi dari platform lain.

## 4. Persona

**Owner.** Pengguna tunggal yang mengumpulkan prompt untuk image generation, video, writing, report, infographic, presentation, coding, automation, dan research.

Kebutuhan utama: menyimpan prompt panjang, menemukannya dengan cepat, menyalin lengkap, mengedit tanpa kehilangan data, dan mengorganisasi secara visual.

## 5. Information Architecture

```
/
├── /prompts
├── /prompts/new
├── /prompts/:id
├── /categories
├── /favorites
├── /archived
├── /settings
└── /export
```

Navigasi utama: Home, All Prompts, Favorites, Categories, Archived, Settings, Add Prompt.
Mobile: drawer atau bottom navigation.

## 6. Functional Requirements

### FR-01 — Home Catalog

Home menampilkan hero dan baris katalog horizontal.

Baris default: Recently Added, Recently Used, Favorites, baris per kategori (urut `sort_order`), baris per tipe output bila dibutuhkan.

Aturan:

- Baris kosong tidak ditampilkan.
- Jumlah item awal per baris dibatasi; halaman See All tersedia.
- Cover rasio 2:3, memakai thumbnail, lazy load.
- Sebelum Milestone 5, sistem memakai placeholder cover hasil generate (lihat §21 poin 8).

Acceptance criteria:

- Home menampilkan data Supabase melalui API server.
- Prompt terbaru muncul pada Recently Added; prompt yang baru disalin muncul pada Recently Used; favorit muncul pada Favorites.
- Kategori buatan pengguna muncul sebagai baris.
- Prompt archived tidak pernah muncul pada baris home.
- Tampilan berfungsi pada desktop dan mobile.

### FR-02 — Hero Prompt

Konten: cover, judul, deskripsi, cuplikan prompt, kategori, tipe output, tombol View Prompt, tombol Copy Prompt.

Aturan pemilihan (fallback berurutan):

1. Prompt dengan `is_featured = true`.
2. Favorit yang paling terakhir digunakan.
3. Prompt terbaru.

Acceptance criteria:

- Hanya satu prompt tampil sebagai hero.
- Hero tidak pernah mengambil prompt archived.
- Copy dari hero menyalin isi lengkap; View Prompt membuka halaman detail.

### FR-03 — Prompt Card

Konten kartu: cover 2:3, judul, cuplikan prompt, kategori, tipe output, tombol Copy, tombol Favorite, more menu (Open Detail, Edit, Duplicate, Set as Featured, Archive, Delete).

Aturan cuplikan:

- Cuplikan diambil server dari awal prompt: `left(prompt_text, 240)`.
- UI menampilkan maksimal 2–3 baris dengan ellipsis.
- Isi asli tidak pernah dipotong di database.

Acceptance criteria:

- Menekan cover atau judul membuka detail; menekan Copy tidak membuka detail.
- Copy mengambil `prompt_text` lengkap lewat alur FR-07, bukan cuplikan.
- Favorite berubah tanpa refresh halaman penuh.
- Kartu memiliki loading dan error state.

### FR-04 — Create Prompt

Field wajib: title (maksimal 120 karakter), prompt_text, output_type.
Field opsional: description, category (maksimal satu), tags, ai_model, cover, favorite, featured.

Nilai awal output_type: Image, Video, Writing, Report, Infographic, Presentation, Coding, Automation, Research, Audio, Other. Daftar dapat diperluas tanpa migrasi (validasi di level aplikasi via Zod).

Validasi (Zod, client dan server):

- Title dan prompt_text tidak boleh kosong; title maksimal 120 karakter.
- Cover harus format gambar yang didukung (lihat FR-08).
- Tag kosong tidak disimpan.

Acceptance criteria:

- Prompt valid tersimpan dan muncul pada Recently Added.
- Tanpa cover custom: sistem memakai template kategori; tanpa template kategori: system default.
- Form menampilkan pesan validasi yang terhubung ke field terkait.

### FR-05 — Prompt Detail

Konten: cover, title, description, prompt lengkap, category, tags, output_type, ai_model, created time, updated time, usage count, last used, status.

Tindakan: Copy, Edit, Duplicate, Favorite, Set as Featured, Replace Cover, Crop Cover, Remove Cover, Archive, Delete Permanently, Export satu prompt.

Acceptance criteria:

- Prompt panjang tampil penuh tanpa terpotong; line break plain text dipertahankan (`white-space: pre-wrap`).
- Copy menyalin isi lengkap termasuk line break.
- Metadata tampil benar; prompt archived punya indikator yang jelas.

### FR-06 — Edit dan Autosave

Perilaku:

- Detail terbuka dalam read-only mode; Edit mengubah field menjadi editable.
- Autosave berjalan 1500 ms setelah pengguna berhenti mengetik (debounce, bukan per keystroke).
- Save manual memaksa penyimpanan segera dan mengembalikan read-only mode, meskipun debounce belum selesai.
- Status yang tampil: Unsaved changes, Saving, Saved, Save failed.

Penanganan kegagalan:

- Isi editor lokal dipertahankan; sistem menawarkan Retry.
- Sistem memperingatkan sebelum halaman ditutup selama penyimpanan gagal.

Catatan: MVP tanpa version history, sehingga autosave menimpa record aktif. Mitigasi: status penyimpanan selalu terlihat dan export JSON berkala.

Acceptance criteria:

- Status Saving dan Saved terlihat; error tidak menutup editor.
- `updated_at` hanya berubah setelah penyimpanan berhasil.

### FR-07 — Copy Prompt

Sumber copy: prompt card, hero, prompt detail, search result.

Alur dari kartu dan hasil pencarian (list tidak memuat full text, lihat §14):

1. Pengguna menekan Copy.
2. Client mengambil `prompt_text` lengkap (`GET /api/prompts/:id`).
3. Teks ditulis ke clipboard.
4. Client mengirim `POST /api/prompts/:id/copy-event` secara fire-and-forget: `usage_count` bertambah satu, `last_used_at` diperbarui.

Aturan:

- Kegagalan tracking (langkah 4) tidak boleh membatalkan atau menunda copy.
- iOS Safari: clipboard write setelah async fetch dapat kehilangan user gesture. Gunakan `ClipboardItem` dengan Promise untuk teks agar penulisan tetap sah di dalam gesture.
- Kegagalan clipboard menampilkan fallback: modal berisi teks penuh yang dapat diseleksi manual.
- Setelah sukses: toast "Prompt copied"; prompt masuk baris Recently Used.

Acceptance criteria:

- Cuplikan kartu tidak pernah memengaruhi isi clipboard; line break dipertahankan.
- Copy berfungsi pada mobile browser, termasuk Safari iOS.
- `usage_count` dan `last_used_at` berubah setelah copy sukses.

### FR-08 — Cover Management

Sumber cover MVP: manual upload, category template, system default. Nilai `ai_generated` reserved untuk fase AI dan tidak dipakai pada MVP.

Operasi: upload, preview, crop, reposition, replace, remove, reset ke template kategori.

Aturan:

- Rasio selalu 2:3.
- Format diterima: JPG, PNG, WebP (AVIF opsional bila pipeline mendukung).
- Batas ukuran upload: 10 MB.
- Validasi server-side: magic bytes (bukan hanya ekstensi), nama file dinormalisasi, metadata EXIF dihapus.
- Server men-generate `poster.webp` (2:3) dan `thumbnail.webp` dengan sharp; tidak memakai Supabase image transformation.
- Replace/remove/delete membersihkan file lama yang tidak terpakai.

Acceptance criteria:

- Crop preview memakai rasio 2:3; cover tidak terdistorsi.
- Replace menghapus referensi dan file cover lama.
- Remove mengembalikan template kategori atau system default.

### FR-09 — Category Management

Field: name, slug, description, template_cover_path, sort_order, show_on_home.

Operasi: create, edit, reorder, hide from home, delete.

Aturan delete: prompt tidak ikut terhapus; `category_id` prompt menjadi NULL (uncategorized); sistem meminta konfirmasi.

Acceptance criteria:

- Kategori baru langsung dapat dipakai saat membuat prompt.
- Kategori dapat memiliki template cover.
- Kategori tersembunyi tidak muncul sebagai baris home tetapi tetap tersedia pada filter.

### FR-10 — Tags

- Satu prompt dapat memiliki banyak tag; tag dibuat saat membuat atau mengedit prompt.
- Tag dipakai untuk search dan filter; filter dapat memakai lebih dari satu tag.
- Keunikan case-insensitive ditegakkan database: unique index pada `lower(name)`.
- Tag kosong tidak disimpan; tag tak terpakai dapat dibersihkan lewat Settings tanpa memengaruhi prompt.

### FR-11 — Search

Scope: title, prompt_text, description, nama kategori, tags, output_type, ai_model. Nama artifact menyusul pada fase artifacts.

Mekanisme (final): `ILIKE` + `pg_trgm` dengan GIN index. Tidak memakai konfigurasi full-text search Postgres (konten campuran Indonesia/Inggris), tidak memakai vector/semantic search. Skala target: 100–1.000 prompt.

Perilaku:

- Search tersedia dari navigasi; input memakai debounce; tidak case-sensitive.
- Archived tidak muncul secara default.
- Keyword disorot bila memungkinkan; hasil berubah tanpa reload penuh.
- Empty state tampil saat tidak ada hasil; query dapat dihapus dengan cepat.

### FR-12 — Filter dan Sort

Filter: category, tag, output type, AI model, favorite, featured, active/archived, has custom cover, uses category template.

Sort: newest, oldest, recently updated, recently used, most used, alphabetical, favorites first.

Acceptance criteria:

- Filter dapat digabungkan; active filters terlihat; semua filter dapat di-reset.
- Filter tetap usable pada mobile (sheet/drawer).

### FR-13 — Favorite

- Toggle dari kartu dan detail; perubahan langsung tanpa refresh penuh.
- Status konsisten antara home dan detail; favorite tidak mengubah kategori.
- Favorit yang archived tidak tampil pada home utama.

### FR-14 — Featured Prompt

- Hanya satu prompt `is_featured = true` pada satu waktu.
- Mekanisme: partial unique index (`WHERE is_featured = true`); menetapkan featured baru menonaktifkan featured lama dalam satu transaksi.
- Prompt archived tidak dapat dijadikan featured; mengarsipkan atau menghapus featured memicu fallback hero FR-02.

### FR-15 — Archive

- Archive mengeluarkan prompt dari home, hero, dan hasil search default.
- Prompt tetap dapat ditemukan pada `/archived` dan dapat di-restore menjadi active.
- Archive tidak menghapus data; archived tidak tampil pada Recently Added.

### FR-16 — Permanent Delete

- Delete permanen dengan confirmation modal yang menampilkan judul prompt.
- Yang dihapus: record prompt, relasi tag, file cover custom, metadata terkait.
- Sistem menampilkan error bila delete gagal; tidak ada fitur restore.

### FR-17 — Duplicate Prompt

Duplicate membuat record baru: judul berakhiran "Copy", prompt_text, description, category, tags, dan output_type sama, favorite false, featured false, usage_count nol. File cover disalin ke folder prompt baru (bukan referensi bersama) agar penghapusan salah satu tidak merusak yang lain.

Acceptance criteria: prompt asli tidak berubah; record baru memiliki ID berbeda dan langsung dapat diedit.

### FR-18 — Export JSON

Isi: export metadata, schema version, timestamp, seluruh prompt (active dan archived), categories, tags, settings yang aman diekspor.

Tidak diekspor: API key, service key, secret configuration, file binary cover (cover direpresentasikan lewat path dan metadata).

Nama file: `prompt-library-export-YYYY-MM-DD.json` (contoh: `prompt-library-export-2026-07-21.json`).

Acceptance criteria: file JSON valid dan dapat dibaca kembali oleh fitur import pada masa depan.

### FR-19 — Prompt Variables (opsional, default off)

Saat diaktifkan per prompt: sistem mendeteksi `{{variable}}`, menampilkan form pengisian, menyediakan preview hasil akhir, dan Copy memakai prompt yang sudah terisi. Prompt asli tidak berubah; pengguna dapat memilih copy raw atau rendered; variable kosong divalidasi. Implementasi masuk P1.

### FR-20 — AI Features (opsional, default off)

Nonaktif selama provider belum dikonfigurasi. Kemampuan: generate title, description, tags, category suggestion, output type detection, improve prompt, variations, generate cover.

Job status: idle, queued, generating, completed, failed, cancelled. Error handling: retry, pesan error, response code provider dicatat pada log server, secret tidak pernah dikirim ke client, rate limit ringan.

Provider abstraction: setiap provider mengikuti interface umum (provider name, model, capability, request, response, cost metadata, error mapping). API key milik aplikasi atau milik pengguna; provider dapat diganti atau ditambah tanpa mengubah struktur utama aplikasi. Implementasi masuk P2.

## 7. Database Requirements

### 7.1 Table: prompts

```
id            uuid primary key
title         text not null            -- maks 120 karakter (validasi aplikasi)
prompt_text   text not null
description   text
category_id   uuid references categories(id) on delete set null
output_type   text not null
ai_model      text
cover_path    text
cover_source  text                     -- upload | category_template | system_default | ai_generated (reserved)
is_favorite   boolean default false
is_featured   boolean default false
status        text default 'active'    -- check: active | archived
usage_count   integer default 0
last_used_at  timestamptz
created_at    timestamptz default now()
updated_at    timestamptz default now()
```

### 7.2 Table: categories

```
id                   uuid primary key
name                 text unique not null
slug                 text unique not null
description          text
template_cover_path  text
sort_order           integer default 0
show_on_home         boolean default true
created_at           timestamptz default now()
updated_at           timestamptz default now()
```

### 7.3 Table: tags

```
id          uuid primary key
name        text not null              -- unik case-insensitive via index lower(name)
slug        text unique not null
created_at  timestamptz default now()
```

### 7.4 Table: prompt_tags

```
prompt_id  uuid references prompts(id) on delete cascade
tag_id     uuid references tags(id) on delete cascade
primary key (prompt_id, tag_id)
```

### 7.5 Table: app_settings

Singleton: selalu tepat satu baris, pola read-or-create.

```
id                        uuid primary key
prompt_variables_enabled  boolean default false
ai_features_enabled       boolean default false
ai_provider               text
created_at                timestamptz default now()
updated_at                timestamptz default now()
```

API key tidak pernah disimpan sebagai plain text pada tabel ini; dikelola lewat environment secret.

### 7.6 Constraint dan index wajib

```
create unique index one_featured_prompt on prompts (is_featured) where is_featured = true;
create unique index tags_name_ci on tags (lower(name));
alter table prompts add constraint prompts_status_check check (status in ('active','archived'));

-- pg_trgm untuk search:
create extension if not exists pg_trgm;
create index prompts_title_trgm on prompts using gin (title gin_trgm_ops);
create index prompts_text_trgm  on prompts using gin (prompt_text gin_trgm_ops);
create index prompts_desc_trgm  on prompts using gin (description gin_trgm_ops);
```

`updated_at` diperbarui oleh server pada setiap write yang berhasil. Seluruh perubahan schema berjalan lewat migrations (`supabase/migrations/`).

### 7.7 Future table: prompt_artifacts

Tidak dibuat pada MVP. Struktur disiapkan untuk fase artifacts: id, prompt_id, artifact_type (image | video | external_link | ai_text | report | file | other), title, external_url, thumbnail_url, text_content, metadata jsonb, created_at, updated_at.

## 8. Storage Requirements

Bucket privat `prompt-covers` (bukan public bucket).

```
prompt-covers/
└── prompts/
    └── {prompt_id}/
        ├── original.{ext}
        ├── poster.webp      -- 2:3
        └── thumbnail.webp   -- dipakai katalog/home
```

Aturan: original boleh dipertahankan; poster dan thumbnail digenerate sharp di server; file diserve lewat signed URL; file lama dibersihkan setelah replace, remove, atau delete; seluruh upload divalidasi server-side.

## 9. API Requirements

Seluruh endpoint berjalan server-side dengan service-role client.

```
GET    /api/prompts
POST   /api/prompts
GET    /api/prompts/:id
PATCH  /api/prompts/:id
DELETE /api/prompts/:id
POST   /api/prompts/:id/copy-event      -- fire-and-forget dari client
POST   /api/prompts/:id/duplicate
POST   /api/prompts/:id/archive
POST   /api/prompts/:id/restore

GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id

POST   /api/prompts/:id/cover
DELETE /api/prompts/:id/cover
POST   /api/prompts/:id/cover/reset

GET    /api/export/json
```

Endpoint AI (fase P2): `POST /api/ai/title`, `/api/ai/description`, `/api/ai/tags`, `/api/ai/improve`, `/api/ai/cover`, `GET /api/ai/jobs/:id`.

## 10. Security Requirements

1. RLS aktif pada semua tabel dengan nol policy (deny-all). Seluruh baca/tulis lewat route handler atau server action memakai service-role client. Anon key tidak dipakai untuk akses data.
2. `SUPABASE_SERVICE_ROLE_KEY` hanya ada di server: tidak pernah masuk bundle client, log, API response, atau export.
3. Deployment privat: lokal, atau Vercel dengan Basic Auth middleware (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` via env). Deployment publik tanpa proteksi dilarang.
4. File upload divalidasi server-side; nama file dinormalisasi; metadata berbahaya dihapus.
5. Query terparameterisasi; tidak ada raw SQL dari input pengguna.
6. API response tidak boleh mengandung secret; export tidak memuat credential.
7. Endpoint delete membutuhkan konfirmasi dari client.
8. CORS dibatasi sesuai deployment; rate limit ringan pada operasi AI (fase P2).
9. `.env*` tidak pernah di-commit.

Catatan: single-user tanpa login bukan berarti aman secara otomatis. Keamanan MVP bergantung pada private deployment ditambah postur server-only di atas.

## 11. UX States

Setiap halaman memiliki: loading state, empty state, error state, success feedback, dan feedback offline/kegagalan koneksi.

- Empty home: "Your prompt library is empty." dengan tindakan "Add your first prompt."
- Empty search: "No prompts match your search." dengan tindakan clear filters, edit query, atau add new prompt.

Urutan fallback cover (MVP):

1. Uploaded cover.
2. Category template.
3. System default.

AI-generated cover masuk urutan ini hanya setelah fase AI aktif.

## 12. Arah Visual dan Responsive Requirements

Arah visual: background near-black dengan tint emerald/teal sangat gelap; aksen mint/cyan untuk aksi utama dan elemen aktif; teks putih untuk judul, abu-abu terang untuk informasi sekunder; headline serif, body/navigasi/form/data sans-serif; glassmorphism dan bentuk fluid/glow hanya sebagai aksen pada permukaan sekunder; dark space dijaga agar antarmuka lapang. Inspirasi umum Hyperliquid tanpa menyalin identitas atau layout. Semua kartu memakai rasio poster 2:3; cover rasio lain dapat dipotong, direposisi, dipreview, dan disimpan dalam ukuran teroptimasi.

- Desktop: hero penuh, baris kategori horizontal, hover interaction, side/top navigation, detail dua kolom.
- Tablet: hero lebih ringkas, carousel horizontal, detail dua kolom sempit.
- Mobile: hero stack vertikal, detail satu kolom, tombol Copy mudah dijangkau, touch target minimal 44 × 44 px, search dan filter lewat sheet/drawer, semua aksi hover punya alternatif tap.

## 13. Accessibility Requirements

Kontras teks minimal WCAG AA; seluruh tindakan dapat dilakukan dengan keyboard pada desktop; focus state terlihat; cover memiliki alt text; tombol icon memiliki accessible label; status autosave diumumkan secara nonintrusif (aria-live polite); form error terhubung ke field terkait; animasi mengikuti preferensi reduced motion.

## 14. Performance Requirements

- Home usable sekitar 2,5 detik pada koneksi wajar.
- Search terasa instan untuk 100–1.000 prompt.
- Cover lazy load; katalog memakai thumbnail; hero image diprioritaskan.
- Query list tidak pernah mengambil `prompt_text` penuh. Kartu mengambil: id, title, excerpt (`left(prompt_text, 240)`), cover path, category, output_type, favorite status, usage metadata.
- Prompt lengkap diambil on-demand: saat detail dibuka atau saat copy (FR-07).

## 15. Analytics Internal

Tanpa platform analytics eksternal. Data internal yang dicatat: usage_count, last_used_at, created_at, updated_at, favorite, featured.

Fase berikutnya: prompt paling sering digunakan, kategori paling aktif, search tanpa hasil, prompt yang tidak pernah digunakan, aktivitas per periode.

## 16. MVP Prioritization

**P0 — Wajib:** create prompt, read prompt, edit prompt, autosave, manual save, delete, archive, home catalog, prompt detail, copy full prompt, category, tags, cover upload, category cover template, search, filter, favorite, featured hero, responsive design, Supabase database, Supabase Storage, JSON export, private deployment.

**P1 — Setelah fondasi stabil:** duplicate, category reorder, cover crop improvement, keyboard shortcut, bulk actions, prompt variables, better backup workflow.

**P2 — Fase lanjutan:** AI assistant, AI cover, artifacts, Google Drive links, authentication, workspace, role dan permission, version history, import, sharing.

## 17. Delivery Milestones

- **M1 — Foundation:** scaffold Next.js, Supabase project, migrations, storage bucket, deployment lokal, app shell, design tokens.
- **M2 — Prompt CRUD:** create, detail, edit, autosave, delete, archive.
- **M3 — Catalog Experience:** hero, prompt cards, category rows, favorites, recently used, copy tracking. Memakai placeholder cover hasil generate.
- **M4 — Discovery:** search, filter, sort, category management, tag management.
- **M5 — Media dan Backup:** cover upload, crop, template covers, export JSON.
- **M6 — Stabilization:** responsive testing, accessibility, performance, error handling, security review, UAT.

## 18. Definition of Done MVP

MVP dinyatakan selesai ketika:

1. Seluruh requirement P0 tersedia.
2. Pengguna dapat mengelola minimal 1.000 prompt tanpa gangguan utama.
3. Seluruh prompt dapat diekspor sebagai JSON.
4. Copy selalu mengambil prompt lengkap, termasuk pada Safari iOS.
5. Autosave memiliki status yang terlihat.
6. Cover tampil konsisten dalam rasio 2:3.
7. Home usable di desktop dan mobile.
8. Tidak ada service-role key pada client.
9. Deployment tidak dapat diakses publik tanpa perlindungan.
10. Error utama memiliki pesan dan recovery action.
11. Data tidak hilang pada refresh setelah penyimpanan berhasil.
12. Seluruh skenario UAT §19 lolos.

## 19. UAT Scenarios

- **UAT-01 — Create.** Membuat prompt baru dengan cover dan kategori; prompt tampil pada Recently Added.
- **UAT-02 — Copy.** Copy dari kartu; seluruh prompt masuk clipboard; usage count bertambah.
- **UAT-03 — Long prompt.** Prompt panjang tampil sebagai cuplikan di home dan lengkap di detail.
- **UAT-04 — Edit.** Mengubah isi prompt; autosave berjalan; status Saved muncul.
- **UAT-05 — Manual save.** Save ditekan sebelum debounce selesai; data langsung tersimpan.
- **UAT-06 — Search.** Kata yang hanya ada pada isi prompt berhasil ditemukan.
- **UAT-07 — Filter.** Kombinasi kategori, tag, dan output type memberi hasil sesuai seluruh filter.
- **UAT-08 — Cover fallback.** Prompt tanpa cover custom memakai template kategori.
- **UAT-09 — Delete.** Hapus dengan konfirmasi; prompt dan cover custom hilang permanen.
- **UAT-10 — Export.** File JSON valid berisi seluruh prompt termasuk archived.
- **UAT-11 — Mobile.** Lewat mobile browser (termasuk Safari iOS): cari prompt, buka detail, copy berhasil.
- **UAT-12 — Failure recovery.** Autosave gagal karena jaringan; isi editor bertahan; Retry tersedia.

## 20. Technical Decisions (Locked)

| Area | Keputusan |
|---|---|
| Framework | Next.js (App Router) |
| Bahasa | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage (bucket privat + signed URL) |
| Validasi | Zod (schema dibagi client + server) |
| Image processing | sharp (server-side) |
| Search | ILIKE + pg_trgm (tanpa FTS config, tanpa vector DB) |
| Cropper | react-easy-crop atau setara, rasio terkunci 2:3 |
| Icons | SVG, lucide-react |
| Font | Fraunces (serif, headline) + Inter (sans, body/UI), via design tokens |
| Deployment | Lokal → Vercel + Basic Auth middleware |

## 21. Keputusan Terbuka v0.1 yang Kini Ditutup

1. Nama produk: **Prompt Library Dashboard** (working name; mengganti nama tidak berdampak teknis).
2. Framework frontend: Next.js App Router + TypeScript.
3. Platform deployment: lokal dahulu; online via Vercel + Basic Auth middleware.
4. Batas panjang title: 120 karakter.
5. Batas ukuran cover: 10 MB.
6. Kategori awal: Image Generation, Video, Writing & Reports, Infographics & Presentations, Coding & Automation, Research. Pengguna bebas menambah atau mengubah.
7. Font: Fraunces + Inter, dikelola lewat design tokens sehingga dapat diganti tanpa menyentuh komponen.
8. Gaya template cover kategori: gradient deterministik dari warna kategori + nama kategori, digenerate sistem; berfungsi ganda sebagai placeholder sebelum M5. Detail visual difinalkan bersama design tokens pada M1.
9. Format icon: SVG (lucide-react).
10. Durasi debounce autosave: 1500 ms.
11. Export JSON menyertakan archived prompt: ya, secara default.

---

*Dokumen ini menggantikan PRD v0.1. Pra-Kickoff v0.1 berstatus arsip. Aturan operasional untuk agen coding ada pada `CLAUDE.md` di root repo, yang merujuk dokumen ini sebagai source of truth.*
