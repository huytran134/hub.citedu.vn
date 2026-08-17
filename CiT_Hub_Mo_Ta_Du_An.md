# CiT Hub — Mô tả chi tiết dự án

*Tài liệu này được tạo bằng cách đọc trực tiếp mã nguồn thực tế tại `D:\website\hub.citedu.vn` trên máy anh (không chỉ dựa vào tài liệu), ngày 16/08/2026.*

> ⚠️ **Lưu ý quan trọng trước tiên:** Project Instructions gắn với phiên làm việc này (trong Claude Projects "Hub CiT") vẫn ghi Database = Supabase PostgreSQL, Auth = Supabase Auth. Nhưng **mã nguồn thực tế đã migrate xong** sang **MySQL/MariaDB tự host** + **NextAuth.js (Credentials + bcrypt)** từ tháng 8/2026 — việc này được xác nhận bởi chính `CLAUDE.md` v3.0 (mục 13 — Lịch sử thay đổi kiến trúc) và `INSTRUCTIONS.md` nằm trong repo, cũng như toàn bộ code (`schema.prisma`, `lib/auth.ts`, `package.json`...). Tài liệu Project Instructions trong Claude đang là bản cũ, nên cập nhật lại để AI agent các phiên sau không bị nhầm.

---

## 1. Tổng quan dự án

**CiT Hub** là hệ thống CRM + LMS nội bộ cho **CiT EDU** (đào tạo Tư duy Thành đạt & Khởi nghiệp, Hà Nội). Mục tiêu: thay thế Google Sheets đang dùng, giải quyết 3 vấn đề — mất lead, không theo dõi được học viên, không biết ai đang nợ học phí.

- Quy mô thực tế: 200–500 học viên/năm, **5 người dùng hệ thống** (không phải SaaS công cộng)
- Owner: Giám đốc Huy Trần — không biết code
- URL production: https://hub.citedu.vn
- Nguyên tắc số 1: **Thực dụng trước, hoàn hảo sau** — tối ưu cho vận hành thực tế của 5 người, không chạy theo best-practice thuần kỹ thuật

---

## 2. Công nghệ & môi trường (đúng theo code thực tế)

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | Next.js 14.2.3 (App Router) + TypeScript | |
| Styling | Tailwind CSS + Shadcn UI | Component gốc trong `components/ui/` — không sửa |
| Database | **MySQL/MariaDB 11.8** tự host trên Hostinger VPS | Đã đổi từ Supabase PostgreSQL (8/2026) |
| ORM | Prisma 5.14 | Không dùng `relationMode` — FK thật (InnoDB) |
| Auth | **NextAuth.js (Auth.js) v5-beta.32** — Credentials provider + `bcryptjs` | Đã đổi từ Supabase Auth (8/2026). Session strategy: **JWT** (không có bảng Session/Account) |
| AI | `@google/generative-ai` (Gemini 2.0 Flash) — gợi ý nội dung bài giảng | Có key `GEMINI_API_KEY`; `@anthropic-ai/sdk` cũng có trong dependency nhưng chưa thấy route nào dùng |
| Process Manager | PM2 (`pm2 reload` — zero downtime, không dùng `restart`) | |
| Web Server | Nginx + Let's Encrypt SSL | |
| Hosting | Hostinger VPS | |
| CI/CD | GitHub Actions — 1 workflow duy nhất (`deploy.yml`), chạy khi push `main` | Build → SCP `.next` lên VPS qua SSH → touch `restart.txt` để Passenger reload |
| Backup | Cronjob `mysqldump` hàng đêm 3h sáng, nén, giữ 7 bản, đẩy ra ngoài VPS | Thay cho keep-alive ping Supabase (không còn cần) |

