# CLAUDE.md — CiT Hub · Single Source of Truth
> **Version 3.0** — Đã chốt toàn bộ quyết định kỹ thuật & nghiệp vụ  
> **ĐỌC FILE NÀY TRƯỚC KHI LÀM BẤT CỨ ĐIỀU GÌ.**  
> Không tự suy luận, không tự thêm tính năng ngoài file này.

---

## 1. THÔNG TIN DỰ ÁN

| Thông tin | Giá trị |
|---|---|
| **Tên hệ thống** | CiT Hub |
| **URL production** | https://hub.citedu.vn |
| **Công ty** | CiT EDU — Đào tạo Tư duy Thành đạt & Khởi nghiệp |
| **Quy mô** | 200–500 học viên/năm · 5 nhân sự dùng hệ thống |
| **Owner** | Giám đốc Huy Trần (non-code) |
| **Nguyên tắc viết code** | Dùng ngôn ngữ nghiệp vụ trong comment · Không over-engineer |

---

## 2. TECH STACK — KHÔNG ĐƯỢC THAY ĐỔI

```
Frontend:    Next.js 14 (App Router) + TypeScript
Styling:     Tailwind CSS + Shadcn UI
Database:    Supabase Cloud (PostgreSQL) — Free Tier
Auth:        Supabase Auth
             ❌ KHÔNG dùng NextAuth · ❌ KHÔNG dùng Better Auth
ORM:         Prisma — KHÔNG có relationMode (dùng mặc định foreignKeys)
             ✅ DB tự bảo vệ tính toàn vẹn dữ liệu bằng FK thật
Keep-Alive:  Cronjob trên VPS (cron mỗi 24h) ping SELECT 1 vào Supabase
             ❌ KHÔNG dùng GitHub Actions cho keep-alive
Process Mgr: PM2
Web Server:  Nginx + Let's Encrypt SSL
Hosting:     Hostinger VPS
CI/CD:       GitHub Actions — chỉ 1 workflow: deploy khi push main
AI Chatbot:  Google Gemini Pro API (Phase 5 — chưa làm)
Domain:      hub.citedu.vn → A record → IP Hostinger VPS
```

> **Về Supabase Free Tier:** 500MB là đủ cho 5–7 năm với quy mô hiện tại.
> Chỉ nâng lên Pro ($25/tháng) khi DB thực tế > 400MB. Không nâng sớm.

### Cấu trúc thư mục

```
cit-hub/
├── app/
│   ├── (auth)/             # login, logout
│   ├── (admin)/            # Chỉ ADMIN
│   │   ├── dashboard/      # Tổng quan + badge phiếu chờ duyệt
│   │   ├── contacts/
│   │   ├── leads/
│   │   ├── classes/
│   │   ├── finance/
│   │   └── reports/
│   └── (cnl)/              # CNL + ADMIN
│       ├── today/          # Màn hình chính CNL
│       ├── my-classes/
│       └── attendance/
├── components/
│   ├── ui/                 # Shadcn components (không sửa)
│   └── custom/             # CiT Hub custom components
├── lib/
│   ├── prisma.ts           # Prisma client + soft delete middleware
│   ├── supabase.ts         # Supabase client helpers
│   └── auth-helpers.ts     # requireAdmin() · requireHomeroom()
├── prisma/
│   └── schema.prisma       # Nguồn sự thật duy nhất cho DB
└── .github/workflows/
    └── deploy.yml          # Chỉ 1 workflow — deploy khi push main
```

---

## 3. PHÂN QUYỀN — BẤT DI BẤT DỊCH

### 3.1 Hai role duy nhất

| Role | Số lượng | Thiết bị chính |
|---|---|---|
| `ADMIN` | 2 người | Desktop |
| `HOMEROOM` (CNL — Chủ nhiệm lớp) | 3 người | Phone |

```
❌ KHÔNG có role thứ 3
❌ KHÔNG thêm role mới trong toàn bộ Phase 1–4
❌ Giảng viên KHÔNG có tài khoản hệ thống
```

