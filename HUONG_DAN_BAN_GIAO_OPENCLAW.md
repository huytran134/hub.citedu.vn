# Hướng dẫn bàn giao — Hoàn tất migrate Auth (Supabase → NextAuth.js)

**Bối cảnh (để OpenClaw không cần hỏi lại):** Repo `huytran134/hub.citedu.vn` đang chuyển từ Supabase (Database + Auth) sang MySQL/MariaDB tự host trên Hostinger VPS. Phần Database đã xong từ trước (schema.prisma đã `provider = "mysql"`, DATABASE_URL thật đã trỏ MariaDB). Phần Auth (Supabase Auth → NextAuth.js + bcrypt) đã được code xong bởi Claude trong 1 commit trên branch `feat/replace-supabase-auth-with-nextauth`, nhưng **chưa lên được GitHub** vì session của Claude không có quyền push vào repo này.

Repo hiện đang để **Public tạm thời** để đọc code — nhớ đổi lại **Private** ở bước cuối.

---

## Bước 1 — Lấy code đã viết sẵn

Có 2 file đính kèm trong cuộc hội thoại này, chọn 1 cách:

**Cách A — dùng bundle (khuyên dùng, giữ nguyên lịch sử commit):**
```bash
cd /path/to/hub.citedu.vn   # thư mục repo local đã clone
git fetch /đường/dẫn/tới/cithub-auth-migration.bundle \
  feat/replace-supabase-auth-with-nextauth:feat/replace-supabase-auth-with-nextauth
git checkout feat/replace-supabase-auth-with-nextauth
```

**Cách B — dùng file patch** (nếu đang ở nhánh `main`, đúng commit `9ade52f` — commit "fix(schema): regenerate Prisma Client with is_active field"):
```bash
git checkout -b feat/replace-supabase-auth-with-nextauth
git am 0001-replace-supabase-auth-with-nextauth.patch
```

Nếu `git am` báo conflict nghĩa là `main` đã có commit mới hơn `9ade52f` — dừng lại, không cố force apply, báo lại để rà soát trước.

---

## Bước 2 — Push nhánh lên GitHub

```bash
git push -u origin feat/replace-supabase-auth-with-nextauth
```

Nếu OpenClaw chạy trong môi trường có quyền ghi vào repo (không bị chặn như session Claude vừa rồi), lệnh này sẽ chạy được bình thường. Sau đó tạo Pull Request từ nhánh này vào `main` để review trước khi merge — **không merge thẳng, không push thẳng lên `main`**.

---

## Bước 3 — 4 việc bắt buộc phải làm SAU khi có code, TRƯỚC khi merge/deploy

Đây là phần quan trọng nhất — code chỉ là 1 nửa, không làm 4 việc này thì hệ thống sẽ không đăng nhập được.

### 3.1 Áp dụng schema mới lên database thật
```bash
npm install
npx prisma db push
```
Việc này thêm cột `password_hash` mới vào bảng `User` trên MariaDB thật. **Bắt buộc phải chạy trước khi seed hoặc test đăng nhập**, nếu không sẽ lỗi vì cột chưa tồn tại.

### 3.2 Thêm biến môi trường `NEXTAUTH_SECRET`
```bash
openssl rand -base64 32
```
- Thêm giá trị này vào `.env.local` trên VPS: `NEXTAUTH_SECRET="..."`
- Thêm `NEXTAUTH_URL="https://hub.citedu.vn"` vào `.env.local`
- Thêm cả 2 biến này vào **GitHub Secrets** của repo (Settings → Secrets and variables → Actions) — vì `deploy.yml` đã được sửa để đọc `NEXTAUTH_SECRET` khi build.
- Xóa các secret Supabase cũ nếu còn: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (không còn dùng nữa).

### 3.3 Tạo lại tài khoản mẫu
```bash
npm run db:seed
```
Tạo 3 tài khoản với mật khẩu mặc định (xem output khi chạy seed) — **bắt buộc đổi mật khẩu ngay sau khi đăng nhập lần đầu**, vì mật khẩu mặc định nằm sẵn trong code (`prisma/seed.ts`).