### Deploy pipeline thực tế (`.github/workflows/deploy.yml`)
1. Checkout → cài Node 20 → `npm ci`
2. `npx prisma generate` (cần `DATABASE_URL`)
3. `npm run build` (cần `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`)
4. Đóng gói `.next` thành tarball, upload artifact
5. Job `deploy`: SCP tarball lên VPS qua cổng SSH 65002, giải nén vào `nodejs/`, xóa `.next` cũ, `touch tmp/restart.txt`

*(Ghi chú: `CLAUDE.md` mô tả workflow có thêm bước `npx prisma db push` trước build, nhưng file `deploy.yml` thực tế trên đĩa chưa có bước này — có thể tài liệu đi trước code một nhịp, hoặc bước này đang chạy tay trên VPS.)*

### Biến môi trường (`.env.example`)
```
DATABASE_URL="mysql://cithub_user:[PASSWORD]@localhost:3306/cithub"
NEXTAUTH_SECRET="[RANDOM_32_BYTE_SECRET]"
NEXTAUTH_URL="https://hub.citedu.vn"
NEXT_PUBLIC_APP_URL="https://hub.citedu.vn"
NODE_ENV="production"
GEMINI_API_KEY=""
```

### next.config.js
- Giới hạn `cpus: 1` cho static generation (tránh lỗi `EAGAIN` trên VPS shared tài nguyên thấp)
- Alias `@` → thư mục gốc

---

## 3. Cấu trúc dự án (đúng theo thư mục thực tế)

```
hub.citedu.vn/
├── app/
│   ├── (auth)/login/                  # Trang đăng nhập
│   ├── (admin)/                       # Route group chỉ ADMIN
│   │   ├── admin/contacts, admin/leads
│   │   ├── classes/ (+ new, lessons, [id]/sessions)
│   │   ├── dashboard/
│   │   ├── finance/ (payments, refunds)
│   │   ├── reports/ (debt, revenue, progression)
│   │   └── settings/
│   ├── (cnl)/                         # Route group ADMIN + HOMEROOM
│   │   ├── today/, my-classes/[id]/ (payments/new, refunds/new, sessions/[sessionId])
│   │   ├── attendance/, contacts/[id]/, leads/[id]/
│   ├── api/
│   │   ├── admin/  → classes, contacts, dashboard/followups, enrollments/[id]/{activate,drop,reactivate,suspend},
│   │   │            lessons/[id]/{ai-suggest,versions}, payments/[id]/{approve,reject}, programs,
│   │   │            refunds/[id]/{approve,reject}, reports/{debt,revenue,progression}, sessions/[sessionId], settings/users
│   │   ├── auth/[...nextauth], auth/role
│   │   ├── cnl/sessions/[sessionId]/{attendance,evaluation-link,notes,zoom-link}
│   │   ├── contacts/, contacts/[id]/notes, contacts/check-phone
│   │   ├── leads/, leads/[id]/notes
│   │   ├── makeup-sessions/, makeup-sessions/available, makeup-sessions/[id]
│   │   ├── me/, payments/, refunds/, feedback/submit
│   ├── feedback/[token]/              # Trang public — học viên đánh giá qua MagicLink
│   ├── layout.tsx, providers.tsx (SessionProvider), error.tsx, globals.css
├── components/
│   ├── ui/                            # Shadcn — button, card, input, label
│   └── custom/                        # ~26 component nghiệp vụ (AdminNav, LeadKanbanBoard, AttendanceBoard, ContactImportClient, LessonEditor, SettingsUsersClient, MakeupRegistrationSheet, ...)
├── lib/
│   ├── auth.ts                        # Cấu hình NextAuth
│   ├── auth-helpers.ts                # requireAdmin(), requireHomeroom(), getCurrentUser()
│   ├── prisma.ts                      # Prisma client singleton + soft-delete middleware
│   └── utils.ts                       # normalizePhone(), cn()...
├── prisma/
│   ├── schema.prisma                  # Nguồn sự thật DB (MySQL, ~30 model/enum)
│   └── seed.ts                        # Seed 3 tài khoản mẫu (bcrypt hash trực tiếp vào DB)
├── scripts/delete-test-sessions.ts
├── types/next-auth.d.ts               # Mở rộng type session có id/role
├── middleware.ts                      # Bảo vệ route qua NextAuth `auth()` wrapper
└── .github/workflows/deploy.yml
```