### 3.2 Cách enforce phân quyền

```typescript
// lib/auth-helpers.ts — dùng trong MỌI API route, không exception
requireAdmin(request)    // 401 nếu không phải ADMIN
requireHomeroom(request) // 401 nếu không phải ADMIN hoặc HOMEROOM
```

### 3.3 Ma trận quyền đầy đủ

| Tính năng | ADMIN | CNL |
|---|---|---|
| Xem toàn bộ Contact/Lead | ✅ | ✅ (chỉ đọc) |
| Thêm / Sửa / Xóa Contact | ✅ | ❌ |
| Thêm ghi chú Contact/Lead | ✅ | ✅ |
| Sửa ghi chú | ✅ | ✅ (chỉ ghi chú của mình) |
| Xóa ghi chú | ✅ | ❌ |
| Phân Lead cho tư vấn viên | ✅ | ❌ |
| Tạo lớp / xếp lịch | ✅ | ❌ |
| Thêm / xóa học viên khỏi lớp | ✅ | ❌ |
| Xem lớp được phân công | ✅ | ✅ (lớp mình) |
| Điểm danh | ✅ | ✅ (lớp mình) |
| Bảo lưu / cho thôi học | ✅ | ❌ |
| Tạo phiếu thu | ✅ | ✅ (lớp mình) |
| Duyệt phiếu thu | ✅ | ❌ |
| Tạo lệnh hoàn tiền | ✅ | ✅ (lớp mình) |
| Duyệt lệnh hoàn tiền | ✅ | ❌ |
| Xem học phí / công nợ | ✅ tất cả | ✅ lớp mình |
| Báo cáo tổng doanh thu | ✅ | ❌ |
| Xóa dữ liệu (soft delete) | ✅ | ❌ |
| Import Google Sheets | ✅ | ❌ |

### 3.4 Contextual Finance

CNL chỉ thấy tài chính của học viên trong **lớp mình phụ trách**.  
CNL không thấy: doanh thu tổng, công nợ lớp khác, báo cáo tài chính toàn hệ thống.

---

## 4. DATABASE SCHEMA

### 4.1 Soft Delete Middleware

```typescript
// lib/prisma.ts
// Các bảng CÓ soft delete (dùng middleware tự động):
const SOFT_DELETE_MODELS = [
  'Contact', 'ContactNote', 'Lead', 'LeadNote',
  'Program', 'Class', 'ClassSession',
  'Enrollment', 'Payment', 'Refund'
]

// Middleware tự động lọc deleted_at: null khi findMany/findFirst/findUnique
// Khi "xóa": chỉ set deleted_at = now() + deleted_by_id
// ❌ TUYỆT ĐỐI KHÔNG dùng prisma.model.delete() cho các bảng trên
// ⚠️  Payment/Refund khi xóa: BẮT BUỘC có deletion_reason

// Các bảng KHÔNG soft delete (lịch sử bất biến):
// Attendance, Feedback — không bao giờ xóa dù bằng cách nào
```

### 4.2 Danh sách bảng

```
User                — Profile khớp với Supabase auth.users.id
Contact             — Mọi người biết đến CiT EDU (1 SĐT = 1 bản ghi)
ContactNote         — Ghi chú về CON NGƯỜI (tính cách, hoàn cảnh, sở thích...)
Lead                — Pipeline tư vấn (1 Contact → nhiều Lead theo thời gian)
LeadNote            — Ghi chú mỗi lần LIÊN HỆ TƯ VẤN (gọi điện, gặp mặt...)
Program             — Chương trình đào tạo (3 nhánh)
ProgramPrerequisite — Điều kiện lên cấp (Boolean logic OR/AND)
Lesson              — Bài giảng của từng chương trình
Class               — Lớp học cụ thể (instance của Program)
ClassSession        — Từng buổi học trong lớp
Enrollment          — Học viên đăng ký một lớp cụ thể
Attendance          — Điểm danh từng buổi (KHÔNG soft delete)
Feedback            — Đánh giá cuối buổi của học viên (KHÔNG soft delete)
Payment             — Phiếu thu học phí (có thể nhiều đợt)
Refund              — Lệnh hoàn tiền
MagicLink           — Link định danh ẩn cho form khai giảng / đánh giá
```

