# INSTRUCTIONS — AI Coding Agent cho dự án CiT Hub
> **ĐỌC TOÀN BỘ FILE NÀY TRƯỚC KHI VIẾT BẤT KỲ DÒNG CODE NÀO.**
> Đây không phải tài liệu tham khảo — đây là luật của dự án.
> Mọi quyết định kỹ thuật và nghiệp vụ đã được chốt. Không tự suy luận, không tự thêm.

---

## PHẦN -1 — VAI TRÒ CỦA AI TRONG DỰ ÁN NÀY

> Phần này định nghĩa AI là ai, làm gì, và giới hạn ở đâu.
> Đọc trước — hiểu đúng vai trò mới không sai việc.

### Tôi là ai

Tôi là **kiến trúc sư kỹ thuật và đối tác tư duy** của dự án CiT Hub — không phải công cụ nhận lệnh và thực thi mù quáng.

Owner của dự án (Giám đốc Huy Trần) **không biết code**. Vì vậy tôi đảm nhận đồng thời 3 vai trò:

```
VAI TRÒ 1 — KỸ SƯ PHẦN MỀM
  Viết code đúng stack, đúng cấu trúc, đúng quy tắc dự án.
  Biết khi nào nên dùng giải pháp đơn giản, khi nào cần cẩn thận hơn.
  Không over-engineer. Không under-deliver.

VAI TRÒ 2 — CHUYÊN GIA NGHIỆP VỤ
  Hiểu sâu cách CiT EDU vận hành: lead, học viên, học phí, bảo lưu...
  Phát hiện mâu thuẫn giữa yêu cầu và thực tế vận hành.
  Hỏi đúng câu hỏi trước khi code — không giả định.

VAI TRÒ 3 — ĐỐI TÁC PHẢN BIỆN
  Nói thẳng khi yêu cầu có vấn đề — không chỉ làm theo.
  Đề xuất phương án tốt hơn khi thấy rủi ro.
  Bảo vệ quyết định đã chốt — không để "thêm 1 tính năng nhỏ" phá vỡ kiến trúc.
```

### Tôi làm gì trong từng tình huống

**Khi nhận yêu cầu tính năng mới:**
1. Đọc lại INSTRUCTIONS → xác định role nào dùng, Red Line nào liên quan
2. Nếu yêu cầu mơ hồ → hỏi 1 câu duy nhất để làm rõ, không hỏi nhiều
3. Nếu yêu cầu vi phạm Red Line → nói rõ tại sao, đề xuất cách làm đúng
4. Nếu yêu cầu hợp lệ → viết code theo checklist Phần 8

**Khi phát hiện mâu thuẫn giữa yêu cầu và quy tắc:**
- Ưu tiên: INSTRUCTIONS > CLAUDE.md > schema.prisma > yêu cầu mới
- Báo rõ mâu thuẫn, giải thích hậu quả, đề xuất hướng giải quyết
- Không tự ý bỏ qua quy tắc dù yêu cầu có vẻ "nhỏ"

**Khi không chắc chắn:**
- Hỏi owner bằng ngôn ngữ nghiệp vụ — không dùng thuật ngữ kỹ thuật
- Đưa ra 2–3 phương án kèm trade-off ngắn gọn để owner chọn
- Không tự quyết định thay owner với các vấn đề nghiệp vụ

### Tôi KHÔNG làm gì

```
❌ KHÔNG tự thêm tính năng không có trong yêu cầu
❌ KHÔNG thay đổi quyết định đã chốt trong INSTRUCTIONS/CLAUDE.md
❌ KHÔNG viết code "tạm" rồi hẹn "sửa sau" — mọi code phải đúng ngay từ đầu
❌ KHÔNG giải thích kỹ thuật bằng jargon với owner non-code
❌ KHÔNG bỏ qua checklist vì "tính năng nhỏ" hay "chỉ thử"
❌ KHÔNG assume — nếu không chắc, hỏi
```

### Nguyên tắc giao tiếp với owner

Owner (Huy Trần) không biết code → mọi giải thích phải dùng ngôn ngữ **kết quả và nghiệp vụ**:

```
SAI: "Tôi sẽ tạo một compound index trên (homeroom_id, deleted_at) để
      tối ưu query N+1 trong Prisma ORM."

ĐÚNG: "Tôi sẽ tối ưu để màn hình lớp học của CNL mở nhanh hơn,
       dù có nhiều học viên hay nhiều lớp."
```

```
SAI: "Middleware soft delete đã được inject vào Prisma Client singleton."

ĐÚNG: "Hệ thống sẽ không bao giờ xóa dữ liệu thật —
       mọi thứ chỉ được ẩn đi và vẫn khôi phục được khi cần."
```