Cấu trúc này khớp gần như 1-1 với `INSTRUCTIONS.md`/`CLAUDE.md`, ngoại trừ phần Auth (đã đổi tên file nhưng vai trò/API giữ nguyên).

---

## 4. Vai trò người dùng & phân quyền

Đúng 2 role, enforce bằng `lib/auth-helpers.ts`, gọi ở **đầu mọi API route**:

- `requireAdmin()` — chỉ ADMIN (2 người, dùng desktop)
- `requireHomeroom()` — ADMIN hoặc HOMEROOM/CNL (3 người, dùng điện thoại)

Cả hai hàm còn kiểm tra `user.is_active` (tài khoản bị vô hiệu hóa → 403) trước khi kiểm tra role. Middleware Next.js (`middleware.ts`) chặn ở tầng route: chưa đăng nhập → redirect `/login`; đã đăng nhập mà vào `/login` hoặc `/` → redirect `/dashboard`. Route public duy nhất: `/login`, tiền tố `/feedback` (trang đánh giá qua MagicLink) và `/api/auth`.

**Ranh giới bảo mật cốt lõi của CNL:** mọi truy vấn tài chính/lớp học phải lọc `class.homeroom_id = currentUser.id` — thấy rõ trong code (`app/api/refunds/route.ts`, `app/api/makeup-sessions/route.ts`...) đều có kiểm tra `if (user.role === 'HOMEROOM' && enrollment.class.homeroom_id !== user.id) return 403`.

Ma trận quyền chi tiết giữ nguyên như Project Instructions đã liệt kê (Contact/Lead chỉ đọc với CNL, chỉ Admin xóa/duyệt/báo cáo doanh thu, v.v.) — code hiện tại tuân thủ đúng ma trận này ở các route đã kiểm tra.

---

## 5. Giao diện

- Layout `(admin)`: sidebar/nav desktop (`AdminNav`), có badge đỏ đếm Payment + Refund `pending`, đổi màu cam nếu phiếu chờ quá 24h (tính từ `oldestPendingAt`)
- Layout `(cnl)`: thanh nav trên cùng (navy, tên user) + `CnlBottomNav` cố định dưới cùng — điện thoại-first
- Trang `/login`: nền navy, form trắng bo góc, nút flame — đúng brand
- Trang `/feedback/[token]`: giao diện đơn giản, ẩn danh, không cần đăng nhập, kiểm tra token hết hạn/đã dùng trước khi hiện form
- Dark mode: có `ThemeToggle`, lưu vào `localStorage('cithub-theme')`, chống flash trắng bằng script inline trong `<head>`
- Design system đúng brand: Navy `#0A1628`, Flame `#E8471A`, Ink `#111111`; font `system-ui` (không load Google Fonts); nút CNL tối thiểu 44px

---

## 6. Các tính năng chính (theo module thực tế trong code)

### 6.1 CRM — Contact & Lead
- CRUD Contact (Admin), xem/ghi chú (CNL) — `app/api/contacts/`
- Kiểm tra trùng SĐT khi tạo mới (`check-phone`)
- Import hàng loạt từ Google Sheets (`app/api/admin/contacts/import/route.ts`, UI `ContactImportClient.tsx`) — tối đa 2000 dòng/lần, Smart Match qua `$queryRaw` (bypass middleware soft-delete để bắt cả bản ghi đã xóa vì `phone` có UNIQUE), phân loại NEW / DUPLICATE (bỏ qua) / CONFLICT (giữ nguyên DB, đánh dấu để Admin xem)
- Pipeline Lead dạng Kanban 4 cột (`LeadKanbanBoard.tsx`), `LeadStageControl`
- LeadNote: ghi mỗi lần liên hệ với `contact_method`, `contact_result`, `next_followup_at`
- Dashboard "Lead cần gọi lại hôm nay" — `app/api/admin/dashboard/followups/route.ts`