> **Không có bảng AuditLog ở Phase 1–3.**  
> Lightweight audit trail đã có qua: `created_by_id`, `deleted_by_id`, `updated_at` trên mỗi bảng.  
> Sẽ xem xét lại ở Phase 4 khi quy mô đòi hỏi.

### 4.3 Enums — nguồn sự thật

```prisma
enum UserRole {
  ADMIN
  HOMEROOM
}

enum ContactSource {
  facebook
  website
  hys         // CLB Thanh niên Khởi nghiệp
  referral    // Học viên giới thiệu (lưu người giới thiệu, không tính hoa hồng)
  event
  other
}

enum ContactStatus {
  lead        // Chưa đăng ký khóa nào
  customer    // Đang học hoặc đã học ít nhất 1 khóa
  alumni      // Đã hoàn thành, không còn học
  dropped     // Bỏ học, không còn liên hệ
}

enum LeadStage {
  new         // Mới vào, chưa có tư vấn viên
  consulting  // Đang được tư vấn
  won         // Đã chốt — tạo Enrollment
  lost        // Từ chối — bắt buộc có LostReason
}

enum LostReason {
  no_money
  no_time
  wrong_fit
  competitor
  dislike_teacher
  not_ready
  other       // Kèm ghi chú tự do
}

// ✅ CHỐT: Thêm 2 enum mới cho LeadNote
enum ContactMethod {
  call
  zalo
  meetup
  email
  other
}

enum ContactResult {
  answered
  no_answer
  callback_needed
  wrong_number
}

enum ProgramBranch {
  tu_duy      // Nhánh 1: Tư duy (có điều kiện lên cấp)
  coaching    // Nhánh 2: Coaching 1-1 Mật Thất (không hoàn tiền)
  ky_nang     // Nhánh 3: Kỹ năng bổ trợ
}

enum ClassFormat {
  offline
  online
  hybrid
}

enum ClassStatus {
  forming     // Đang tuyển sinh
  active      // Đang học
  completed   // Đã kết thúc
  cancelled
}

// ✅ CHỐT: Thêm suspended (bảo lưu)
enum EnrollmentStatus {
  waitlist    // Chờ mở lớp — chưa đóng tiền
  active      // Đang học
  suspended   // Bảo lưu tạm thời — sẽ quay lại
  completed   // Hoàn thành khóa học
  dropped     // Thôi học — kiểm tra công nợ trước khi cho drop
}

enum AttendanceStatus {
  present
  absent
  late
  leave_early
}

enum PaymentMethod {
  cash
  bank_transfer
}

enum PaymentStatus {
  pending     // CNL tạo, chờ Admin duyệt
  approved    // Admin đã duyệt — tính vào công nợ
  rejected    // Admin từ chối — kèm lý do
}

enum RefundStatus {
  pending
  approved
  rejected
}

enum MagicLinkContext {
  onboarding  // Form khai giảng
  evaluation  // Form đánh giá cuối buổi
}
```

### 4.4 Các trường quan trọng — phải có, không được bỏ

**Bảng `Enrollment`:**
```prisma
agreed_price    BigInt    // ✅ HỌC PHÍ THỎA THUẬN THỰC TẾ
                          // Có thể khác Program.price (VIP, ưu đãi, giới thiệu...)
                          // Nếu bằng giá niêm yết, vẫn phải nhập — không để null
                          // CÔNG NỢ = agreed_price - SUM(approved payments)

suspended_reason  String?   // Lý do bảo lưu (bắt buộc khi status = suspended)
suspended_until   DateTime? // Hạn bảo lưu (có thể để mở)
```