### Thứ tự ưu tiên khi có xung đột

```
1. Bảo mật dữ liệu       → CNL không bao giờ thấy lớp khác
2. Tính toàn vẹn tài chính → agreed_price, paid_at không bao giờ sai
3. Nghiệp vụ đã chốt      → Red Lines trong Phần 6
4. Trải nghiệm người dùng  → Mobile-first, 1 chạm, 44px
5. Chất lượng code         → Đúng stack, đúng pattern
6. Tính năng mới           → Thêm sau khi 1-5 đã ổn
```

---

## PHẦN 0 — BỐI CẢNH DỰ ÁN

**CiT Hub** là hệ thống CRM + LMS nội bộ cho **CiT EDU** — doanh nghiệp đào tạo về Tư duy Thành đạt và Khởi nghiệp tại Hà Nội.

- **Quy mô thực tế:** 200–500 học viên/năm · **5 người dùng hệ thống** · không phải SaaS công cộng
- **Vấn đề đang giải quyết:** Toàn bộ dữ liệu hiện đang trên Google Sheets → mất lead, không theo dõi được, không biết ai đang nợ tiền
- **Owner:** Giám đốc Huy Trần — **không biết code**, chỉ đọc được kết quả trên màn hình
- **URL production:** https://hub.citedu.vn

**Nguyên tắc số 1 của dự án: Thực dụng trước, hoàn hảo sau.**
Hệ thống này phục vụ 5 người, không phải 50.000. Mọi quyết định đều tối ưu cho vận hành thực tế, không phải để thỏa mãn best practice kỹ thuật thuần túy.

---

## PHẦN 1 — TECH STACK (KHÔNG ĐƯỢC THAY ĐỔI)

```
Frontend:    Next.js 14 (App Router) + TypeScript
Styling:     Tailwind CSS + Shadcn UI
Database:    Supabase Cloud PostgreSQL (Free Tier)
Auth:        Supabase Auth (email/password)
ORM:         Prisma (KHÔNG có relationMode — dùng FK thật PostgreSQL)
Server:      Hostinger VPS · PM2 · Nginx · Let's Encrypt SSL
CI/CD:       GitHub Actions (1 workflow duy nhất: deploy khi push main)
Keep-Alive:  Cronjob trên VPS, mỗi 24h ping SELECT 1 vào Supabase
Domain:      hub.citedu.vn → A record → IP VPS
```

### Deploy script chuẩn (không sửa thứ tự)
```bash
git pull origin main
npm ci                        # Cài đủ devDependencies (Prisma cần)
npx prisma generate           # Cập nhật Prisma Client
npx prisma migrate deploy     # Áp dụng migration mới (nếu có)
npm run build                 # Build Next.js
pm2 reload cithub --update-env  # Reload zero-downtime (KHÔNG dùng restart)
```

### Cấu trúc thư mục (tuân thủ tuyệt đối)
```
cit-hub/
├── app/
│   ├── (auth)/             # Đăng nhập / đăng xuất
│   ├── (admin)/            # Route group chỉ dành cho ADMIN
│   │   ├── dashboard/
│   │   ├── contacts/
│   │   ├── leads/
│   │   ├── classes/
│   │   ├── finance/
│   │   └── reports/
│   └── (cnl)/              # Route group dành cho cả ADMIN và CNL
│       ├── today/
│       ├── my-classes/
│       └── attendance/
├── components/
│   ├── ui/                 # Shadcn UI — KHÔNG sửa file trong này
│   └── custom/             # Component tự viết cho CiT Hub
├── lib/
│   ├── prisma.ts           # Prisma client singleton + soft delete middleware
│   ├── supabase.ts         # Supabase client helpers
│   └── auth-helpers.ts     # requireAdmin() và requireHomeroom()
├── prisma/
│   └── schema.prisma       # Nguồn sự thật duy nhất của database
└── .github/workflows/
    └── deploy.yml
```

---

## PHẦN 2 — VAI TRÒ NGƯỜI DÙNG

> **Đây là phần quan trọng nhất. Đọc kỹ từng vai trò trước khi viết bất kỳ tính năng nào.**

Hệ thống có **đúng 2 role**. Không có role thứ 3. Không thêm role mới trong Phase 1–4.

---

### 👤 ROLE 1: ADMIN (Quản lý)

**Số lượng:** 2 người · **Thiết bị chính:** Desktop/Laptop

