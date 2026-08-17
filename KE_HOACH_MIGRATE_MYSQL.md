# CiT Hub — Kế hoạch chuyển đổi Supabase → MySQL/MariaDB tự host (bản cập nhật sau khi đọc code thật)

**Ngày cập nhật:** 14/08/2026 — sau khi đọc repo `huytran134/hub.citedu.vn`

---

## 0. PHÁT HIỆN QUAN TRỌNG — đọc trước khi làm gì tiếp

Trước khi đọc code thật, tôi lên kế hoạch dựa trên tài liệu Instructions (giả định chưa đổi gì). Sau khi đọc repo, thực tế khác hẳn:

**Phần Database: về cơ bản đã xong.**
- `prisma/schema.prisma` đã có `provider = "mysql"`, comment đầu file ghi rõ "Stack: Prisma ORM + MariaDB 11.8".
- Anh xác nhận `DATABASE_URL` thật trên VPS **đã trỏ vào MariaDB/MySQL thật** rồi, không phải Supabase Postgres nữa.
- → Không cần làm lại phần này. Chỉ cần dọn dẹp tài liệu/file mẫu cho khớp thực tế (mục 2).

**Phần Auth: chưa đổi gì cả — đây là toàn bộ phần việc còn lại.**
Grep toàn bộ repo, các file sau vẫn dùng Supabase Auth 100%:
- `lib/supabase.ts`, `lib/supabase-browser.ts` — Supabase client (server + browser)
- `middleware.ts` — bảo vệ route bằng `supabase.auth.getUser()`
- `lib/auth-helpers.ts` — `getCurrentUser()` lấy session từ Supabase
- `app/(auth)/login/page.tsx` — gọi `supabase.auth.signInWithPassword()`
- `prisma/seed.ts` — tạo 3 tài khoản mẫu qua `supabase.auth.admin.createUser()`
- `app/api/admin/settings/users/route.ts` — Admin tạo user mới qua `supabase.auth.admin.createUser()`
- `app/api/admin/settings/users/[id]/reset-password/route.ts` — đổi mật khẩu qua `supabase.auth.admin.updateUserById()`

**Mâu thuẫn tài liệu đang tồn tại, cần sửa dù có đổi Auth hay không:**
- `.env.example` vẫn ghi `DATABASE_URL="postgresql://...supabase.co..."` — sai định dạng, không khớp với `provider = "mysql"` trong schema. Ai đọc theo file mẫu này để setup máy mới sẽ bị lỗi ngay.
- `CLAUDE.md` (mục 2) và `INSTRUCTIONS.md` (Phần 1) đều vẫn ghi "Database: Supabase Cloud PostgreSQL" — sai so với thực tế.

**Điểm tích cực đáng chú ý:** hệ thống hiện tại đã có sẵn UI Admin để tạo tài khoản (`Settings → Users`) và đổi mật khẩu — không cần Supabase Dashboard thủ công. Điều này đơn giản hóa việc thay Auth khá nhiều: chỉ cần thay "ruột" xử lý (từ gọi Supabase Admin API sang tự hash password trong DB), giao diện Admin không cần đổi.

---

## 1. Phạm vi công việc thật sự còn lại

Chỉ có **1 hạng mục kỹ thuật**: thay Supabase Auth bằng auth tự xây. Không còn việc gì liên quan đến database engine nữa.

### 1.1 Thay đổi schema — thêm khả năng lưu mật khẩu
`User` model hiện tại không có field password (vì Supabase Auth quản lý ở nơi khác). Cần thêm:
```prisma
model User {
  id            String   @id @default(cuid())  // đổi từ "= Supabase Auth UID" sang tự sinh
  email         String   @unique
  password_hash String                          // MỚI — bcrypt hash
  full_name     String
  role          UserRole
  is_active     Boolean  @default(true)
  phone         String?
  avatar_url    String?  @db.Text
  ...
}
```
Sửa lại comment đầu model (bỏ dòng "Liên kết 1-1 với auth.users của Supabase").