**Bảng `LeadNote`:**
```prisma
contact_method  ContactMethod   // ✅ Hình thức liên hệ (call/zalo/meetup/email/other)
contact_result  ContactResult   // ✅ Kết quả liên hệ (answered/no_answer/...)
next_followup_at DateTime?      // ✅ Ngày hẹn liên hệ lại — CỰC KỲ QUAN TRỌNG
                                // Dashboard "Lead cần gọi lại hôm nay" dựa vào trường này
```

**Bảng `MagicLink`:**
```prisma
expires_at  DateTime    // ✅ Mặc định: now() + 7 ngày
used_at     DateTime?   // Đã dùng lần đầu lúc nào (1-time use)
// Khi verify: kiểm tra expires_at > now() VÀ used_at IS NULL
```

**Bảng `Payment`:**
```prisma
paid_at     DateTime?   // ✅ Ngày tiền thực sự nhận được (do Admin nhập khi duyệt)
                        // Tách biệt created_at — phục vụ báo cáo cashflow tương lai
                        // KHÔNG để null khi approve — bắt buộc Admin nhập
```

### 4.5 Computed Values — TÍNH REALTIME, KHÔNG LƯU DB

```
Công nợ học viên     = Enrollment.agreed_price
                       − SUM(Payment.amount WHERE status = 'approved')

Tỷ lệ điểm danh     = COUNT(present + late) / COUNT(sessions đã qua)

Điểm TB đánh giá    = AVG(Feedback.rating) theo lớp hoặc buổi

Đủ điều kiện lên cấp = Query ProgramPrerequisite với Boolean logic:
                       cùng logic_group = OR · khác logic_group = AND

Tổng thu tháng      = SUM(Payment.amount WHERE status='approved'
                       AND paid_at BETWEEN start AND end)

Dự thu (công nợ)    = SUM(agreed_price) − SUM(approved payments)
                       WHERE EnrollmentStatus IN (active, suspended)
```

---

## 5. NGHIỆP VỤ CỐT LÕI

### 5.1 Chương trình đào tạo — 3 nhánh độc lập

**Nhánh 1 — Tư duy** (có lộ trình lên cấp)
```
Cấp 1 — OR logic (học 1 trong 2 là đủ điều kiện lên Cấp 2):
  ├── Tư duy Tài Năng
  └── Tư duy Khởi Nghiệp
Cấp 2 — Tư duy Thành Đạt  (điều kiện: hoàn thành ≥ 1 khóa Cấp 1)
Cấp 3 — Tư duy Đột Phá    (điều kiện: hoàn thành Cấp 2)
```
- Học phí theo khóa · Lên cấp = Enrollment mới · Lịch sử cấp cũ giữ nguyên
- Học viên được học bổ sung khóa Cấp 1 còn lại sau khi đã lên Cấp 2

**Nhánh 2 — Coaching 1-1 (Mật Thất)**
- 1 thầy 1 trò · Học phí theo năm
- **KHÔNG HOÀN TIỀN — quy tắc cứng, không exception, chặn tại UI**

**Nhánh 3 — Kỹ năng bổ trợ**
- Nhiều khóa đa dạng · Học phí theo khóa · Không điều kiện tiên quyết
- Học song song với Nhánh 1 hoặc 2

### 5.2 Vòng đời Lead

```
[new] → Phân công tư vấn viên
  → [consulting] → Ghi LeadNote mỗi lần liên hệ (method + result + followup_date)
      → [won]  → Tạo Enrollment (chọn lớp hoặc vào waitlist)
      → [lost] → Bắt buộc chọn LostReason (dropdown)
```

**Dashboard "Lead cần gọi lại hôm nay":**  
Query: `LeadNote.next_followup_at <= today AND Lead.stage = 'consulting'`  
Hiển thị nổi bật trên màn hình Admin mỗi khi đăng nhập.

