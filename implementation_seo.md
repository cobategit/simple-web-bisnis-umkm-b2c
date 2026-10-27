# Rencana Implementasi SEO Google untuk Website Public

Rencana ini mencakup implementasi menyeluruh penerapan SEO Google pada website public DR Printing (Frontend React PWA + Backend Go + Nginx).

## User Review Required

> [!NOTE]
>
> - URL Canonical dan Sitemap akan mendeteksi domain secara dinamis (menggunakan origin request saat ini atau konfigurasi `FRONTEND_ORIGIN`).
> - Schema JSON-LD yang diterapkan berstandar [Schema.org](https://schema.org) yang direkomendasikan Google (`PrintShop`/`LocalBusiness`, `Product`, `Article`, dan `BreadcrumbList`).

---

## Proposed Changes

### 1. Frontend: Dynamic Head, Open Graph & Structured Data (JSON-LD)

#### [NEW] [SEO.tsx](file:///Users/user/project/printing-pwa-cms/frontend/src/components/SEO.tsx)

- Membuat komponen reusable `SEO` untuk memanipulasi dan menyinkronkan:
  - `<title>`
  - `<meta name="description">`
  - `<link rel="canonical">`
  - Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`)
  - Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`)
  - `<script type="application/ld+json">` untuk Schema Structured Data (dengan pembersihan otomatis saat navigasi berpindah rute).

#### [MODIFY] [HomePage.tsx](file:///Users/user/project/printing-pwa-cms/frontend/src/pages/public/HomePage.tsx)

- Menambahkan metadata SEO untuk Beranda:
  - Title: `{BusinessName} - {Tagline}`
  - Meta description dari hero subtitle / tagline.
  - JSON-LD `PrintShop` / `LocalBusiness` berisi nama usaha, alamat, nomor telepon/WhatsApp, dan link Google Maps.

#### [MODIFY] [ProductsPage.tsx](file:///Users/user/project/printing-pwa-cms/frontend/src/pages/public/ProductsPage.tsx)

- Menambahkan metadata katalog:
  - Title: `Katalog Produk Percetakan & Digital Printing - {BusinessName}`
  - Canonical: `/produk`
  - Meta description tentang ragam produk cetak.

#### [MODIFY] [ProductDetailPage.tsx](file:///Users/user/project/printing-pwa-cms/frontend/src/pages/public/ProductDetailPage.tsx)

- Menambahkan metadata spesifik produk:
  - Title: `Cetak {product.name} - {BusinessName}`
  - Description: cuplikan `short_description` produk.
  - Open Graph Image: foto utama produk (`assetUrl(product.image_url)`).
  - JSON-LD `Product` (Schema `Product` + `Offer` dengan mata uang IDR & harga mulai).
  - JSON-LD `BreadcrumbList` (Beranda > Produk > Nama Produk).

#### [MODIFY] [ArticlesPage.tsx](file:///Users/user/project/printing-pwa-cms/frontend/src/pages/public/ArticlesPage.tsx)

- Menambahkan metadata daftar artikel:
  - Title: `Artikel & Tips Percetakan - {BusinessName}`
  - Canonical: `/artikel`

#### [MODIFY] [ArticleDetailPage.tsx](file:///Users/user/project/printing-pwa-cms/frontend/src/pages/public/ArticleDetailPage.tsx)

- Menambahkan metadata artikel detail:
  - Title: `{article.title} - {BusinessName}`
  - Description: `article.excerpt`
  - Open Graph: `og:type = "article"`, gambar cover artikel.
  - JSON-LD `Article` (headline, image, datePublished, publisher).
  - JSON-LD `BreadcrumbList` (Beranda > Artikel > Judul Artikel).

#### [MODIFY] [ReviewsPage.tsx](file:///Users/user/project/printing-pwa-cms/frontend/src/pages/public/ReviewsPage.tsx)

- Menambahkan metadata halaman ulasan:
  - Title: `Ulasan & Testimoni Pelanggan - {BusinessName}`
  - Canonical: `/review`

#### [MODIFY] [AboutPage.tsx](file:///Users/user/project/printing-pwa-cms/frontend/src/pages/public/AboutPage.tsx)

- Menambahkan metadata tentang kami:
  - Title: `Tentang Kami - {BusinessName}`
  - JSON-LD `LocalBusiness` lengkap dengan lokasi workshop dan kontak.

---

### 2. Backend Go: Dynamic Sitemap & Robots.txt

#### [NEW] [seo_handler.go](file:///Users/user/project/printing-pwa-cms/backend/internal/handler/seo_handler.go)

- `RobotsTxt(c *gin.Context)`:
  - Mengizinkan bot mengindeks rute public (`/`, `/produk/`, `/artikel/`, `/review`, `/about`).
  - Memblokir bot dari CMS internal (`/cms/`, `/api/`).
  - Menyertakan deklarasi `Sitemap: <origin>/sitemap.xml`.
- `SitemapXML(c *gin.Context)`:
  - Mengambil daftar produk aktif (`WHERE is_published = true`) dan waktu update terakhir (`updated_at`).
  - Mengambil daftar artikel aktif (`WHERE status = 'published'`) dan waktu update terakhir (`updated_at`).
  - Menyusun XML sitemap standar lengkap dengan `<loc>`, `<lastmod>`, `<changefreq>`, dan `<priority>`.

#### [MODIFY] [main.go](file:///Users/user/project/printing-pwa-cms/backend/cmd/api/main.go)

- Mendaftarkan route:
  - `r.GET("/robots.txt", app.RobotsTxt)`
  - `r.GET("/sitemap.xml", app.SitemapXML)`

---

### 3. Nginx: Routing /sitemap.xml & /robots.txt

#### [MODIFY] [nginx.conf](file:///Users/user/project/printing-pwa-cms/frontend/nginx.conf)

- Meneruskan request `/robots.txt` dan `/sitemap.xml` ke backend Go (`backend:8080`).

---

## Verification Plan

### Automated Tests / Builds

1. Validasi build backend Go:
   ```bash
   cd backend && go vet ./...
   ```
2. Validasi build frontend React & TypeScript:
   ```bash
   cd frontend && npm run build
   ```

### Manual Verification

1. Uji endpoint `GET /robots.txt`:
   - Verifikasi status 200, Content-Type `text/plain`, serta aturan Allow/Disallow dan link Sitemap.
2. Uji endpoint `GET /sitemap.xml`:
   - Verifikasi status 200, Content-Type `application/xml`, serta kesesuaian URL dinamis produk dan artikel.
3. Uji tag SEO di browser / DOM:
   - Cek halaman Beranda, Produk, Detail Produk, dan Artikel.
   - Pastikan `<title>`, `<meta name="description">`, `<meta property="og:...">`, dan `<script type="application/ld+json">` terisi dengan benar sesuai data masing-masing halaman.