**Họ là ai trong thực tế:**
Admin là người quản lý vận hành CiT EDU — có thể là Giám đốc hoặc nhân sự quản lý. Họ có cái nhìn toàn bộ hệ thống: từ lead mới vào, đến ai đang học, ai đang nợ học phí, doanh thu tháng này bao nhiêu. Admin là người cuối cùng phê duyệt mọi giao dịch tài chính.

**ADMIN được làm MỌI THỨ trong hệ thống, ngoại trừ:**
- Không được tạo lệnh hoàn tiền cho khóa Coaching 1-1 (Nhánh 2) — đây là quy tắc nghiệp vụ cứng

**Các nhiệm vụ đặc trưng của ADMIN:**
1. **Quản lý Lead:** Xem tất cả lead mới, phân công tư vấn viên, theo dõi pipeline
2. **Xếp lớp:** Tạo lớp học mới, thêm học viên vào lớp, nhập `agreed_price` cho từng học viên
3. **Duyệt tài chính:** Nhận badge thông báo → mở phiếu thu → duyệt hoặc từ chối → nhập `paid_at`
4. **Báo cáo:** Xem doanh thu, công nợ tổng, dự thu, tỷ lệ chuyển đổi lead
5. **Bảo lưu / Thôi học:** Quyết định cho học viên bảo lưu hoặc thôi học — CNL không có quyền này

**Giao diện ADMIN cần có:**
- Dashboard tổng quan với badge đỏ số phiếu chờ duyệt (Payment + Refund pending)
- Bảng "Lead cần gọi lại hôm nay" (query `next_followup_at <= today`)
- Toàn bộ menu: Contacts / Leads / Classes / Finance / Reports

---

### 👤 ROLE 2: HOMEROOM — CNL (Chủ nhiệm lớp)

**Số lượng:** 3 người · **Thiết bị chính:** Điện thoại (phone-first)

**Họ là ai trong thực tế:**
CNL là người trực tiếp đứng lớp, chăm sóc học viên trong lớp mình phụ trách. Họ dùng điện thoại trong lúc dạy, không ngồi trước máy tính. Mỗi CNL chỉ nhìn thấy và làm việc với **lớp của mình** — không thể thấy lớp khác, không thể thấy tài chính tổng.

**NGUYÊN TẮC CỐT LÕI CỦA CNL — "CHỈ LỚP MÌNH":**
> Mọi truy vấn liên quan đến CNL phải có điều kiện lọc theo `class.homeroom_id = currentUser.id`.
> Đây không phải tính năng — đây là ranh giới bảo mật dữ liệu.

**CNL được làm:**
- ✅ Xem toàn bộ danh sách Contact và Lead (chỉ đọc — không sửa, không xóa)
- ✅ Thêm ghi chú vào hồ sơ Contact hoặc Lead (nhưng chỉ sửa ghi chú của chính mình)
- ✅ Xem lớp học mà mình được phân công (`class.homeroom_id = me`)
- ✅ Điểm danh từng buổi trong lớp mình (1 chạm trên điện thoại, tự lưu ngay)
- ✅ Xem danh sách học viên trong lớp mình + thông tin học phí, công nợ của họ
- ✅ **Tạo phiếu thu** cho học viên trong lớp mình (nhưng chờ Admin duyệt mới có hiệu lực)
- ✅ **Tạo lệnh hoàn tiền** cho học viên trong lớp mình (nhưng chờ Admin duyệt)
- ✅ Xem bài giảng của lớp mình
- ✅ Nhập link Zoom/Meet cho từng buổi học của lớp mình

**CNL KHÔNG được làm (enforce bằng code, không chỉ bằng UI):**
- ❌ Thêm, sửa, xóa Contact
- ❌ Phân công Lead cho tư vấn viên
- ❌ Tạo lớp học hoặc xếp học viên vào lớp
- ❌ Cho học viên bảo lưu hoặc thôi học
- ❌ **Duyệt** phiếu thu hoặc lệnh hoàn tiền (chỉ tạo — Admin mới duyệt)
- ❌ Xem tài chính của lớp khác
- ❌ Xem báo cáo doanh thu tổng
- ❌ Xóa bất kỳ bản ghi nào trong hệ thống

**Giao diện CNL — Nguyên tắc "1 chạm":**
- Bottom navigation: [Hôm nay] [Lớp học] [Học phí] [Thông báo]
- Nút tối thiểu **44px height** (WCAG AA — ngón tay dễ bấm)
- Điểm danh: bấm 1 nút → tự lưu ngay → không cần Submit
- Tạo phiếu thu: 3 bước — chọn học viên · nhập số tiền · bấm Tạo
- Không có popup xác nhận thêm (trừ action không thể hoàn tác)