### 1.2 `lib/auth.ts` — file mới, thay thế `lib/supabase.ts` + `lib/supabase-browser.ts`
Khuyến nghị **NextAuth.js v5 (Auth.js)**, Credentials provider + Prisma Adapter, session strategy `jwt`. Lý do chọn thay vì tự viết từ đầu: đây là thư viện auth production-grade, được Vercel/cộng đồng Next.js bảo trì tích cực, có sẵn xử lý CSRF/cookie an toàn — với hệ thống quản lý tiền học phí, không nên tự chế phần bảo mật đăng nhập khi có giải pháp đã kiểm chứng.

### 1.3 `lib/auth-helpers.ts` — viết lại phần bên trong, giữ nguyên chữ ký hàm
```typescript
requireAdmin()     // đổi: lấy session qua auth() của NextAuth thay vì Supabase
requireHomeroom()  // tương tự
```
Vì interface (tên hàm, kiểu trả về `AuthResult`) giữ nguyên, **không cần sửa bất kỳ API route nghiệp vụ nào khác** (contacts, leads, payments, refunds...) — đây là điểm may mắn của kiến trúc hiện tại.

### 1.4 `middleware.ts` — viết lại bằng middleware chuẩn của NextAuth
Logic redirect (chưa đăng nhập → `/login`, đã đăng nhập mà vào `/login` → `/dashboard`) giữ nguyên, chỉ đổi cách lấy session.

### 1.5 `app/(auth)/login/page.tsx` — đổi lời gọi
Từ `supabase.auth.signInWithPassword()` sang `signIn('credentials', { email, password })` của NextAuth. Phần UI/form giữ nguyên 100%.

### 1.6 `prisma/seed.ts` — viết lại phần tạo tài khoản
Bỏ hoàn toàn phần gọi `supabase.auth.admin.createUser()`. Thay bằng: hash password bằng `bcryptjs`, `prisma.user.create()` trực tiếp với `password_hash`. Đơn giản hơn hẳn bản hiện tại (bỏ được cả logic "tìm user đã tồn tại trong Supabase Auth").

### 1.7 `app/api/admin/settings/users/route.ts` — sửa phần tạo user
Bỏ bước gọi `createSupabaseAdminClient()` + `supabase.auth.admin.createUser()`. Thay bằng: validate password, hash bằng bcrypt, `prisma.user.create()` với `password_hash` — không cần bước "rollback" phức tạp như hiện tại vì không còn 2 hệ thống (Auth + DB) phải đồng bộ nữa, chỉ còn 1 nguồn sự thật (MySQL).

### 1.8 `app/api/admin/settings/users/[id]/reset-password/route.ts` — sửa tương tự
Bỏ `supabase.auth.admin.updateUserById()`, thay bằng `prisma.user.update({ data: { password_hash: await bcrypt.hash(...) } })`.

### 1.9 `package.json`
- Bỏ: `@supabase/supabase-js`, `@supabase/ssr`, và `ws` (hiện chỉ được import trong `seed.ts` để vá WebSocket cho Supabase — không cần nữa)
- Thêm: `next-auth@beta`, `@auth/prisma-adapter`, `bcryptjs`, `@types/bcryptjs`

### 1.10 `.env.example` và `.env.local` trên VPS
- Sửa `DATABASE_URL` mẫu thành đúng định dạng MySQL: `mysql://user:pass@localhost:3306/cithub`
- Bỏ: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Thêm: `NEXTAUTH_SECRET` (random 32 byte), `NEXTAUTH_URL=https://hub.citedu.vn`

---

## 2. Dọn dẹp tài liệu — bắt buộc, độc lập với việc có đổi Auth hay không