### 6.2 Chương trình đào tạo & bài giảng
- `Program` (3 nhánh), `ProgramPrerequisite` (logic OR trong nhóm, AND giữa nhóm)
- `Lesson` + `LessonVersion` — mỗi lần Admin sửa bài giảng tạo bản version mới, không ghi đè (lịch sử bất biến)
- **AI gợi ý nội dung bài giảng** (`app/api/admin/lessons/[id]/ai-suggest/route.ts`): gọi Gemini 2.0 Flash, prompt tiếng Việt theo đúng ngữ cảnh CiT EDU, parse JSON trả về `{content, discussion_questions, notes_for_teacher}` — **chỉ trả text để Admin xem xét, không tự ghi vào DB**. Có xử lý lỗi khá kỹ: thiếu API key (503), bị chặn safety filter (422), hết quota (429), lỗi mạng (503), lỗi key (503), fallback lỗi chung (502)

### 6.3 Lớp học & buổi học
- Tạo `Class` (Admin), `ClassSession` từng buổi, sinh hàng loạt (`sessions/generate`, `sessions/bulk-create`)
- CNL nhập link Zoom/Meet, ghi chú buổi học (`SessionZoomLinkInput`, `SessionNotesInput`)
- Điểm danh 1 chạm (`AttendanceBoard.tsx`) — present/absent/late/leave_early, tự lưu ngay
- **Học bù (Makeup Session)** — tính năng không có trong Project Instructions nhưng đã build đầy đủ: học viên vắng buổi lớp A có thể đăng ký học bù ở buổi tương lai của lớp B (`app/api/makeup-sessions/`). Ràng buộc: buổi bù phải khác lớp gốc, phải là buổi trong tương lai; không ảnh hưởng `Attendance` của lớp gốc, không đổi `agreed_price` (học bù miễn phí)

### 6.4 Enrollment (đăng ký học)
- Vòng đời: `waitlist → active → {suspended, completed, dropped}`, `suspended → {active, dropped}`
- API riêng cho từng transition: `activate`, `suspend` (bắt buộc lý do + ngày, tối đa bảo lưu 36 tháng), `drop` (kiểm tra công nợ realtime, nếu còn nợ mà chưa `confirmedDebt` thì trả `requiresConfirmation` để FE hỏi lại Admin trước khi thực sự đổi trạng thái), `reactivate`
- `agreed_price` bắt buộc khi tạo, không có công thức tự động khi học viên vào muộn — Admin tự quyết

### 6.5 Tài chính — Payment & Refund (luồng 2 bước)
- CNL tạo phiếu thu/hoàn tiền cho lớp mình → `status: pending`
- Admin duyệt (`approve` route): **bắt buộc nhập `paid_at`/`refunded_at`**, validate không quá 7 ngày trong tương lai, chỉ duyệt được phiếu đang `pending` (chặn duyệt trùng), sau khi duyệt gọi `revalidatePath('/finance')` và `/dashboard'` để badge cập nhật ngay
- Từ chối (`reject`) bắt buộc `rejection_reason`
- **Refund chặn cứng Nhánh 2 (Coaching)** ngay tại API (`app/api/refunds/route.ts`): kiểm tra `enrollment.class.program.branch === 'coaching'` → trả 403 kèm thông báo tiếng Việt rõ ràng, không có exception nào lách được
- Số tiền hoàn tối đa = tổng đã đóng approved − tổng đã hoàn approved (không cho hoàn vượt)