### 5.3 Vòng đời Enrollment

```
[waitlist]  → Chưa đóng tiền · Chờ Admin mở lớp mới
  → [active]    → Đang học · Đóng tiền theo agreed_price
      → [suspended] → Bảo lưu · Admin nhập suspended_reason + suspended_until
                   → Khi quay lại: chuyển về active (tạo LeadNote ghi nhận)
      → [completed] → Hoàn thành khóa · ContactStatus → alumni (hoặc customer)
      → [dropped]   → Thôi học
                      ⚠️ CẢNH BÁO nếu còn công nợ trước khi cho phép drop
                      Admin phải xác nhận rõ ràng trước khi thực hiện
```

### 5.4 Học viên vào lớp sau khi lớp đã khai giảng

- Admin được phép thêm học viên vào lớp đang `active`
- **Bắt buộc** nhập `agreed_price` (Admin tự quyết — giảm hay giữ nguyên)
- Hệ thống hiển thị cảnh báo: _"Lớp đã học X/Y buổi"_
- Không có công thức tự động — Admin quyết định thủ công
- CNL không có quyền thêm học viên vào lớp

### 5.5 Luồng Thu học phí (2 bước)

```
1. CNL tạo Phiếu thu → status: pending
   └── Nhập: số tiền · hình thức (cash/bank) · ghi chú

2. Admin Dashboard hiển thị badge đỏ: "X phiếu chờ duyệt"
   └── Badge này hiển thị LUÔN LUÔN ở góc menu — không cần F5 để tìm

3. Admin mở phiếu → Duyệt hoặc Từ chối (bắt buộc ghi lý do nếu từ chối)
   └── Nếu Duyệt: Admin nhập paid_at (ngày nhận tiền thực tế)

4. Hệ thống tự cập nhật công nợ realtime
```

### 5.6 Luồng Hoàn tiền (2 bước)

```
1. CNL tạo Lệnh hoàn → status: pending
   └── ❌ NẾU là Nhánh 2 (Coaching 1-1): CHẶN ngay tại UI, không cho tạo

2. Admin thấy badge + duyệt/từ chối
```

### 5.7 Waitlist

- Lớp đã đủ 30 học viên → Lead chốt được sẽ vào `waitlist`
- Waitlist chưa đóng tiền (chỉ xác nhận miệng/ghi nhận)
- Admin mở lớp mới → Chọn từ danh sách waitlist → Chuyển sang `active`
- Khi chuyển: Admin nhập `agreed_price` cho Enrollment mới

### 5.8 Smart Match — Chống trùng Contact

```
Nhập SĐT mới →
  Không tìm thấy → Tạo Contact mới
  Tìm thấy      → Dùng Contact cũ, chỉ tạo Enrollment mới

Nguyên tắc: 1 SĐT = 1 Contact duy nhất trong toàn hệ thống
```

### 5.9 Import Google Sheets

- Được phép import **nhiều lần** (không phải 1 lần như kế hoạch cũ)
- Mỗi lần import chạy Smart Match tự động
- Sau import hiển thị báo cáo: **"X bản ghi mới · Y trùng SĐT đã bỏ qua · Z có thông tin khác — xem chi tiết"**
- Không tự động ghi đè — Admin review và quyết định thủ công

### 5.10 Notification tối giản (Phase 1)

Không làm email, không làm Zalo OA ở Phase 1. Chỉ cần:
- **Badge số đỏ** trên menu Admin: đếm `Payment.status = 'pending'`
- **Badge số đỏ** thứ hai: đếm `Refund.status = 'pending'`
- Badge đổi màu **cam** nếu phiếu chờ > 24 giờ (cảnh báo chậm duyệt)

> Phase 3: Xem xét thêm Zalo cá nhân webhook — phù hợp thực tế Việt Nam hơn email.

### 5.11 Keep-Alive Supabase — Cronjob trên VPS

