# Update Feature: Bulk Import Prompt via Excel with AI-Generated Metadata

## 1. Ringkasan

Tambahkan fitur **Bulk Import Prompt melalui Excel** ke aplikasi Prompt Library yang sudah selesai dikembangkan dan sudah di-deploy.

Pada fitur ini, pengguna hanya perlu mengisi satu kolom di Excel:

```text
prompt_text
```

Setiap baris mewakili satu prompt lengkap.

Metadata lain akan dibuat otomatis oleh AI berdasarkan isi prompt, meliputi:

- Title
- Description
- Category
- Output type
- AI model
- Tags
- Variables enabled
- Cover mode
- Review status

Sebelum data disimpan ke Supabase, aplikasi harus menampilkan preview agar pengguna dapat memeriksa dan mengedit metadata hasil AI.

---

## 2. Tujuan

Fitur ini bertujuan untuk:

1. Mempercepat penambahan prompt dalam jumlah banyak.
2. Mengurangi kebutuhan pengisian metadata secara manual.
3. Memastikan hasil klasifikasi AI dapat ditinjau sebelum masuk database.
4. Menjaga konsistensi kategori, tipe output, tag, dan model AI.
5. Mencegah prompt duplikat.
6. Tetap menggunakan pola arsitektur, komponen UI, dan convention yang sudah ada di repository.

---

## 3. Instruksi Awal untuk Implementasi

Sebelum melakukan perubahan:

1. Pelajari struktur repository dan arsitektur aplikasi.
2. Identifikasi:
   - Framework frontend dan backend.
   - Struktur routing.
   - Supabase client dan server configuration.
   - Struktur tabel `prompts`, `categories`, `tags`, dan `prompt_tags`.
   - Pola komponen UI.
   - Sistem API atau server action.
   - Provider AI yang sudah tersedia.
   - Sistem toast, modal, loading, dan error handling.
3. Jangan mengganti arsitektur atau library utama tanpa alasan yang diperlukan.
4. Gunakan naming convention, component structure, dan design system yang sudah ada.
5. Buat implementation plan berdasarkan kondisi repository aktual sebelum mulai coding.

---

## 4. Format File Excel

### 4.1 Nama sheet

Importer hanya membaca sheet:

```text
Prompts_Input
```

### 4.2 Header wajib

```text
prompt_text
```

### 4.3 Area data

Data dimulai dari:

```text
Prompts_Input!A2:A
```

### 4.4 Contoh

| prompt_text |
|---|
| Create a structured market trends report for the renewable energy industry... |
| Design an n8n workflow for invoice processing... |
| A cinematic portrait of a man standing under the rain... |

### 4.5 Aturan parsing

- Hanya menerima file `.xlsx`.
- Abaikan sheet selain `Prompts_Input`.
- Abaikan baris kosong.
- Pertahankan line break di dalam prompt.
- Hapus whitespace hanya pada awal dan akhir isi sel.
- Jangan memotong isi prompt.
- Jangan mengeksekusi macro.
- Jangan membaca external workbook links.
- Formula Excel tidak boleh dipercaya sebagai sumber input.
- Default maksimum 1.000 prompt per file.
- Batas maksimum harus configurable.

---

## 5. User Flow

```text
User membuka halaman All Prompts atau Settings
    ↓
User menekan Import Excel
    ↓
User memilih file .xlsx
    ↓
Aplikasi membaca prompt_text
    ↓
Aplikasi memvalidasi file dan prompt
    ↓
Aplikasi mendeteksi prompt duplikat
    ↓
AI menghasilkan metadata setiap prompt
    ↓
Aplikasi menampilkan preview
    ↓
User mengedit dan memilih data
    ↓
User menekan Confirm Import
    ↓
Data disimpan ke Supabase
    ↓
Aplikasi menampilkan hasil import
```

---

## 6. Lokasi dan UI

Tambahkan tombol:

```text
Import Excel
```

Tempatkan pada lokasi yang paling sesuai dengan UI existing, misalnya:

- Halaman All Prompts.
- Dropdown Add Prompt.
- Halaman Settings.

Gunakan modal atau halaman khusus dengan tahapan:

1. Upload
2. Processing
3. Review
4. Importing
5. Result

---

## 7. Tahap Upload

Tampilkan:

- Drag-and-drop area.
- Tombol pilih file.
- Nama file.
- Ukuran file.
- Tombol `Validate and Generate Metadata`.
- Tombol atau link `Download Excel Template`.

Validasi awal:

- Ekstensi harus `.xlsx`.
- Sheet `Prompts_Input` harus tersedia.
- Header `prompt_text` harus tersedia.
- File tidak boleh kosong.
- Jumlah prompt tidak boleh melebihi batas.
- Prompt kosong diabaikan.
- Prompt duplikat di dalam file ditandai.

---

## 8. Tahap Processing

Tampilkan status proses:

```text
Reading Excel
Checking duplicates
Generating metadata
Preparing preview
```

Jika memungkinkan, gunakan progress indicator yang mencerminkan progres aktual.

Jangan hanya menampilkan loading generik untuk proses yang panjang.

---

## 9. Struktur Metadata Hasil AI

Gunakan struktur sejenis berikut dan sesuaikan dengan naming convention codebase:

```typescript
interface GeneratedPromptMetadata {
  sourceRow: number;
  promptText: string;

  title: string;
  description: string;

  category: {
    name: string;
    matchType: "existing" | "proposed";
    confidence: number;
  };

  outputType: {
    value:
      | "Image"
      | "Video"
      | "Writing"
      | "Report"
      | "Infographic"
      | "Presentation"
      | "Coding"
      | "Automation"
      | "Research"
      | "Audio"
      | "Other";
    confidence: number;
  };

  aiModel: {
    value: string | null;
    confidence: number;
  };

  tags: string[];
  variablesEnabled: boolean;

  coverMode: "CATEGORY_TEMPLATE" | "SYSTEM_DEFAULT";

  reviewStatus:
    | "READY"
    | "NEEDS_REVIEW"
    | "ERROR"
    | "DUPLICATE";

  warnings: string[];
}
```

---

## 10. Aturan AI Enrichment

### 10.1 Title

- Singkat dan deskriptif.
- Menggunakan bahasa dominan prompt.
- Hindari judul terlalu generik seperti `AI Prompt`.
- Maksimal sekitar 100–150 karakter.

### 10.2 Description

- Satu sampai dua kalimat.
- Menjelaskan fungsi prompt.
- Tidak mengulang seluruh isi prompt.
- Menggunakan bahasa yang sama dengan prompt.

### 10.3 Category

AI harus memilih kategori dari daftar kategori aktif yang sudah ada.

Flow:

```text
Ambil kategori aktif dari Supabase
    ↓
Kirim kategori sebagai opsi ke AI
    ↓
AI memilih kategori terbaik
    ↓
Jika tidak ada yang cocok, AI mengusulkan kategori baru
```

Hasil kategori harus memiliki:

- `name`
- `matchType`
- `confidence`

Aturan:

- Pencocokan case-insensitive.
- Trim whitespace.
- Hindari kategori duplikat.
- Gunakan `Uncategorized` sebagai fallback terakhir.
- Kategori baru tidak boleh langsung dibuat sebelum dikonfirmasi pengguna.

### 10.4 Output Type

AI hanya boleh memilih salah satu:

```text
Image
Video
Writing
Report
Infographic
Presentation
Coding
Automation
Research
Audio
Other
```

Jika confidence rendah:

- Gunakan `Other`.
- Tandai row sebagai `NEEDS_REVIEW`.

### 10.5 AI Model

Isi hanya jika prompt jelas diarahkan ke provider atau model tertentu.

Contoh:

- ChatGPT
- Claude
- Gemini
- GPT Image
- Midjourney
- Stable Diffusion
- Veo
- Runway

Aturan:

- `n8n` bukan AI model.
- Jika prompt AI-agnostic, isi `null`.
- Jangan memaksakan model jika confidence rendah.

### 10.6 Tags

- Buat 3–8 tag.
- Gunakan tag singkat.
- Normalisasi kapitalisasi.
- Jangan membuat duplikat.
- Hindari tag terlalu umum seperti `ai` atau `prompt`.
- Jangan mengulang kategori sebagai tag jika tidak diperlukan.

### 10.7 Variables Enabled

Set `true` jika prompt memiliki placeholder seperti:

```text
{{topic}}
{{industry}}
{{style}}
```

Jika tidak ada placeholder, set `false`.

### 10.8 Cover Mode

Default:

```text
CATEGORY_TEMPLATE
```

Jika kategori tidak memiliki template cover:

```text
SYSTEM_DEFAULT
```

AI-generated cover tidak termasuk dalam scope fitur ini.

---

## 11. Prompt Sistem untuk AI Enrichment

Gunakan structured output atau JSON schema jika provider mendukung.

Contoh system instruction:

```text
You are a metadata classification service for a prompt library.

Analyze one AI prompt and return structured metadata.

Requirements:
- Preserve the original prompt without rewriting it.
- Generate a concise title.
- Generate a one-to-two sentence description.
- Select the best category from the supplied existing categories.
- Propose a new category only when no existing category is suitable.
- Select exactly one allowed output type.
- Recommend an AI model only when the prompt clearly targets a specific model or provider.
- Generate 3–8 concise normalized tags.
- Detect whether the prompt contains {{variable}} placeholders.
- Return confidence scores from 0 to 1.
- Return valid JSON only.
- Do not include markdown.
```

Input AI harus berisi:

- Original prompt.
- Existing categories.
- Allowed output types.
- Existing AI models jika tersedia.

AI tidak boleh mengubah isi prompt asli.

---

## 12. Batch Processing

Jangan mengirim seluruh prompt dalam satu request.

Rekomendasi:

- AI concurrency: 3–10 request bersamaan.
- Database batch: 100–200 record.
- Gunakan retry terbatas.
- Gunakan exponential backoff jika sesuai.
- Jangan retry tanpa batas.
- Setiap prompt diproses secara independen.

Jika satu prompt gagal:

- Prompt lain tetap dilanjutkan.
- Row diberi status `ERROR`.
- Tampilkan tombol `Retry`.
- Seluruh proses tidak boleh gagal hanya karena satu row.

---

## 13. Duplicate Detection

### 13.1 Duplicate dalam file

Untuk keperluan hash:

1. Trim prompt.
2. Normalisasi line ending.
3. Collapse whitespace.
4. Buat hash dari hasil normalisasi.

Jangan mengubah prompt asli yang disimpan.

Jika hash yang sama muncul lebih dari sekali:

```text
reviewStatus = DUPLICATE
```

### 13.2 Duplicate di database

Bandingkan hash prompt dengan data existing.

Jika tabel belum memiliki field sejenis, pertimbangkan migration:

```sql
alter table prompts
add column if not exists prompt_hash text;

create index if not exists idx_prompts_prompt_hash
on prompts(prompt_hash);
```

Jangan menambahkan migration jika field dengan fungsi sama sudah tersedia.

Pilihan untuk duplicate database:

- Skip.
- Import anyway.
- Open existing prompt.

Default:

```text
Skip
```

Semantic duplicate detection tidak termasuk scope MVP.

---

## 14. Preview dan Review

Setelah enrichment selesai, tampilkan tabel atau card editor.

Kolom minimum:

- Checkbox import.
- Source row.
- Title.
- Prompt excerpt.
- Description.
- Category.
- Output type.
- AI model.
- Tags.
- Variables enabled.
- Status.
- Warnings.
- Action.

Aturan:

- Seluruh metadata hasil AI dapat diedit.
- Prompt original dapat dilihat melalui expandable panel atau modal.
- User dapat memilih row yang akan di-import.
- Row error tidak dipilih secara default.

Tampilkan summary:

```text
Total prompts
Ready
Needs review
Duplicate
Error
Selected for import
```

Filter:

- All
- Ready
- Needs Review
- Duplicate
- Error

Bulk actions:

- Select all ready.
- Deselect all.
- Set category.
- Set output type.
- Retry failed AI generation.
- Skip duplicates.

---

## 15. Confidence Rules

Threshold harus configurable.

Rekomendasi awal:

```text
confidence >= 0.80 → READY
confidence 0.50–0.79 → NEEDS_REVIEW
confidence < 0.50 → NEEDS_REVIEW dengan warning
```

Category dan output type adalah field kritis.

Jika salah satu field kritis memiliki confidence di bawah threshold, row harus berstatus `NEEDS_REVIEW`.

Status `READY` tidak berarti langsung masuk database. User tetap harus mengonfirmasi.

---

## 16. Kategori Baru

Jika AI mengusulkan kategori baru:

- Tampilkan badge `New category`.
- User dapat:
  - Menyetujui kategori baru.
  - Mengganti dengan kategori existing.
  - Menggabungkan beberapa usulan kategori.
- Category baru dibuat sebelum prompt di-insert.
- Generate slug menggunakan utility existing.
- Hindari duplicate kategori case-insensitive.

Default category baru:

```text
show_on_home = true
template_cover_path = null
```

Prompt pada kategori baru menggunakan system default cover.

---

## 17. Commit Import

Setelah user menekan `Confirm Import`:

1. Validasi ulang selected rows di server.
2. Buat kategori baru yang disetujui.
3. Map category name ke `category_id`.
4. Insert prompt dalam batch.
5. Buat atau gunakan tag existing.
6. Buat relasi `prompt_tags`.
7. Tentukan cover source.
8. Simpan prompt hash.
9. Kembalikan hasil per row.

Gunakan transaction pada unit yang sesuai.

Jangan membiarkan relasi parsial tanpa error yang jelas.

---

## 18. Default Data

Field yang tidak dibuat AI menggunakan default:

```typescript
isFavorite = false;
isFeatured = false;
status = "active";
usageCount = 0;
lastUsedAt = null;
coverMode = categoryHasTemplate
  ? "CATEGORY_TEMPLATE"
  : "SYSTEM_DEFAULT";
```

---

## 19. API atau Server Actions

Sesuaikan dengan pola codebase.

Rekomendasi endpoint:

```text
POST /api/import/prompts/parse
POST /api/import/prompts/enrich
POST /api/import/prompts/retry
POST /api/import/prompts/commit
```

Alternatif server actions:

```text
parsePromptExcel()
enrichPromptRows()
retryPromptEnrichment()
commitPromptImport()
```

### Parse response

```typescript
interface ParseImportResponse {
  sessionId: string;
  fileName: string;
  totalRows: number;
  validPromptRows: number;
  emptyRows: number;
  duplicatesInFile: number;
  rows: ParsedPromptRow[];
}
```

### Commit response

```typescript
interface ImportResult {
  totalSelected: number;
  created: number;
  skipped: number;
  duplicates: number;
  failed: number;
  categoriesCreated: number;

  rows: Array<{
    sourceRow: number;
    status: "CREATED" | "SKIPPED" | "FAILED";
    promptId?: string;
    message?: string;
  }>;
}
```

---

## 20. Import Session

Jika enrichment memerlukan waktu panjang atau preview dipisahkan dari upload, gunakan import session.

Data minimal:

- Session ID.
- File name.
- Processing status.
- Parsed rows.
- Generated metadata.
- Error message.
- Created time.
- Expiration time.

Session dapat disimpan di:

- Memory server sementara.
- Database.
- Storage sementara.

Pilih yang paling sesuai dengan arsitektur existing.

Jangan menyimpan file Excel lebih lama dari yang diperlukan.

---

## 21. Security

- Validasi MIME type dan extension.
- Batasi ukuran file.
- Jangan mengeksekusi macro.
- Jangan membaca external workbook links.
- Jangan mempercayai formula.
- Escape output sebelum dirender.
- AI API key hanya berada di server.
- Supabase service-role key tidak boleh masuk client.
- Terapkan timeout parsing dan AI request.
- Jangan log seluruh prompt jika log bisa diakses publik.
- Jangan tampilkan raw provider error yang mengandung secret.
- Gunakan proteksi deployment yang sudah ada.

---

## 22. Error Handling

Gunakan pesan yang spesifik.

Contoh:

```text
Sheet "Prompts_Input" was not found.
Column "prompt_text" was not found.
No prompts were found in the uploaded file.
The file contains more than 1,000 prompts.
Metadata generation failed. Retry this row.
This prompt already exists in your library.
The suggested category needs review.
Import completed with some failed rows.
```

Hindari pesan generik seperti:

```text
Something went wrong
```

jika penyebab dapat diketahui.

---

## 23. Result Screen

Setelah import selesai, tampilkan:

```text
Import completed

Created: 94
Skipped: 4
Duplicates: 3
Failed: 2
New categories: 2
```

Actions:

- View imported prompts.
- Retry failed rows.
- Download error report.
- Start another import.
- Close.

Prompt yang berhasil dibuat harus langsung tampil setelah cache atau data direfresh.

---

## 24. Excel Template Download

