# Store — React PWA + Go Gin CMS

Starter production-oriented untuk usaha printing dengan website publik + CMS dalam satu repository.

## Stack

- Frontend: React 19.2, TypeScript, Vite 8, React Router 7, TanStack Query 5
- PWA: Web App Manifest + Service Worker custom (installable + offline navigation/cache public API)
- Backend: Go 1.27 + Gin 1.12
- Database: PostgreSQL
- Authentication: JWT access token (memory) + opaque refresh token HttpOnly cookie + rotation
- Authorization: RBAC (roles, permissions, user_roles, role_permissions)
- Upload: local volume (`/uploads`) untuk JPG/PNG/WebP <= 5 MB; produksi sebaiknya pindah ke S3/MinIO/object storage

## Fitur publik

- Home
- Produk + detail produk dengan multi-image slider/carousel, thumbnail, swipe mobile, dan related products
- Artikel + detail artikel
- Review + submit review (masuk pending)
- About
- PWA installable
- Offline fallback untuk route yang sudah pernah dibuka dan cache endpoint publik

## Fitur CMS

- Dashboard statistik analitik pengunjung website (kunjungan hari ini, pengunjung unik, tren 7 hari, top halaman, breakdown perangkat & sumber traffic) serta ringkasan konten
- Produk: create/update/delete, publish/draft, featured, upload gambar utama + multi-image gallery, atur urutan slide
- Artikel: create/update/delete, draft/published
- Review: approve, featured, delete
- Konten: identitas bisnis, hero, kontak, About
- User + role
- RBAC backend + route guard frontend

### Role default

- `superadmin`: semua permission
- `admin`: semua konten + lihat user, tidak dapat membuat/mengubah user
- `editor`: dashboard, baca produk/review/about, serta baca/tulis artikel

## Menjalankan dengan Docker

1. Copy `.env.example` menjadi `.env` dan ganti `JWT_SECRET` + password admin.
2. Jalankan:

```bash
docker compose up -d --build
```

3. Seed akun superadmin setelah backend hidup:

```bash
docker compose --profile tools run --rm seed
```

4. Buka:
   - Website: http://localhost:3000
   - CMS: http://localhost:3000/cms/login
   - API health: http://localhost:8080/health

Credential development default:

```text
admin@Store.local
Admin123!change
```

**Jangan gunakan credential/JWT secret default di production.**

## Menjalankan manual tanpa Docker

### 1. PostgreSQL

Buat database dan user:

```sql
CREATE USER printing WITH PASSWORD 'printing';
CREATE DATABASE printing_cms OWNER printing;
```

### 2. Backend

Butuh Go 1.27+.

```bash
cd backend
cp .env.example .env
```

Export variabel dari `.env` sesuai shell Anda, lalu:

```bash
go mod tidy
go run ./cmd/api
```

Migration dijalankan otomatis saat API start.

Terminal lain untuk seed admin:

```bash
cd backend
export DATABASE_URL='postgres://printing:printing@localhost:5432/printing_cms?sslmode=disable'
export SEED_ADMIN_EMAIL='admin@Store.local'
export SEED_ADMIN_PASSWORD='Admin123!change'
go run ./cmd/seed
```

### 3. Frontend

Butuh Node.js yang kompatibel dengan Vite 8.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Buka http://localhost:5173.

## API utama

Public:

```text
GET    /api/v1/public/site
GET    /api/v1/public/products
GET    /api/v1/public/products/:slug
GET    /api/v1/public/articles
GET    /api/v1/public/articles/:slug
GET    /api/v1/public/reviews
POST   /api/v1/public/reviews
GET    /api/v1/public/pages/:key
```

Auth:

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

CMS:

```text
GET    /api/v1/admin/dashboard
CRUD   /api/v1/admin/products
CRUD   /api/v1/admin/articles
GET/PATCH/DELETE /api/v1/admin/reviews
GET/PUT /api/v1/admin/pages/:key
GET/PUT /api/v1/admin/settings
GET/POST/PUT /api/v1/admin/users
POST   /api/v1/admin/uploads
```

## Authentication flow

1. Login mengembalikan access token JWT dan memasang refresh token sebagai HttpOnly cookie.
2. Access token hanya disimpan di memory React, bukan localStorage.
3. Saat app reload, frontend memanggil `/auth/refresh` menggunakan HttpOnly cookie.
4. Refresh token dirotasi setiap refresh; token lama langsung direvoke.
5. JWT berisi role + permission untuk akses singkat (default 15 menit).
6. Middleware Gin `RequirePermission(...)` tetap menjadi enforcement utama.

## Production checklist

- TLS/HTTPS; set `COOKIE_SECURE=true`.
- JWT secret minimal 32+ random bytes dan simpan di secret manager.
- Object storage S3/MinIO untuk media, bukan disk container.
- Tambahkan antivirus/file scanning bila user dapat upload file produksi.
- Tambahkan rate limit pada login, refresh, review, dan upload.
- Tambahkan CSRF/origin validation bila arsitektur cookie/domain berubah.
- Batasi `trusted_proxies` Gin dan konfigurasi reverse proxy dengan benar.
- Tambahkan audit log untuk perubahan CMS.
- Backup PostgreSQL terjadwal.
- Untuk artikel kompleks, ganti textarea ke editor (TipTap/Lexical) dan sanitasi HTML di backend.
- Untuk katalog besar, tambahkan pagination, search, dan filter kategori.

## Struktur

```text
printing-pwa-cms/
├── backend/
│   ├── cmd/api
│   ├── cmd/seed
│   ├── internal/config
│   ├── internal/database
│   ├── internal/handler
│   ├── internal/middleware
│   ├── internal/security
│   └── migrations
├── frontend/
│   ├── public/manifest.webmanifest
│   ├── public/sw.js
│   └── src/
│       ├── api
│       ├── auth
│       ├── components
│       ├── layouts
│       └── pages
└── docker-compose.yml
```

## Detail Produk

- Public route `/produk/:slug` dan pengaturan detail produk di CMS.
- Jalankan migration `002_product_details.sql` melalui startup backend seperti biasa.