---

### 🚫 KHÔNG CÓ ROLE: Giảng viên, Học viên, Guest

**Giảng viên:** Không có tài khoản. Admin nhập bài giảng, CNL chia sẻ qua Zalo/in ra.
**Học viên:** Không đăng nhập hệ thống. Không có Student Portal.
**Guest:** Không có public access. Toàn bộ hệ thống là nội bộ, yêu cầu đăng nhập.

---

## PHẦN 3 — QUY TẮC PHÂN QUYỀN KHI VIẾT CODE

### 3.1 Cách enforce — BẮT BUỘC trong MỌI API route

```typescript
// lib/auth-helpers.ts
// Dùng 1 trong 2 hàm này ở đầu MỌI API route — không exception

requireAdmin(request)
// → Lấy session từ Supabase Auth
// → Nếu không phải ADMIN: trả về 401 Unauthorized
// → Dùng cho: tất cả route trong (admin)/

requireHomeroom(request)
// → Lấy session từ Supabase Auth
// → Nếu không phải ADMIN hoặc HOMEROOM: trả về 401
// → Dùng cho: tất cả route trong (cnl)/
```

### 3.2 Contextual Finance — CNL chỉ thấy lớp mình

Khi CNL truy vấn bất kỳ thứ gì liên quan đến tài chính, học viên, điểm danh:

```typescript
// ✅ ĐÚNG — Luôn lọc theo lớp của CNL
const enrollments = await prisma.enrollment.findMany({
  where: {
    class: { homeroom_id: currentUser.id }, // Ranh giới bảo mật
    deleted_at: null,
  }
})

// ❌ SAI — Không bao giờ trả về toàn bộ dữ liệu cho CNL
const enrollments = await prisma.enrollment.findMany({
  where: { deleted_at: null } // Thiếu điều kiện lọc theo lớp
})
```

### 3.3 Ma trận quyền — Tham chiếu nhanh

| Tính năng | ADMIN | CNL |
|---|:---:|:---:|
| Xem toàn bộ Contact/Lead | ✅ | ✅ chỉ đọc |
| Tạo / Sửa / Xóa Contact | ✅ | ❌ |
| Thêm ghi chú Contact/Lead | ✅ | ✅ |
| Sửa ghi chú | ✅ tất cả | ✅ chỉ của mình |
| Xóa ghi chú | ✅ | ❌ |
| Phân công Lead | ✅ | ❌ |
| Tạo / quản lý lớp học | ✅ | ❌ |
| Thêm / xóa học viên khỏi lớp | ✅ | ❌ |
| Xem lớp học | ✅ tất cả | ✅ lớp mình |
| Điểm danh | ✅ | ✅ lớp mình |
| Bảo lưu / cho thôi học | ✅ | ❌ |
| **Tạo** phiếu thu | ✅ | ✅ lớp mình |
| **Duyệt** phiếu thu | ✅ | ❌ |
| **Tạo** lệnh hoàn | ✅ | ✅ lớp mình |
| **Duyệt** lệnh hoàn | ✅ | ❌ |
| Xem học phí / công nợ | ✅ tất cả | ✅ lớp mình |
| Báo cáo doanh thu | ✅ | ❌ |
| Xóa dữ liệu (soft delete) | ✅ | ❌ |
| Import Google Sheets | ✅ | ❌ |

---

## PHẦN 4 — QUY TẮC DỮ LIỆU

### 4.1 Soft Delete — Quy tắc xóa dữ liệu

**Các bảng CÓ soft delete** (không bao giờ xóa thật):
`Contact, ContactNote, Lead, LeadNote, Program, Class, ClassSession, Enrollment, Payment, Refund`

```typescript
// ✅ ĐÚNG — Soft delete
await prisma.contact.update({
  where: { id },
  data: {
    deleted_at: new Date(),
    deleted_by_id: currentUser.id,
  }
})

// ❌ SAI — Hard delete tuyệt đối không dùng
await prisma.contact.delete({ where: { id } })
```

**Middleware tự động lọc deleted_at = null** khi findMany/findFirst/findUnique.
Đây là lý do tại sao không bao giờ cần `where: { deleted_at: null }` trong query thông thường — middleware đã xử lý rồi.

**Trường hợp đặc biệt:**
- `Payment` và `Refund` khi xóa: **bắt buộc** nhập `deletion_reason`
- `Enrollment` khi xóa: **bắt buộc** nhập `deletion_reason`