```bash
# Chạy trên VPS bằng crontab — không dùng GitHub Actions
# Mỗi ngày lúc 3:00 sáng ping vào DB để Supabase không ngủ

0 3 * * * cd /var/www/cithub && npx prisma db execute \
  --url "$DATABASE_URL" --stdin <<< "SELECT 1;" >> /var/log/supabase-ping.log 2>&1
```

---

## 6. DESIGN SYSTEM

### 6.1 Brand Colors

```css
/* tailwind.config.ts */
colors: {
  navy:  { DEFAULT: '#0A1628', light: '#1A2E4A' },   /* Sidebar, Header */
  flame: { DEFAULT: '#E8471A', light: '#FF6B3D' },   /* Button CTA, trạng thái Active */
  ink:   { DEFAULT: '#111111', light: '#444444' },   /* Text chính */
}
```

### 6.2 Quy tắc áp dụng màu

| Thành phần | Màu |
|---|---|
| Sidebar, Header | `navy` #0A1628 |
| Button chính (CTA) | `flame` #E8471A · text trắng · rounded-lg |
| Text chính | `ink` #111111 |
| Badge: Active / Hoàn thành | `green-600` Tailwind |
| Badge: Cảnh báo / Nợ / Chờ duyệt | `amber-500` Tailwind |
| Badge: Lỗi / Lost / Từ chối | `red-600` Tailwind |
| Badge: Bảo lưu (suspended) | `blue-500` Tailwind |
| Badge: Số phiếu chờ duyệt | `red-600` nền · text trắng · tròn |

### 6.3 Typography

```
Font:         system-ui, -apple-system, sans-serif
              ❌ KHÔNG load Google Fonts (ảnh hưởng performance)
Heading:      font-weight: 700 · uppercase cho section title
Body:         16px · line-height: 1.7
Button text:  font-weight: 600
```

### 6.4 Responsive — Mobile First

```
default (< 640px):  Phone  — 1 cột · bottom navigation · nút min 44px height
sm (≥ 640px):       Tablet
md (≥ 768px):       Tablet ngang
lg (≥ 1024px):      Desktop — sidebar cố định · layout đa cột
```

### 6.5 Giao diện CNL — Nguyên tắc "1 chạm"

```
✅ Nút tối thiểu 44px height (WCAG AA — ngón tay dễ bấm)
✅ Bottom navigation: [Hôm nay] [Lớp học] [Học phí] [Thông báo]
✅ Điểm danh: nút [✅ Có mặt] [❌ Vắng] [⏰ Trễ] [🌙 Về sớm]
   → Tự lưu ngay khi bấm — KHÔNG cần nút Submit
✅ Tạo phiếu thu: chỉ 3 bước — chọn học viên · nhập số tiền · bấm Tạo
❌ KHÔNG yêu cầu gõ phím nhiều trong giờ học
❌ KHÔNG có popup xác nhận thêm (trừ khi action không thể hoàn tác)
```

---

## 7. QUY TẮC ĐỎ — TUYỆT ĐỐI KHÔNG VI PHẠM

```
❌ KHÔNG hard delete bất kỳ bảng nào có deleted_at → chỉ soft delete
❌ KHÔNG cho CNL xem tài chính lớp khác
❌ KHÔNG cho CNL xóa bất kỳ bản ghi nào
❌ KHÔNG cho CNL duyệt phiếu thu hoặc lệnh hoàn tiền
❌ KHÔNG tạo lệnh hoàn cho Coaching 1-1 (Nhánh 2) — chặn tại UI
❌ KHÔNG tạo bảng Session/Account/VerificationToken trong Prisma
   (Supabase Auth tự quản lý — không đụng vào)
❌ KHÔNG để học viên đăng nhập (không có Student Portal)
❌ KHÔNG thêm role mới ngoài ADMIN và HOMEROOM (Phase 1–4)
❌ KHÔNG lưu computed values vào DB (công nợ, điểm TB... tính realtime)
❌ KHÔNG xóa Payment/Refund mà không có deletion_reason
❌ KHÔNG cho lớp vượt quá max_students (mặc định 30)
❌ KHÔNG tính công nợ từ Program.price → phải từ Enrollment.agreed_price
❌ KHÔNG để agreed_price = null → khi đăng ký phải nhập (mặc định = Program.price)
❌ KHÔNG drop học viên còn công nợ mà không cảnh báo và xác nhận từ Admin
❌ KHÔNG tạo MagicLink không có expires_at → mặc định now() + 7 ngày
❌ KHÔNG dùng relationMode="prisma" → dùng foreign key thật của PostgreSQL
❌ KHÔNG deploy với npm install --production → dùng npm ci (cần devDeps)
❌ KHÔNG dùng pm2 restart → dùng pm2 reload (zero-downtime)
```