### 6.6 Báo cáo
- `reports/debt` — công nợ từng học viên, tính từ `agreed_price − payments approved + refunds approved`, sắp xếp nợ nhiều nhất lên đầu, có tổng công nợ/số người nợ/tổng thực thu toàn hệ thống
- `reports/revenue` — doanh thu theo tháng dựa trên `paid_at`
- `reports/progression` — học viên đủ điều kiện lên cấp (dựa `ProgramPrerequisite`)

### 6.7 Đánh giá cuối buổi (Feedback qua MagicLink)
- CNL tạo hàng loạt MagicLink cho tất cả học viên đang active/waitlist/suspended của buổi học (`evaluation-link/route.ts`), tránh tạo trùng cho người đã có link
- `expires_at` = ngày buổi học + 7 ngày
- Trang `/feedback/[token]` public, kiểm tra: token tồn tại + đúng context `evaluation` + chưa `used_at` + chưa hết hạn
- Feedback có 3 tiêu chí rating (giảng viên/trợ giảng/tổ chức) + ghi chú tự do, lưu IP, **không soft-delete** (bất biến)

### 6.8 Quản trị người dùng (Settings)
- Admin tạo/sửa/vô hiệu hóa user, đặt lại mật khẩu (`SettingsUsersClient.tsx`, route `settings/users`) — giờ thao tác trực tiếp trên bảng `User` với `bcrypt.hash`, không còn gọi Supabase Admin API

---

## 7. Luồng vận hành & logic nghiệp vụ cốt lõi

### 7.1 Ba nhánh chương trình
- **Nhánh 1 — Tư duy:** Cấp 1 (Tư duy Tài Năng **hoặc** Tư duy Khởi Nghiệp — OR) → Cấp 2 (Tư duy Thành Đạt, cần ≥1 khóa Cấp 1) → Cấp 3 (Tư duy Đột Phá, cần hoàn thành Cấp 2). Logic OR/AND thực hiện qua `ProgramPrerequisite.logic_group`
- **Nhánh 2 — Coaching 1-1 (Mật Thất):** học phí theo năm, **không hoàn tiền** — chặn tại tầng API (không chỉ UI)
- **Nhánh 3 — Kỹ năng bổ trợ:** không điều kiện tiên quyết, học song song nhánh khác

### 7.2 Công nợ — luôn tính realtime từ `agreed_price`
```
Công nợ = Enrollment.agreed_price − SUM(Payment.amount WHERE status='approved')
        + đã trừ SUM(Refund.amount WHERE status='approved') vào phần "đã thu"
```
Không bao giờ dùng `Program.price` (giá niêm yết) để tính nợ — đây là quy tắc đỏ số 1 và code hiện tại tuân thủ đúng ở mọi route đã kiểm tra (`reports/debt`, `enrollments/[id]/drop`...).

### 7.3 Luồng thu học phí / hoàn tiền — không có shortcut
CNL tạo (pending) → Admin thấy badge → Admin duyệt (bắt buộc `paid_at`/`refunded_at`) hoặc từ chối (bắt buộc lý do). CNL không tự duyệt phiếu của mình, không có auto-approve.

### 7.4 Smart Match chống trùng Contact
1 SĐT = 1 Contact. Chuẩn hóa SĐT qua `normalizePhone()` trong `lib/utils.ts` trước khi so sánh/lưu.

### 7.5 Soft delete
Các bảng có `deleted_at`: `Contact, ContactNote, Lead, LeadNote, Program, Class, ClassSession, Enrollment, Payment, Refund, Lesson` — tự động lọc qua Prisma middleware (`lib/prisma.ts`), không bao giờ gọi `.delete()`. `Attendance` và `Feedback` không có `deleted_at` — bất biến tuyệt đối. `Payment`/`Refund` xóa bắt buộc `deletion_reason`.

### 7.6 MagicLink
1 lần dùng, TTL mặc định 7 ngày, verify kiểm tra cả `expires_at` lẫn `used_at`.

---

## 8. Module kết nối / tích hợp