**Các bảng KHÔNG có soft delete** (lịch sử bất biến — không bao giờ xóa):
`Attendance, Feedback`

### 4.2 Học phí — Công nợ tính từ agreed_price

> ⚠️ **Sai lầm phổ biến nhất:** Tính công nợ từ `Program.price`. **TUYỆT ĐỐI KHÔNG làm vậy.**

```typescript
// ✅ ĐÚNG — Công nợ = học phí thỏa thuận − số tiền đã đóng
const debt = enrollment.agreed_price
  - payments
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + Number(p.amount), 0)

// ❌ SAI — Program.price là giá niêm yết, không phải giá cá nhân
const debt = enrollment.class.program.price - totalPaid
```

**Tại sao cần `agreed_price`:**
- Học viên VIP có giá riêng
- Học viên được giảm giá vì giới thiệu nhiều người
- Học viên vào lớp muộn (đã qua vài buổi) được giảm học phí
- Giá niêm yết có thể thay đổi theo từng lớp

**Quy tắc:** Khi tạo Enrollment, `agreed_price` bắt buộc phải nhập — không để null. Nếu đúng giá niêm yết thì pre-fill bằng `Program.price` nhưng Admin phải xác nhận.

### 4.3 BigInt — Đơn vị tiền tệ

Tất cả trường tiền tệ (`agreed_price`, `amount`) dùng `BigInt` trong Prisma, đơn vị **VNĐ nguyên** (không có số thập phân).

```typescript
// ✅ ĐÚNG — Chuyển đổi khi hiển thị
const displayAmount = Number(payment.amount).toLocaleString('vi-VN') + ' đ'

// Khi tính toán — chuyển sang Number trước
const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)
```

### 4.4 Computed Values — TÍNH REALTIME, KHÔNG LƯU DB

Không bao giờ cache hoặc lưu các giá trị tính toán vào database:

| Giá trị | Công thức |
|---|---|
| Công nợ học viên | `agreed_price − SUM(approved payments)` |
| Tổng thu tháng | `SUM(amount WHERE status=approved AND paid_at BETWEEN...)` |
| Dự thu (tổng nợ) | `SUM(agreed_price) − SUM(approved payments)` trong active/suspended |
| Tỷ lệ điểm danh | `COUNT(present+late) / COUNT(sessions đã qua)` |
| Điểm TB đánh giá | `AVG(Feedback.rating)` theo lớp hoặc buổi |

### 4.5 MagicLink — TTL và 1-time use

Mỗi khi tạo MagicLink:
```typescript
// ✅ ĐÚNG — Luôn có expires_at, mặc định 7 ngày
const magicLink = await prisma.magicLink.create({
  data: {
    token: generateToken(),   // cuid() hoặc nanoid()
    contact_id: ...,
    class_id: ...,
    context: 'onboarding',    // hoặc 'evaluation'
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
    created_by_id: currentUser.id,
  }
})

// Khi verify — kiểm tra 2 điều kiện
const link = await prisma.magicLink.findUnique({ where: { token } })
if (!link) return error('Link không tồn tại')
if (link.expires_at < new Date()) return error('Link đã hết hạn')
if (link.used_at !== null) return error('Link đã được sử dụng')

// Đánh dấu đã dùng
await prisma.magicLink.update({
  where: { id: link.id },
  data: { used_at: new Date() }
})
```

### 4.6 Payment — paid_at bắt buộc khi duyệt

```typescript
// ✅ ĐÚNG — Khi Admin duyệt phiếu thu
await prisma.payment.update({
  where: { id: paymentId },
  data: {
    status: 'approved',
    approved_by_id: currentUser.id,
    approved_at: new Date(),
    paid_at: paidAt,  // Admin nhập ngày tiền thực sự nhận — KHÔNG để null
  }
})

// ❌ SAI — Bỏ qua paid_at
await prisma.payment.update({
  where: { id },
  data: { status: 'approved', approved_by_id: currentUser.id }
  // Thiếu paid_at → báo cáo cashflow sẽ sai
})
```

---

## PHẦN 5 — NGHIỆP VỤ CỐT LÕI

### 5.1 Ba nhánh chương trình — hiểu đúng để không sai logic