---

## 8. GITHUB ACTIONS — CHỈ 1 WORKFLOW

```yaml
# .github/workflows/deploy.yml
# Chạy khi push lên branch main
# GitHub Actions build + push schema lên DB, sau đó SCP .next lên VPS

name: Deploy CiT Hub
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Generate Prisma client
        run: npx prisma generate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
      - name: Push schema to database (db push — không cần migration files)
        run: npx prisma db push --skip-generate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_APP_URL: https://hub.citedu.vn
```

> **GitHub Secrets cần có:** `DATABASE_URL` · `DIRECT_URL` · `VPS_HOST` · `VPS_USER` · `VPS_SSH_KEY` · `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY`
>
> **`DIRECT_URL`** = DATABASE_URL nhưng bỏ `?pgbouncer=true&connection_limit=1` — dùng cho Prisma schema operations (db push, generate).
>
> **Keep-Alive không dùng GitHub Actions** — xem Mục 5.11 (cronjob trên VPS).

---

## 9. ENVIRONMENT VARIABLES

```bash
# .env.local trên VPS tại /var/www/cithub/

# Supabase
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE_ROLE_KEY]"

# App
NEXT_PUBLIC_APP_URL="https://hub.citedu.vn"
NODE_ENV="production"

# Phase 5 — chưa dùng
GEMINI_API_KEY="[KEY]"
```

---

## 10. ROADMAP — THỨ TỰ BUILD

> **Nguyên tắc:** Chặn "chảy máu" trước · Không build tính năng chưa cần.

### Phase 0 — Hạ tầng (làm 1 lần duy nhất)
- [ ] Tạo Supabase project · lấy 4 env variables
- [ ] Tạo tài khoản 5 nhân sự trong Supabase Auth
- [ ] Clone repo · cấu hình `.env.local` trên VPS
- [ ] `npx prisma migrate deploy` · `npx prisma db seed` (5 user accounts)
- [ ] Cấu hình Nginx + SSL Let's Encrypt
- [ ] Setup GitHub Actions deploy workflow
- [ ] Setup cronjob keep-alive trên VPS
- [ ] Xác nhận: hub.citedu.vn HTTPS xanh · đăng nhập được

### Phase 1 — MVP: Lớp học & Dòng tiền ⭐ QUAN TRỌNG NHẤT
- [ ] Auth: đăng nhập · middleware phân quyền · redirect theo role
- [ ] Admin: tạo lớp · tạo ClassSession · thêm học viên (nhập agreed_price)
- [ ] CNL: xem lớp mình · danh sách học viên · thông tin học phí
- [ ] Thu học phí: CNL tạo phiếu → Admin thấy badge → Admin duyệt + nhập paid_at
- [ ] Dashboard Admin: tổng công nợ · badge phiếu chờ duyệt · lead cần gọi lại hôm nay

### Phase 2 — CRM ⭐ Kéo lên sớm (bài toán rơi lead cấp bách)
- [ ] Quản lý Contact: tạo · sửa · tìm kiếm · Smart Match SĐT
- [ ] Pipeline Lead: Kanban 4 cột (new/consulting/won/lost)
- [ ] LeadNote: ghi mỗi lần liên hệ (method + result + next_followup_at)
- [ ] Dashboard "Lead cần gọi lại hôm nay"
- [ ] Import Google Sheets: smart match + báo cáo X mới / Y trùng / Z xung đột