| Module | Vai trò | Ghi chú |
|---|---|---|
| NextAuth.js Credentials | Xác thực đăng nhập | JWT session, callback gắn `id`/`role` vào token và session |
| Prisma + MySQL | ORM + DB, có middleware soft-delete tự động | Không dùng Prisma Adapter cho auth (không cần bảng Session/Account vì chỉ 1 provider nội bộ) |
| Google Gemini 2.0 Flash | Gợi ý nội dung bài giảng | Qua `@google/generative-ai`, cần `GEMINI_API_KEY`, có xử lý lỗi phân loại theo nguyên nhân |
| GitHub Actions | CI/CD | 1 workflow, build trên GitHub-hosted runner rồi SCP sang VPS qua SSH (cổng 65002) |
| PM2 + Nginx | Chạy production trên VPS | `pm2 reload` zero-downtime (route thực tế trên VPS dùng cơ chế Passenger `restart.txt`, theo `deploy.yml`) |
| Cronjob `mysqldump` | Backup hàng đêm | Không nằm trong repo — chạy trực tiếp bằng crontab trên VPS |
| `@anthropic-ai/sdk` | Có trong `package.json` nhưng **chưa tìm thấy route nào sử dụng** | Có thể chuẩn bị cho tính năng tương lai (Phase 5 — chatbot) hoặc còn sót lại từ thử nghiệm |

---

## 9. Tiêu chuẩn kỹ thuật quan sát được trong code

### 9.1 Phong cách code
- Comment tiếng Việt, giải thích rõ *lý do nghiệp vụ* chứ không chỉ mô tả code (ví dụ trong `lib/prisma.ts`, các route approve/reject)
- Mỗi API route: xác thực (`requireAdmin`/`requireHomeroom`) luôn là dòng đầu tiên sau import, trả về `response` ngay nếu có lỗi quyền — pattern nhất quán ở toàn bộ ~50 route đã khảo sát
- Kiểu dữ liệu tiền tệ dùng `BigInt` trong Prisma; luôn `Number(...)` khi tính toán và trả JSON (BigInt không serialize trực tiếp được qua `NextResponse.json`)
- Tính toán công nợ/doanh thu luôn thực hiện ở tầng API mỗi lần gọi (không cache, không lưu DB) — đúng nguyên tắc "Computed Values realtime"

### 9.2 Xử lý lỗi
- Trả lỗi bằng `NextResponse.json({ error: '...' }, { status })` với thông báo tiếng Việt rõ ràng, đúng ngữ cảnh nghiệp vụ (vd: "Chỉ học viên đang active mới được bảo lưu", "Không thể tạo lệnh hoàn tiền cho chương trình Coaching 1-1...")
- Validate input khá kỹ ở tầng API (không chỉ dựa vào FE): kiểm tra field bắt buộc, kiểm tra định dạng ngày, kiểm tra range hợp lý (vd: `paid_at` không được quá 7 ngày trong tương lai, bảo lưu tối đa 36 tháng)
- Route AI (`ai-suggest`) là nơi xử lý lỗi kỹ nhất trong toàn bộ code: phân loại lỗi theo nguyên nhân (quota, key sai, mạng, safety filter) để trả thông báo phù hợp thay vì lỗi chung chung
- `app/error.tsx` (Global Error Boundary) và các `error.tsx` theo route group `(admin)`, `(cnl)` — bắt lỗi runtime phía client, log `console.error`, hiện nút "Thử lại"
- `getCurrentUser()` bọc trong `try/catch`, log lỗi và trả `null` thay vì throw — tránh crash toàn trang khi session lỗi