Ngay cả khi chưa động vào Auth, `.env.example`, `CLAUDE.md`, `INSTRUCTIONS.md` đã sai so với `schema.prisma` thật ngay lúc này — nên sửa sớm để tránh gây nhầm lẫn cho AI agent hoặc dev khác đọc theo sau. Cụ thể:
- `CLAUDE.md` mục 2: `Database: Supabase Cloud (PostgreSQL)` → `Database: MySQL/MariaDB tự host trên Hostinger VPS`
- `INSTRUCTIONS.md` Phần 1: tương tự
- Cả 2 file: dòng `❌ Dùng relationMode="prisma" → Dùng FK thật PostgreSQL` → sửa thành "FK thật MySQL/MariaDB (InnoDB)" — về bản chất quy tắc không đổi (vẫn không dùng relationMode), chỉ đổi tên engine.
- Sau khi đổi Auth: sửa tiếp dòng "❌ KHÔNG tạo bảng Session/Account/VerificationToken trong Prisma (Supabase Auth tự quản lý)" — dòng này cần **xóa hoặc đảo ngược** vì giờ dự án tự quản lý auth.
- Mục 5.11 CLAUDE.md (cronjob keep-alive ping Supabase) → xóa, thay bằng cronjob backup MySQL (mục 3 dưới đây).
- Mục 9 CLAUDE.md (Environment Variables mẫu) → cập nhật theo mục 1.10 ở trên.

---

## 3. Việc vận hành cần làm thêm — không có trong code, nhưng bắt buộc phải có
MySQL tự host trên VPS không có backup tự động như Supabase. Cần:
- Cronjob `mysqldump` hàng đêm, nén, đẩy ra ngoài VPS (Google Drive qua rclone, hoặc nơi lưu trữ khác) — giữ tối thiểu 7 bản gần nhất.
- Test thử 1 lần quy trình restore để chắc chắn backup dùng được, không chỉ tồn tại.

---

## 4. Việc KHÔNG cần đổi
- Toàn bộ 90+ file component, toàn bộ logic nghiệp vụ (agreed_price, luồng duyệt Payment/Refund 2 bước, soft delete middleware trong `lib/prisma.ts`, MagicLink, ProgramPrerequisite...) — không đụng vào gì cả.
- Cấu trúc route `(admin)/`, `(cnl)/`, toàn bộ API route nghiệp vụ khác ngoài `settings/users` — không cần sửa vì `requireAdmin()`/`requireHomeroom()` giữ nguyên interface.
- `.github/workflows/deploy.yml` — chỉ cần đảm bảo GitHub Secrets có đúng `DATABASE_URL` (mysql) và thêm `NEXTAUTH_SECRET`, không cần đổi logic workflow.

---

## 5. Thứ tự triển khai đề xuất

1. Sửa `.env.example`, `CLAUDE.md`, `INSTRUCTIONS.md` cho khớp thực tế MySQL (không phụ thuộc Auth — làm trước, an toàn, không ảnh hưởng runtime).
2. Thêm `password_hash` vào `User` model, chạy `prisma db push` (dự án dùng `db push` theo comment đầu schema, không dùng `migrate`).
3. Cài `next-auth`, `bcryptjs`; viết `lib/auth.ts`.
4. Viết lại `lib/auth-helpers.ts`, `middleware.ts`.
5. Viết lại `app/(auth)/login/page.tsx`.
6. Viết lại `prisma/seed.ts`, 2 route trong `settings/users/`.
7. Gỡ `@supabase/*` khỏi `package.json`, xóa `lib/supabase.ts`, `lib/supabase-browser.ts`.
8. Test toàn bộ luồng: đăng nhập Admin, đăng nhập CNL, tạo user mới, đổi mật khẩu, redirect đúng role, middleware chặn đúng route.
9. Deploy thử, xác nhận `hub.citedu.vn` hoạt động bình thường sau khi đổi.
10. Thiết lập cronjob backup MySQL (mục 3).

---

## 6. Câu hỏi trước khi tôi viết code

- Xác nhận cho tôi bắt tay code luôn theo đúng thứ tự ở mục 5, hay anh muốn duyệt lại phạm vi này trước?
- Repo đang public tạm thời để tôi đọc — sau khi tôi code xong, tôi sẽ tạo branch/commit thay vì push thẳng lên `main`, đúng không? (Tôi sẽ hỏi lại xác nhận trước khi push bất kỳ thay đổi nào lên GitHub thật.)