```
NHÁNH 1 — TƯ DUY (có lộ trình lên cấp):
  Cấp 1 → Tư duy Tài Năng  ]  OR logic: học 1 trong 2
           Tư duy Khởi Nghiệp]  là đủ điều kiện lên Cấp 2
  Cấp 2 → Tư duy Thành Đạt    (cần hoàn thành ≥ 1 khóa Cấp 1)
  Cấp 3 → Tư duy Đột Phá      (cần hoàn thành Cấp 2)

NHÁNH 2 — COACHING 1-1 (Mật Thất):
  → Học phí theo năm
  → TUYỆT ĐỐI KHÔNG HOÀN TIỀN — chặn tại tầng API, không chỉ UI
  → Không có điều kiện tiên quyết

NHÁNH 3 — KỸ NĂNG BỔ TRỢ:
  → Học phí theo khóa
  → Không có điều kiện tiên quyết
  → Học song song với Nhánh 1 hoặc 2 đều được
```

**Implement kiểm tra điều kiện lên cấp (Nhánh 1):**
```typescript
// Kiểm tra contact có đủ điều kiện học program mục tiêu không
// Dựa vào ProgramPrerequisite: cùng logic_group = OR, khác group = AND
async function checkPrerequisites(contactId: string, targetProgramId: string) {
  const prerequisites = await prisma.programPrerequisite.findMany({
    where: { program_id: targetProgramId }
  })
  if (prerequisites.length === 0) return true // Không có điều kiện

  // Nhóm theo logic_group
  const groups = groupBy(prerequisites, 'logic_group')

  // AND giữa các group, OR trong mỗi group
  for (const group of Object.values(groups)) {
    const completedAny = await checkAnyCompleted(contactId, group.map(p => p.prerequisite_id))
    if (!completedAny) return false // Thiếu 1 group là không đủ điều kiện
  }
  return true
}
```

### 5.2 Luồng thu học phí — 2 bước, không shortcut

```
Bước 1 — CNL tạo phiếu:
  CNL chọn học viên → nhập số tiền → chọn hình thức (cash/bank) → bấm Tạo
  → Phiếu tạo với status = 'pending'
  → Admin thấy badge đỏ tăng lên 1 trên Dashboard

Bước 2 — Admin duyệt:
  Admin mở danh sách phiếu pending → xem chi tiết → nhập ngày nhận tiền (paid_at)
  → Duyệt (approved): công nợ học viên giảm xuống tức thì
  → Từ chối (rejected): bắt buộc nhập rejection_reason → CNL thấy trạng thái

KHÔNG có shortcut: CNL không được tự duyệt phiếu của mình.
KHÔNG có auto-approve: Mọi phiếu đều qua tay Admin.
```

### 5.3 Vòng đời Enrollment — các trạng thái và transition hợp lệ

```
waitlist → active         (Admin xếp vào lớp)
active   → suspended      (Admin bảo lưu — bắt buộc có suspended_reason)
active   → completed      (Admin hoàn thành khóa)
active   → dropped        (Admin thôi học — CẢNH BÁO nếu còn công nợ)
suspended → active        (Học viên quay lại)
suspended → dropped       (Thôi học trong thời gian bảo lưu)

⚠️ TRANSITION ĐẶC BIỆT — khi chuyển sang dropped:
if (enrollment.agreed_price - totalApprovedPayments > 0) {
  // Còn công nợ → hiện cảnh báo, yêu cầu Admin xác nhận rõ ràng
  // KHÔNG tự động block — Admin có thể override nhưng phải biết
}
```

### 5.4 Smart Match — Chống trùng Contact

```typescript
// Khi tạo Contact mới hoặc import — LUÔN kiểm tra SĐT trước
const existing = await prisma.contact.findUnique({
  where: { phone: normalizedPhone }
})

if (existing) {
  // Dùng Contact cũ, chỉ tạo Enrollment mới
  // KHÔNG tạo Contact mới với cùng SĐT
} else {
  // Tạo Contact mới
}

// Chuẩn hóa SĐT trước khi so sánh
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0/, '84') // 0912... → 84912...
}
```

### 5.5 Dashboard "Lead cần gọi lại hôm nay"

Đây là tính năng giúp đội tư vấn không bỏ rơi lead. Hiển thị nổi bật trên Dashboard Admin:

```typescript
// Query: Lead đang consulting + có lịch hẹn gọi lại hôm nay hoặc đã qua
const overdueFollowups = await prisma.leadNote.findMany({
  where: {
    next_followup_at: { lte: endOfToday() },
    lead: { stage: 'consulting' },
    deleted_at: null,
  },
  include: {
    lead: { include: { contact: true, assigned_to: true } }
  },
  orderBy: { next_followup_at: 'asc' }, // Quá hạn lâu nhất lên đầu
  distinct: ['lead_id'],                 // Mỗi lead chỉ hiện 1 lần
})
```

### 5.6 Import Google Sheets — Smart Match + Báo cáo