Tambahkan file template ke folder static/public.

Nama rekomendasi:

```text
Prompt_Library_AI_Enrichment_Import_Template.xlsx
```

Tombol:

```text
Download Excel Template
```

Importer hanya boleh membaca:

```text
Prompts_Input
```

dan kolom:

```text
prompt_text
```

Sheet panduan dan contoh tidak boleh ikut diproses.

---

## 25. Out of Scope

Jangan implementasikan pada update ini:

- AI-generated cover.
- Penyimpanan artifact hasil prompt.
- Import gambar embedded dari Excel.
- Public sharing.
- Workspace multi-user.
- Semantic duplicate detection.
- Import CSV.
- Perubahan besar pada Prompt Detail.
- Perubahan besar pada design system.
- Export enrichment ke Excel, kecuali sangat mudah dan tidak memperbesar scope.

---

## 26. Testing

Tambahkan test sesuai pola repository.

### 26.1 Parser tests

- File valid.
- Sheet tidak ditemukan.
- Header tidak ditemukan.
- Baris kosong.
- Prompt multi-line.
- Duplicate dalam file.
- Jumlah melebihi batas.
- File bukan `.xlsx`.

### 26.2 AI enrichment tests

- Structured response valid.
- Invalid JSON dari provider.
- Category confidence rendah.
- Output type di luar enum.
- AI model tidak diketahui.
- Placeholder `{{variable}}` terdeteksi.
- Retry ketika provider gagal.

### 26.3 Import tests

- Membuat kategori baru.
- Menggunakan kategori existing.
- Membuat tag baru.
- Menggunakan tag existing.
- Skip duplicate.
- Partial AI failure.
- Batch insert.
- Prompt hash tersimpan.
- Category template cover digunakan.
- System default digunakan.

### 26.4 UI tests

- Upload file.
- Processing state.
- Preview editing.
- Filter review status.
- Retry row.
- Confirm import.
- Result summary.
- Mobile responsive layout.

---

## 27. Acceptance Criteria

Fitur dianggap selesai jika:

1. Pengguna dapat mengunduh template Excel.
2. Pengguna hanya perlu mengisi kolom `prompt_text`.
3. Pengguna dapat mengunggah file `.xlsx`.
4. Sistem hanya membaca sheet `Prompts_Input`.
5. Sistem mengabaikan baris kosong.
6. Sistem mendeteksi prompt duplikat.
7. AI membuat title, description, category, output type, AI model, tags, dan variables enabled.
8. Metadata AI tervalidasi.
9. User dapat mengedit metadata pada preview.
10. Confidence rendah ditandai `NEEDS_REVIEW`.
11. Kategori baru tidak dibuat tanpa konfirmasi user.
12. AI failure pada satu row tidak menggagalkan seluruh proses.
13. User dapat memilih row yang akan di-import.
14. Prompt yang disetujui masuk Supabase.
15. Tag dan relasi prompt-tag tersimpan.
16. Cover memakai category template atau system default.
17. Prompt original tersimpan utuh dengan line break.
18. UI responsive pada desktop dan mobile.
19. Hasil import menampilkan summary.
20. Tidak ada regression pada fitur existing.

---

## 28. Urutan Implementasi yang Diharapkan

1. Inspect repository.
2. Jelaskan temuan arsitektur.
3. Buat implementation plan.
4. Sebutkan file yang akan diubah.
5. Buat migration jika diperlukan.
6. Implementasikan Excel parser.
7. Implementasikan duplicate detection.
8. Implementasikan AI enrichment service.
9. Implementasikan preview dan editing UI.
10. Implementasikan commit import.
11. Tambahkan test.
12. Jalankan lint, type-check, test, dan build.
13. Perbaiki error.
14. Berikan ringkasan implementasi.

---

## 29. Output Akhir yang Diharapkan dari Claude Code

Setelah implementasi, tampilkan:

- Daftar file baru.
- Daftar file yang diperbarui.
- Migration yang ditambahkan.
- Environment variable baru.
- Cara menggunakan fitur.
- Cara menguji fitur.
- Keputusan teknis.
- Asumsi.
- Hal yang belum dapat diselesaikan.

Jangan hanya memberikan pseudocode atau contoh kode. Terapkan perubahan langsung pada repository sesuai arsitektur aplikasi yang sudah ada.