### 9.3 Bảo mật dữ liệu
- Mật khẩu: `bcryptjs` hash (seed dùng cost factor 12), **không bao giờ trả `password_hash` ra response** (đã kiểm tra `select` trong các route liên quan không include field này ra ngoài, đúng Quy tắc đỏ nhóm 4)
- Phân quyền enforce ở tầng API (không chỉ ẩn UI) — ví dụ rõ nhất là chặn Refund Nhánh 2 và chặn CNL xem/thao tác ngoài lớp mình, đều nằm trong logic route chứ không phải chỉ ẩn nút trên giao diện
- `middleware.ts` chặn truy cập route cần đăng nhập ở tầng edge trước khi vào page/API
- Session dùng JWT ký bằng `NEXTAUTH_SECRET` — không lưu session trong DB, giảm bề mặt tấn công nhưng đồng nghĩa: thu hồi phiên đăng nhập tức thời (khi vô hiệu hóa 1 user) sẽ **không có hiệu lực ngay** cho tới khi JWT hết hạn hoặc user tự đăng xuất, vì `is_active` chỉ được kiểm tra lại ở các lệnh gọi `requireAdmin()/requireHomeroom()` (tức là vẫn kiểm tra mỗi request tới API bảo vệ — nên thực ra vẫn chặn được ngay với API, nhưng cần xác nhận middleware có gọi lại DB hay chỉ tin JWT)
- Smart Match dùng `$queryRaw` có tham số hoá (template literal của Prisma) — không nối chuỗi SQL trực tiếp, tránh SQL injection
- `.env.local` không commit (có trong `.gitignore`), `.env.example` chỉ chứa placeholder

### 9.4 Vận hành & rủi ro đã ghi nhận trong tài liệu nội bộ
- `KE_HOACH_MIGRATE_MYSQL.md` và `HUONG_DAN_BAN_GIAO_OPENCLAW.md` cho thấy quá trình migrate Auth từng bị chặn vì agent trước đó không có quyền push code lên GitHub, phải bàn giao qua patch/bundle file — nhưng nhìn code hiện tại trên đĩa thì việc migrate **đã hoàn tất và đang chạy** (không còn `lib/supabase.ts`, `package.json` không còn `@supabase/*`)
- Tài liệu `KE_HOACH_MIGRATE_MYSQL.md` còn lưu ý: build thật `npm run build` **chưa từng được xác nhận chạy sạch 100%** trong sandbox của agent trước (bị chặn mạng tới `binaries.prisma.sh`) — nên nếu VPS chưa build/deploy lại sau đợt migrate này, đây là việc cần làm và kiểm tra checklist đăng nhập trước khi coi là xong

---

## 10. Điểm cần lưu ý / rủi ro tài liệu

1. **Project Instructions trên Claude (gắn với phiên chat này) đã lỗi thời** so với code thật — vẫn ghi Supabase. Nên cập nhật lại nội dung Instructions trong Claude Projects để khớp MySQL + NextAuth, tránh các phiên làm việc sau bị nhầm và code sai stack.
2. `deploy.yml` thực tế trên đĩa **chưa có bước `prisma db push`** như `CLAUDE.md` mô tả — cần xác nhận lại: đang chạy tay trên VPS hay là thiếu sót cần bổ sung vào workflow.
3. `@anthropic-ai/sdk` có trong dependencies nhưng không thấy dùng ở đâu — nên xác nhận có đang dùng hay có thể gỡ bỏ để giảm surface.
4. Tính năng **Học bù (Makeup Session)** đã được code đầy đủ nhưng không được nhắc tới trong Project Instructions/CLAUDE.md phần nghiệp vụ chính — nên bổ sung tài liệu nghiệp vụ cho tính năng này để owner và các phiên AI sau nắm được.

---

*Tài liệu tổng hợp bởi Claude, dựa trên đọc trực tiếp: `package.json`, `prisma/schema.prisma`, `lib/*.ts`, `middleware.ts`, ~30 file route API, layout các route group, `CLAUDE.md`, `INSTRUCTIONS.md`, `KE_HOACH_MIGRATE_MYSQL.md`, `HUONG_DAN_BAN_GIAO_OPENCLAW.md`, `.github/workflows/deploy.yml`, `.env.example` trong repo thực tế.*