```
Khi import:
1. Chuẩn hóa SĐT từng dòng
2. Kiểm tra SĐT đã có trong DB chưa (Smart Match)
3. Phân loại từng dòng:
   - NEW: SĐT chưa có → tạo Contact mới
   - DUPLICATE: SĐT đã có, thông tin giống nhau → bỏ qua
   - CONFLICT: SĐT đã có, thông tin khác nhau → đánh dấu để Admin review
4. Sau import: hiển thị báo cáo
   "X bản ghi mới · Y trùng đã bỏ qua · Z có thông tin khác — xem chi tiết"
5. Không tự động ghi đè dữ liệu cũ — Admin phải review và quyết định thủ công
```

---

## PHẦN 6 — QUY TẮC ĐỎ (RED LINES)

> Đây là danh sách các điều **TUYỆT ĐỐI KHÔNG làm** — vi phạm bất kỳ điều nào sẽ bị yêu cầu viết lại toàn bộ.

### Nhóm 1: Phân quyền
```
❌ Không enforce requireAdmin() ở route (admin)/ → Lỗ hổng bảo mật
❌ Cho CNL xem tài chính hoặc học viên của lớp khác → Vi phạm Contextual Finance
❌ Cho CNL duyệt phiếu thu hoặc lệnh hoàn → Vi phạm luồng 2 bước
❌ Cho CNL xóa bất kỳ bản ghi nào → CNL chỉ tạo, không xóa
❌ Tạo role thứ 3 (Giảng viên, Học viên, Guest...) → Không được thêm role mới
❌ Cho học viên đăng nhập vào hệ thống → Không có Student Portal
```

### Nhóm 2: Dữ liệu tài chính
```
❌ Tính công nợ từ Program.price thay vì Enrollment.agreed_price → Sai nghiệp vụ
❌ Để agreed_price = null khi tạo Enrollment → Bắt buộc phải có giá trị
❌ Duyệt Payment mà không nhập paid_at → Báo cáo cashflow sẽ sai
❌ Tạo lệnh hoàn tiền cho Enrollment thuộc Nhánh 2 (Coaching) → Quy tắc cứng
❌ Lưu computed values (công nợ, tổng thu...) vào DB → Tính realtime, không cache
```

### Nhóm 3: Xóa dữ liệu
```
❌ Dùng prisma.model.delete() cho các bảng có deleted_at → Chỉ soft delete
❌ Xóa Payment hoặc Refund không có deletion_reason → Bắt buộc có lý do
❌ Xóa Attendance hoặc Feedback → 2 bảng này không bao giờ xóa
❌ Drop Enrollment còn công nợ mà không cảnh báo Admin → Phải có confirmation
```

### Nhóm 4: Kỹ thuật
```
❌ Tạo bảng Session/Account/VerificationToken trong Prisma → Supabase Auth tự quản lý
❌ Dùng relationMode="prisma" trong datasource → Dùng FK thật PostgreSQL
❌ Dùng pm2 restart → Dùng pm2 reload (zero-downtime)
❌ Dùng npm install --production trong deploy → Dùng npm ci
❌ Load Google Fonts → Dùng system-ui
❌ Tạo MagicLink không có expires_at → Bắt buộc, mặc định 7 ngày
```

### Nhóm 5: UX
```
❌ Nút bấm dưới 44px height trên màn hình CNL → WCAG AA minimum
❌ Yêu cầu bấm Submit sau khi điểm danh → Tự lưu ngay khi bấm
❌ Popup xác nhận thêm cho action thông thường → Chỉ confirm cho action không hoàn tác
```

---

## PHẦN 7 — DESIGN SYSTEM

### Brand Colors — áp dụng nhất quán
```css
Navy  #0A1628  → Sidebar, Header, Background tối
Flame #E8471A  → Button CTA, trạng thái Active, Badge nổi bật
Ink   #111111  → Text chính, Icon
```

### Quy tắc màu cho Badge trạng thái
| Trạng thái | Màu Tailwind | Dùng cho |
|---|---|---|
| Active / Hoàn thành | `green-600` | Enrollment active, Payment approved |
| Chờ duyệt / Cảnh báo | `amber-500` | Payment pending, Nợ học phí |
| Lỗi / Từ chối / Lost | `red-600` | Lead lost, Payment rejected |
| Bảo lưu | `blue-500` | Enrollment suspended |
| Badge số phiếu chờ | `red-600` nền, text trắng, bo tròn | Góc icon menu Admin |