### Phase 3 — Vận hành lớp học
- [ ] Điểm danh 1 chạm trên điện thoại CNL
- [ ] Form đánh giá cuối buổi (MagicLink · expires_at · 1-time use)
- [ ] Quản lý bài giảng (Lesson content · xem theo lớp)
- [ ] Hoàn tiền workflow (chặn Nhánh 2)
- [ ] Waitlist management
- [ ] Bảo lưu học viên (suspended + suspended_reason + suspended_until)
- [ ] Học viên vào lớp muộn (cảnh báo X/Y buổi đã học · Admin nhập agreed_price)

### Phase 4 — Báo cáo & Tiện ích
- [ ] Báo cáo doanh thu theo tháng (theo paid_at)
- [ ] Báo cáo công nợ tổng · dự thu (enrolled nhưng chưa đủ tiền)
- [ ] Lọc học viên đủ điều kiện lên cấp
- [ ] Xem xét AuditLog nếu quy mô đòi hỏi

### Phase 5 — AI & Automation
- [ ] Gemini Pro Chatbot truy xuất dữ liệu
- [ ] Zalo cá nhân webhook thông báo phiếu thu mới cho Admin

---

## 11. CÁCH VIẾT PROMPT C-R-A-F-T

Mọi tính năng mới đều dùng cấu trúc sau — giữ đúng thứ tự:

```
[C - CONTEXT]
Đọc file CLAUDE.md v3.0.
Stack: Next.js 14 App Router · TypeScript · Supabase Auth · Prisma · Shadcn UI · Tailwind.
Brand colors: navy (#0A1628) · flame (#E8471A) · ink (#111111).
Mobile-first. Nút tối thiểu 44px.

[R - RED LINES]
(Copy các dòng ❌ liên quan từ Mục 7 của CLAUDE.md vào đây)

[A - ACTION]
(Mô tả tính năng cần làm bằng ngôn ngữ nghiệp vụ — ai làm gì, mục đích gì)

[F - FLOW]
(Các bước người dùng thực hiện trên UI — ai mở màn hình nào · bấm gì · thấy gì · nhập gì)

[T - TEST]
✅ Trường hợp thành công: (kết quả kỳ vọng)
❌ Trường hợp lỗi phải báo: (các edge case phải xử lý)
```

---

## 12. CHECKLIST TRƯỚC KHI VIẾT CODE

AI phải tự kiểm tra trước khi viết bất kỳ dòng code nào:

```
[ ] Đã đọc CLAUDE.md v3.0 chưa?
[ ] Role nào dùng tính năng này? ADMIN / HOMEROOM / cả hai?
[ ] Có vi phạm Red Line nào trong Mục 7 không?
[ ] Có soft delete → dùng middleware, không viết DELETE SQL tay?
[ ] CNL đang xem đúng phạm vi lớp mình không?
[ ] UI mobile-first? Nút ≥ 44px?
[ ] Màu đúng brand: navy/flame/ink?
[ ] Computed values tính realtime, không lưu vào DB?
[ ] Công nợ tính từ agreed_price (không phải Program.price)?
[ ] Payment/Refund → có workflow 2 bước không? Admin có thấy badge không?
[ ] Khi duyệt Payment → có nhập paid_at không?
[ ] MagicLink → có expires_at = now()+7days không? Có check used_at chưa?
[ ] Drop enrollment → có check công nợ và cảnh báo Admin không?
[ ] Tạo Enrollment → đã nhập agreed_price (không để null) chưa?
```

---

*CLAUDE.md v3.0 · Tháng 5/2026*  
*Mọi quyết định đã chốt — không tranh luận lại · Cập nhật khi có quyết định mới từ owner.*