### 3.4 Build thật + test đăng nhập
```bash
npm run build
npm start   # hoặc pm2 reload cithub --update-env nếu deploy thẳng lên VPS
```
Claude **chưa tự chạy được lệnh này** trong sandbox (bị chặn mạng tới `binaries.prisma.sh` nên `prisma generate` không tải được engine) — nghĩa là code chưa được xác nhận build sạch 100% bằng máy thật. Đây là bước kiểm tra bắt buộc, không được bỏ qua.

Test tối thiểu sau khi build xong:
- [ ] Đăng nhập bằng tài khoản Admin (`huytran@citedu.vn`) → vào đúng `/dashboard`
- [ ] Đăng nhập bằng tài khoản CNL (`cnl1@citedu.vn`) → vào đúng `/today`
- [ ] Đăng nhập sai mật khẩu → báo lỗi đúng, không crash
- [ ] Vào thẳng URL admin khi chưa đăng nhập → bị redirect về `/login`
- [ ] Admin vào `Settings → Users` → tạo được user mới, đổi được mật khẩu user khác
- [ ] Đăng xuất → không còn vào được trang cần đăng nhập

---

## Bước 4 — Dọn dẹp sau khi xác nhận chạy ổn

- [ ] Đổi repo từ **Public** về lại **Private** trên GitHub (Settings → General → Danger Zone → Change visibility)
- [ ] Xóa file `.env.local` cũ có chứa thông tin Supabase (nếu còn sót trên VPS)
- [ ] Kiểm tra không còn secret Supabase nào active trong GitHub Secrets

---

## Tóm tắt những gì đã đổi trong code (để OpenClaw review nhanh, không cần đọc lại toàn bộ diff)

| File | Thay đổi |
|---|---|
| `prisma/schema.prisma` | Thêm `password_hash` vào `User`, bỏ ràng buộc `id = Supabase UID` |
| `lib/auth.ts` | **Mới** — cấu hình NextAuth.js v5, Credentials provider, session JWT |
| `lib/auth-helpers.ts` | Viết lại phần lấy session (NextAuth thay vì Supabase), giữ nguyên `requireAdmin()`/`requireHomeroom()` nên **không cần sửa route nghiệp vụ khác** |
| `middleware.ts` | Viết lại bằng `auth()` wrapper của NextAuth |
| `app/(auth)/login/page.tsx` | Gọi `signIn('credentials', ...)` thay vì Supabase |
| `app/providers.tsx`, `app/layout.tsx` | Thêm `SessionProvider` |
| `app/api/auth/[...nextauth]/route.ts` | **Mới** — route bắt buộc của NextAuth |
| `types/next-auth.d.ts` | **Mới** — mở rộng type session có `id`/`role` |
| `prisma/seed.ts` | Bỏ gọi Supabase Admin API, hash password bằng bcrypt, upsert thẳng vào DB |
| `app/api/admin/settings/users/route.ts` | Tạo user: bcrypt hash thay vì Supabase Admin API |
| `app/api/admin/settings/users/[id]/reset-password/route.ts` | Đổi mật khẩu: cập nhật `password_hash` thay vì gọi Supabase |
| `lib/supabase.ts`, `lib/supabase-browser.ts` | **Xóa** |
| `package.json` | Gỡ `@supabase/*`, `ws`; thêm `next-auth`, `bcryptjs` |
| `.env.example` | Sửa mẫu biến môi trường cho MySQL + NextAuth |
| `CLAUDE.md`, `INSTRUCTIONS.md` | Cập nhật mô tả stack, xóa mô tả sai về Supabase, thêm mục lịch sử thay đổi kiến trúc |
| `.github/workflows/deploy.yml` | Thêm `NEXTAUTH_SECRET`/`NEXTAUTH_URL` vào bước build |