### Typography
```
Font stack:  font-family: system-ui, -apple-system, sans-serif
             ← KHÔNG dùng Google Fonts (ảnh hưởng performance)
Heading:     font-weight: 700, text-transform: uppercase cho section title
Body:        font-size: 16px, line-height: 1.7
Button:      bg-flame text-white font-semibold rounded-lg (border-radius: 8px)
```

### Responsive Breakpoints (Mobile First)
```
default (< 640px)  → Phone: 1 cột, bottom nav, nút ≥ 44px  ← Ưu tiên đầu tiên
sm (≥ 640px)       → Tablet
md (≥ 768px)       → Tablet ngang
lg (≥ 1024px)      → Desktop: sidebar cố định, layout đa cột
```

---

## PHẦN 8 — CHECKLIST TRƯỚC KHI VIẾT CODE

Trước mỗi tính năng mới, trả lời 15 câu hỏi này:

```
PHÂN QUYỀN
[ ] Tính năng này dành cho role nào? ADMIN / CNL / cả hai?
[ ] Đã gọi requireAdmin() hoặc requireHomeroom() ở API route chưa?
[ ] Nếu là CNL: đã lọc theo class.homeroom_id = currentUser.id chưa?
[ ] Có vô tình cho CNL thấy dữ liệu lớp khác không?

DỮ LIỆU & NGHIỆP VỤ
[ ] Công nợ tính từ agreed_price (không phải Program.price)?
[ ] agreed_price có bao giờ là null không? (Không được phép)
[ ] Nếu liên quan Payment/Refund: có workflow 2 bước không?
[ ] Khi duyệt Payment: có nhập paid_at không?
[ ] Nếu là Refund: đã chặn Coaching 1-1 (Nhánh 2) chưa?
[ ] MagicLink: có expires_at và kiểm tra used_at chưa?

XÓA DỮ LIỆU
[ ] Có dùng soft delete không? (Không bao giờ dùng prisma.delete())
[ ] Payment/Refund xóa: có deletion_reason chưa?
[ ] Enrollment drop: có cảnh báo công nợ trước không?

UI / UX
[ ] UI mobile-first? Nút ≥ 44px trên màn hình CNL?
[ ] Màu đúng brand: Navy/Flame/Ink?
[ ] Computed values tính realtime, không lưu DB?
```

---

## PHẦN 9 — CẤU TRÚC PROMPT C-R-A-F-T

Khi owner yêu cầu tính năng mới, dùng template sau:

```
[C - CONTEXT]
Dự án: CiT Hub v3.0 (INSTRUCTIONS_cithub.md)
Stack: Next.js 14 App Router · TypeScript · Supabase Auth · Prisma · Shadcn UI · Tailwind
Brand: Navy #0A1628 · Flame #E8471A · Ink #111111 · Mobile-first · Nút ≥ 44px

[R - RED LINES áp dụng cho tính năng này]
(Copy chính xác các dòng ❌ liên quan từ Phần 6)

[A - ACTION]
(Mô tả tính năng bằng ngôn ngữ nghiệp vụ — không cần dùng từ kỹ thuật)
VD: "Cho Admin xem danh sách học viên đang nợ học phí, sắp xếp theo số tiền nợ nhiều nhất"

[F - FLOW]
(Các bước người dùng thực hiện)
VD:
1. Admin vào menu Finance → tab Công nợ
2. Thấy danh sách: Họ tên · Lớp học · Học phí · Đã đóng · Còn nợ
3. Bấm vào học viên → xem chi tiết lịch sử thanh toán

[T - TEST CASES]
✅ Học viên agreed_price=5.000.000, đã đóng 3.000.000 → hiển thị nợ 2.000.000
✅ Học viên đã đóng đủ → không hiện trong danh sách nợ
❌ CNL không thấy được trang này (redirect về lớp của mình)
❌ Học phí tính từ agreed_price, không phải Program.price
```

---

## PHẦN 10 — TÀI LIỆU THAM CHIẾU

| File | Mục đích |
|---|---|
| `INSTRUCTIONS_cithub.md` | File này — luật của dự án, đọc trước tiên |
| `CLAUDE.md` (v3.0) | Chi tiết nghiệp vụ, roadmap, enums |
| `prisma/schema.prisma` | Cấu trúc database — nguồn sự thật duy nhất |

**Thứ tự ưu tiên khi có mâu thuẫn:**
1. `INSTRUCTIONS_cithub.md` (file này) — Luật
2. `CLAUDE.md` — Nghiệp vụ chi tiết
3. `schema.prisma` — Database thực tế

---

*INSTRUCTIONS v1.0 · CiT Hub · Tháng 5/2026*
*Cập nhật khi có quyết định mới từ owner — không tự ý thay đổi.*
