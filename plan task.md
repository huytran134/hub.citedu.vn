# CiT Hub — Task List & Prompt chuẩn: Cải thiện Dashboard Admin
> Tài liệu này đi kèm phân tích gap Dashboard ngày 20/05/2026.
> Mỗi task có: Mô tả · Độ ưu tiên · File cần sửa · Prompt C-R-A-F-T để nhập Antigravity.

---

## TỔNG QUAN CÁC TASK

| # | Task | Loại | Ưu tiên | Effort |
|---|------|-------|---------|--------|
| T-01 | Badge đỏ số phiếu chờ trên Navigation | Fix thiếu | 🔴 Cao | ~1h |
| T-02 | Card "Tổng công nợ" — màu dynamic theo giá trị | Fix sai | 🔴 Cao | ~30m |
| T-03 | Deeplink từ card "Phiếu chờ duyệt" | Fix thiếu | 🔴 Cao | ~30m |
| T-04 | Thêm metric "Doanh thu tháng này" | Thêm mới | 🟠 Vừa | ~2h |
| T-05 | Thêm metric "Dự thu" và "Số lớp đang hoạt động" | Thêm mới | 🟠 Vừa | ~2h |
| T-06 | Delta so sánh "Lead mới tuần này" | Cải thiện | 🟡 Thấp | ~1h |
| T-07 | Tách rõ phiếu thu / phiếu hoàn trên card pending | Cải thiện | 🟡 Thấp | ~1h |
| T-08 | Panel "Hoạt động gần đây" — hiện dữ liệu thực | Cải thiện | 🟡 Thấp | ~2h |
| T-09 | Cảnh báo enrollment sắp hết hạn bảo lưu | Thêm mới | 🟡 Thấp | ~3h |

---

## T-01 — Badge đỏ số phiếu chờ trên Navigation

**Vấn đề:** Navigation bar hiện là text thuần. INSTRUCTIONS Phần 2 yêu cầu badge đỏ số phiếu pending ở góc icon menu, đây là tính năng cốt lõi của Admin workflow.

**File cần sửa:** `app/(admin)/layout.tsx` hoặc component navigation chính

**Cần làm:**
- Thêm API call đếm phiếu pending (Payment + Refund) ở layout root
- Render badge đỏ góc icon "Tài chính" khi count > 0
- Badge tự cập nhật (revalidate) sau khi Admin duyệt xong

---

```
[C - CONTEXT]
Dự án: CiT Hub — CRM+LMS nội bộ cho CiT EDU
Stack: Next.js 14 App Router · TypeScript · Supabase Auth · Prisma · Shadcn UI · Tailwind
Brand: Navy #0A1628 · Flame #E8471A · Ink #111111
File cần sửa: app/(admin)/layout.tsx (hoặc component navigation Admin)
Database: bảng Payment và Refund có trường status ('pending' | 'approved' | 'rejected')

[R - RED LINES]
❌ Không enforce requireAdmin() ở route (admin)/ → lỗ hổng bảo mật
❌ Không lưu count vào DB — tính realtime mỗi lần render layout
❌ Badge không được hiển thị cho CNL (role HOMEROOM)

[A - ACTION]
Thêm badge đỏ hiển thị tổng số phiếu đang chờ duyệt (Payment pending + Refund pending)
vào góc trên-phải của mục "Tài chính" trong Navigation bar của Admin.
Badge chỉ hiển thị khi count > 0. Khi count = 0, không hiển thị badge.

[F - FLOW]
1. Ở app/(admin)/layout.tsx: thêm server-side query đếm pending
   const pendingCount = await prisma.payment.count({
     where: { status: 'pending', deleted_at: null }
   }) + await prisma.refund.count({
     where: { status: 'pending', deleted_at: null }
   })
2. Truyền pendingCount xuống component Navigation qua props hoặc context
3. Trong Navigation, tại mục "Tài chính":
   - Bọc trong <div className="relative">
   - Thêm badge: <span> có className "absolute -top-1 -right-1 bg-red-600 text-white
     text-xs font-semibold rounded-full min-w-[18px] h-[18px] flex items-center
     justify-center px-1" — chỉ render khi pendingCount > 0
   - Nếu count > 99: hiển thị "99+"
4. Sau khi Admin duyệt phiếu (API route approve), thêm revalidatePath('/') hoặc
   revalidateTag('pending-count') để badge tự cập nhật

[T - TEST CASES]
✅ Có 3 phiếu thu pending + 1 hoàn pending → badge hiển thị "4" màu đỏ
✅ Tất cả phiếu đã duyệt → badge biến mất hoàn toàn (không còn element)
✅ Count 105 phiếu → badge hiển thị "99+"
❌ CNL đăng nhập → không thấy badge này (layout CNL khác)
❌ Badge không được lưu vào database — query trực tiếp mỗi lần
```

---

## T-02 — Card "Tổng công nợ" — màu dynamic theo giá trị

**Vấn đề:** Card hiện hardcode màu xanh lá. Theo Design System: amber = cảnh báo/nợ, green = hoàn thành. Khi thực tế có công nợ, màu xanh lá gây hiểu nhầm.

**File cần sửa:** `app/(admin)/dashboard/page.tsx` — phần render metric card

---

```
[C - CONTEXT]
Dự án: CiT Hub — CRM+LMS nội bộ cho CiT EDU
Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Shadcn UI
Brand: Navy #0A1628 · Flame #E8471A · Ink #111111
File cần sửa: app/(admin)/dashboard/page.tsx — component MetricCard "Tổng công nợ"
Biến totalDebt: kiểu number (tổng công nợ tính từ agreed_price − approved payments)

[R - RED LINES]
❌ TUYỆT ĐỐI KHÔNG tính debt từ Program.price — phải từ Enrollment.agreed_price
❌ KHÔNG lưu giá trị tính toán vào DB — tính realtime

[A - ACTION]
Làm cho màu background và icon của card "Tổng công nợ" thay đổi động theo giá trị:
- Khi totalDebt === 0: màu xanh lá (green) → không có nợ, tốt
- Khi totalDebt > 0: màu amber/vàng → cần chú ý, có nợ đang tồn đọng
- Khi totalDebt >= 50.000.000đ (50 triệu): màu đỏ → mức độ cảnh báo cao

[F - FLOW]
1. Trong query tính totalDebt — đảm bảo dùng agreed_price:
   const enrollments = await prisma.enrollment.findMany({
     where: { status: { in: ['active', 'suspended'] }, deleted_at: null },
     include: { payments: { where: { status: 'approved', deleted_at: null } } }
   })
   const totalDebt = enrollments.reduce((sum, e) => {
     const paid = e.payments.reduce((s, p) => s + Number(p.amount), 0)
     return sum + (Number(e.agreed_price) - paid)
   }, 0)

2. Tạo helper function getDebtCardStyle(debt: number):
   - debt === 0 → { bg: 'bg-green-600', text: 'text-white', label: 'Không có nợ' }
   - debt > 0 && debt < 50_000_000 → { bg: 'bg-amber-500', text: 'text-white', label: 'Cần thu' }
   - debt >= 50_000_000 → { bg: 'bg-red-600', text: 'text-white', label: 'Cần xử lý' }

3. Apply style động vào card component — thay thế className hardcode hiện tại
4. Thêm subtitle nhỏ bên dưới số tiền: "Active + bảo lưu" (giữ nguyên như hiện tại)
5. Format số tiền: Number(totalDebt).toLocaleString('vi-VN') + ' đ'

[T - TEST CASES]
✅ totalDebt = 0 → card màu xanh lá, text "Không có nợ"
✅ totalDebt = 15.000.000 → card màu amber, text "Cần thu"
✅ totalDebt = 80.000.000 → card màu đỏ, text "Cần xử lý"
✅ Số tiền format đúng: 15.000.000 → "15.000.000 đ" (dấu chấm phân cách nghìn)
❌ KHÔNG tính từ Program.price → sẽ sai với học viên có giá riêng
```

---

## T-03 — Deeplink từ card "Phiếu chờ duyệt"

**Vấn đề:** Khi có phiếu pending, Admin phải click Tài chính → tự tìm tab pending. Tốn 2–3 click thừa mỗi ngày.

**File cần sửa:** `app/(admin)/dashboard/page.tsx` — card "Phiếu chờ duyệt"

---

```
[C - CONTEXT]
Dự án: CiT Hub — CRM+LMS nội bộ cho CiT EDU
Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Shadcn UI
Brand: Navy #0A1628 · Flame #E8471A · Ink #111111
File cần sửa: app/(admin)/dashboard/page.tsx — MetricCard "Phiếu chờ duyệt"
Route tài chính: /finance hoặc /admin/finance (xác nhận route thực tế trong dự án)

[R - RED LINES]
❌ Deeplink phải dẫn đến đúng tab pending — không chỉ trang Finance chung
❌ Nút/link phải bị ẩn khi count = 0 (không có gì để duyệt)

[A - ACTION]
Biến card "Phiếu chờ duyệt" thành clickable: khi có phiếu pending, toàn bộ card
(hoặc có nút rõ ràng bên dưới) dẫn thẳng đến trang Tài chính tab "Chờ duyệt".
Khi count = 0: card vẫn hiển thị nhưng không có deeplink (hoặc dẫn đến trang Finance chung).

[F - FLOW]
1. Giữ nguyên query đếm pendingPayments và pendingRefunds hiện có
2. Tính totalPending = pendingPayments + pendingRefunds
3. Khi totalPending > 0:
   a. Wrap card trong <Link href="/finance?tab=pending"> (Next.js Link)
      HOẶC thêm nút nhỏ bên dưới: "Xem X phiếu chờ →" với className text-sm
      font-medium text-flame underline-offset-2 hover:underline
   b. Tách hiển thị: "{pendingPayments} thu · {pendingRefunds} hoàn" — nổi bật hơn
      hiện tại (font-medium thay vì text mờ nhỏ)
   c. Thêm visual cue: icon ChevronRight nhỏ ở góc phải card khi có thể click
4. Khi totalPending = 0: card như cũ, không có link

[T - TEST CASES]
✅ 3 phiếu thu + 1 hoàn → hiện "Xem 4 phiếu chờ →", click → /finance?tab=pending
✅ 0 phiếu pending → card tĩnh, không có link, không có ChevronRight
✅ Phân biệt rõ: "3 thu · 1 hoàn" (không chỉ ghi "0 thu · 0 hoàn" mờ nhỏ)
❌ Link không được dẫn đến trang Finance chung — phải đúng tab pending
```

---

## T-04 — Thêm metric "Doanh thu tháng này"

**Vấn đề:** Dashboard thiếu hoàn toàn con số doanh thu thực thu — KPI số 1 Giám đốc cần thấy mỗi sáng. Hiện chỉ có công nợ.

**File cần sửa:** `app/(admin)/dashboard/page.tsx` — thêm metric card mới

---

```
[C - CONTEXT]
Dự án: CiT Hub — CRM+LMS nội bộ cho CiT EDU
Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Shadcn UI · Prisma
Brand: Navy #0A1628 · Flame #E8471A · Ink #111111
File cần sửa: app/(admin)/dashboard/page.tsx
Bảng liên quan: Payment { amount: BigInt, status, paid_at: DateTime, deleted_at }
"Doanh thu thực thu" = SUM(amount) WHERE status='approved' AND paid_at trong tháng hiện tại

[R - RED LINES]
❌ KHÔNG lưu giá trị tính toán vào DB — tính realtime từ bảng Payment
❌ KHÔNG tính Payment status='pending' hoặc 'rejected' vào doanh thu
❌ PHẢI dùng paid_at (ngày tiền thực nhận) — không dùng created_at hay approved_at

[A - ACTION]
Thêm metric card "Doanh thu tháng này" vào hàng metric cards trên Dashboard Admin.
Hiển thị tổng tiền đã thực thu trong tháng hiện tại (dùng paid_at).
Thêm subtitle nhỏ cho biết khoảng thời gian: "Tháng 5/2026" (dynamic theo tháng hiện tại).
Thêm delta so sánh tháng trước: "+12% so với tháng 4" (nếu có dữ liệu).

[F - FLOW]
1. Tính khoảng thời gian tháng hiện tại:
   const now = new Date()
   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
   const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

2. Query doanh thu tháng này:
   const payments = await prisma.payment.findMany({
     where: {
       status: 'approved',
       paid_at: { gte: startOfMonth, lte: endOfMonth },
       deleted_at: null
     },
     select: { amount: true }
   })
   const revenueThisMonth = payments.reduce((sum, p) => sum + Number(p.amount), 0)

3. Query tháng trước (để tính delta):
   const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
   const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
   [tương tự, tính revenuePrevMonth]

4. Tính delta: ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth * 100).toFixed(1)
   - Nếu revenuePrevMonth = 0: hiển thị "Tháng đầu tiên" thay vì delta
   - Delta dương: màu green, prefix "+"
   - Delta âm: màu red

5. Thêm card với:
   - Label: "Doanh thu tháng này"
   - Value: Number(revenueThisMonth).toLocaleString('vi-VN') + ' đ'
   - Subtitle: "Tháng {month}/{year}"
   - Delta badge nhỏ: "+X% so với tháng trước"
   - Màu card: Navy (#0A1628) — giữ đồng nhất với card "Học viên đang học"

[T - TEST CASES]
✅ Tháng 5/2026 có 3 phiếu approved: 5tr + 3tr + 2tr → hiển thị "10.000.000 đ"
✅ Tháng trước 8tr, tháng này 10tr → delta "+25.0% so với tháng 4"
✅ Không có payment nào trong tháng → "0 đ" (không crash)
✅ Subtitle dynamic: tháng 12 → "Tháng 12/2026"
❌ Payment status='pending' KHÔNG được tính vào
❌ KHÔNG dùng created_at — phải dùng paid_at
```

---

## ✅ T-05 — Thêm metric "Dự thu" và "Số lớp đang hoạt động"

**Vấn đề:** Hai chỉ số vận hành quan trọng còn thiếu: (1) Dự thu = tiền CiT EDU được quyền thu nhưng chưa thu; (2) Số lớp đang chạy song song.

**File cần sửa:** `app/(admin)/dashboard/page.tsx`

---

```
[C - CONTEXT]
Dự án: CiT Hub — CRM+LMS nội bộ cho CiT EDU
Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Shadcn UI · Prisma
Brand: Navy #0A1628 · Flame #E8471A · Ink #111111
File cần sửa: app/(admin)/dashboard/page.tsx — thêm 2 metric card mới

Bảng liên quan:
- Enrollment { agreed_price: BigInt, status: 'waitlist'|'active'|'suspended'|'completed'|'dropped' }
- Payment { amount: BigInt, status: 'pending'|'approved'|'rejected', enrollment_id }
- Class { status: 'upcoming'|'active'|'completed', deleted_at }

"Dự thu" = SUM(agreed_price) − SUM(approved payments) CHỈ của enrollment active + suspended
"Số lớp hoạt động" = COUNT(class WHERE status='active' AND deleted_at IS NULL)

[R - RED LINES]
❌ TUYỆT ĐỐI KHÔNG tính từ Program.price — phải từ Enrollment.agreed_price
❌ Enrollment status='completed' hoặc 'dropped' KHÔNG được tính vào dự thu
❌ KHÔNG lưu computed values vào DB — tính realtime

[A - ACTION]
Thêm 2 metric card vào hàng metrics Dashboard Admin:
1. "Dự thu" — số tiền còn lại cần thu từ học viên đang active + bảo lưu
2. "Lớp đang hoạt động" — đếm lớp học đang chạy, click dẫn đến trang Lớp học

[F - FLOW]
--- Metric 1: Dự thu ---
1. Query tất cả enrollment active + suspended kèm payments đã approved:
   const activeEnrollments = await prisma.enrollment.findMany({
     where: { status: { in: ['active', 'suspended'] }, deleted_at: null },
     include: {
       payments: { where: { status: 'approved', deleted_at: null }, select: { amount: true } }
     },
     select: { agreed_price: true, payments: true }
   })

2. Tính dự thu:
   const duThu = activeEnrollments.reduce((sum, e) => {
     const paid = e.payments.reduce((s, p) => s + Number(p.amount), 0)
     return sum + Math.max(0, Number(e.agreed_price) - paid)
     // Math.max(0,...) để tránh trường hợp overpaid trả về âm
   }, 0)

3. Card "Dự thu":
   - Value: Number(duThu).toLocaleString('vi-VN') + ' đ'
   - Subtitle: "Còn cần thu"
   - Màu: amber nếu duThu > 0, gray nhạt nếu = 0

--- Metric 2: Số lớp đang hoạt động ---
4. Query:
   const activeClassCount = await prisma.class.count({
     where: { status: 'active', deleted_at: null }
   })

5. Card "Lớp đang hoạt động":
   - Value: activeClassCount (số nguyên)
   - Subtitle: "Đang chạy"
   - Bọc trong <Link href="/classes"> để click dẫn sang trang Lớp học
   - Màu: Navy (#0A1628) — đồng nhất với các dark card

[T - TEST CASES]
✅ 2 enrollment active: agreed_price 5tr đã đóng 3tr + agreed_price 4tr đóng 0 → dự thu = 6tr
✅ Enrollment status='completed' → KHÔNG tính vào dự thu
✅ 3 lớp active, 1 lớp completed, 1 lớp upcoming → hiển thị "3"
✅ Click card "Lớp đang hoạt động" → navigate /classes
❌ Enrollment overpaid (paid > agreed_price) → Math.max(0,...) ngăn số âm
❌ KHÔNG tính từ Program.price → vi phạm nghiệp vụ học phí thỏa thuận
```

---

## ✅ T-06 — Delta so sánh "Lead mới tuần này"

**Vấn đề:** Con số lead tuyệt đối đứng một mình ít ý nghĩa. Giám đốc cần biết xu hướng: tốt hơn hay kém hơn tuần trước?

**File cần sửa:** `app/(admin)/dashboard/page.tsx` — card "Lead mới tuần này"

---

```
[C - CONTEXT]
Dự án: CiT Hub — CRM+LMS nội bộ cho CiT EDU
Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Shadcn UI · Prisma
Brand: Navy #0A1628 · Flame #E8471A · Ink #111111
File cần sửa: app/(admin)/dashboard/page.tsx — MetricCard "Lead mới tuần này"
Bảng: Lead { created_at: DateTime, deleted_at }
"Tuần này" = từ 00:00 Thứ Hai đến hiện tại

[R - RED LINES]
❌ Không tính lead đã soft-deleted (deleted_at IS NOT NULL)

[A - ACTION]
Thêm delta "+X so với tuần trước" vào card "Lead mới tuần này".
Cập nhật subtitle từ "Từ Thứ Hai" thành rõ ràng hơn với ngày cụ thể.

[F - FLOW]
1. Tính khoảng thời gian:
   const now = new Date()
   const dayOfWeek = now.getDay() // 0=Sun, 1=Mon...
   const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
   const startThisWeek = new Date(now)
   startThisWeek.setDate(now.getDate() - diffToMonday)
   startThisWeek.setHours(0, 0, 0, 0)

   const startLastWeek = new Date(startThisWeek)
   startLastWeek.setDate(startThisWeek.getDate() - 7)
   const endLastWeek = new Date(startThisWeek) // = start of this week

2. Query song song:
   const [thisWeekCount, lastWeekCount] = await Promise.all([
     prisma.lead.count({ where: {
       created_at: { gte: startThisWeek }, deleted_at: null
     }}),
     prisma.lead.count({ where: {
       created_at: { gte: startLastWeek, lt: endLastWeek }, deleted_at: null
     }})
   ])

3. Tính delta và render:
   - delta = thisWeekCount - lastWeekCount
   - Nếu delta > 0: hiển thị "+{delta}" màu green-400
   - Nếu delta < 0: hiển thị "{delta}" màu red-400
   - Nếu delta = 0: hiển thị "= tuần trước" màu gray
   - Subtitle: "Từ {dd/MM} · {delta_text} so tuần trước"

[T - TEST CASES]
✅ Tuần này 5 lead, tuần trước 3 lead → hiển thị "5" và "+2 so tuần trước" màu xanh
✅ Tuần này 2, tuần trước 5 → "-3 so tuần trước" màu đỏ
✅ Không có lead nào → "0" và subtitle "= tuần trước"
✅ Hôm nay là Thứ Hai → "Từ hôm nay" (startThisWeek = today 00:00)
❌ Lead bị xóa (deleted_at != null) không được tính
```

---

## ✅ T-07 — Tách rõ phiếu thu / phiếu hoàn trên card Pending

**Vấn đề:** Chú thích "0 thu · 0 hoàn" hiện quá nhỏ và mờ. Admin cần thấy rõ 2 con số này vì workflow xử lý khác nhau.

**File cần sửa:** `app/(admin)/dashboard/page.tsx` — card "Phiếu chờ duyệt"

---

```
[C - CONTEXT]
Dự án: CiT Hub — CRM+LMS nội bộ cho CiT EDU
Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Shadcn UI
Brand: Navy #0A1628 · Flame #E8471A · Ink #111111
File cần sửa: app/(admin)/dashboard/page.tsx — MetricCard "Phiếu chờ duyệt"

[R - RED LINES]
❌ Không merge/gộp 2 loại phiếu — phải tách rõ vì workflow khác nhau

[A - ACTION]
Redesign phần hiển thị phụ trong card "Phiếu chờ duyệt":
Thay vì chú thích nhỏ mờ "0 thu · 0 hoàn" → hiển thị 2 mini-badge rõ ràng hơn.

[F - FLOW]
1. Giữ số lớn tổng pending ở trên (như hiện tại)
2. Phần dưới: thay text mờ bằng 2 inline badge nhỏ:
   <div className="flex gap-2 mt-1">
     <span className="text-xs font-medium bg-white/20 rounded px-2 py-0.5">
       {pendingPayments} thu
     </span>
     <span className="text-xs font-medium bg-white/20 rounded px-2 py-0.5">
       {pendingRefunds} hoàn
     </span>
   </div>
3. Khi một trong hai = 0: badge vẫn hiển thị (để Admin thấy rõ cái nào = 0)
4. Khi có pending: badge thu màu amber-toned, badge hoàn màu blue-toned
   (để phân biệt trực quan 2 loại)

[T - TEST CASES]
✅ 3 thu + 1 hoàn → số lớn "4", bên dưới "3 thu" và "1 hoàn" riêng biệt
✅ 0 thu + 2 hoàn → số lớn "2", hiển thị "0 thu" và "2 hoàn"
✅ 0 thu + 0 hoàn → số lớn "0", hiển thị "0 thu" và "0 hoàn" (không ẩn)
❌ Không gộp thành 1 số chung mà không giải thích
```

---

## ✅ T-08 — Panel "Hoạt động gần đây" — hiện dữ liệu thực

**Vấn đề:** Panel "Hoạt động gần đây" hiện trống hoàn toàn ("Chưa có phiếu thu nào"). Cần hiện 5 phiếu được duyệt gần nhất để Admin verify và có cảm giác hệ thống hoạt động.

**File cần sửa:** `app/(admin)/dashboard/page.tsx` — section "Hoạt động gần đây"

---

```
[C - CONTEXT]
Dự án: CiT Hub — CRM+LMS nội bộ cho CiT EDU
Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Shadcn UI · Prisma
Brand: Navy #0A1628 · Flame #E8471A · Ink #111111
File cần sửa: app/(admin)/dashboard/page.tsx — panel "Hoạt động gần đây"
Bảng: Payment { amount, status, paid_at, approved_at, deleted_at }
      → include: enrollment → include: contact { full_name }
      → include: enrollment → include: class { name }

[R - RED LINES]
❌ Chỉ hiển thị Payment status='approved' — không hiển thị pending/rejected
❌ KHÔNG hardcode data — query thực từ database

[A - ACTION]
Thay thế nội dung trống của panel "Hoạt động gần đây" bằng danh sách
5 phiếu thu được duyệt gần nhất, sắp xếp theo approved_at DESC.
Mỗi item hiển thị: tên học viên · lớp học · số tiền · thời gian duyệt (relative: "2 giờ trước").
Khi thực sự chưa có data: giữ empty state hiện tại.

[F - FLOW]
1. Query 5 phiếu approved gần nhất:
   const recentPayments = await prisma.payment.findMany({
     where: { status: 'approved', deleted_at: null },
     orderBy: { approved_at: 'desc' },
     take: 5,
     include: {
       enrollment: {
         include: {
           contact: { select: { full_name: true } },
           class: { select: { name: true } }
         }
       }
     }
   })

2. Render mỗi item:
   <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
     <div>
       <p className="text-sm font-medium">{contact.full_name}</p>
       <p className="text-xs text-gray-400">{class.name} · {timeAgo(approved_at)}</p>
     </div>
     <span className="text-sm font-semibold text-green-400">
       +{Number(amount).toLocaleString('vi-VN')} đ
     </span>
   </div>

3. Helper timeAgo(date): "vừa xong" | "X phút trước" | "X giờ trước" | "X ngày trước"
   (implement thuần JS, không cần thư viện)

4. Empty state (khi recentPayments.length === 0): giữ text "Chưa có phiếu thu nào"

[T - TEST CASES]
✅ Có 8 phiếu approved → chỉ hiển thị 5 gần nhất
✅ Phiếu 2 tiếng trước → "2 giờ trước"
✅ Số tiền 3.500.000 → "+3.500.000 đ" màu xanh
✅ 0 phiếu approved → empty state "Chưa có phiếu thu nào"
❌ Phiếu status='pending' KHÔNG được hiển thị ở đây
❌ KHÔNG hiển thị phiếu đã soft-deleted
```

---

## T-09 — Cảnh báo enrollment sắp hết hạn bảo lưu

**Vấn đề:** Học viên bảo lưu có deadline quay lại. Admin không có cơ chế nhắc nhở → dễ quên → tranh chấp học phí.

**File cần sửa:** `app/(admin)/dashboard/page.tsx` — thêm widget cảnh báo mới

> ⚠️ **Lưu ý trước khi làm T-09:** Cần xác nhận schema có trường `suspended_until: DateTime?` trong bảng Enrollment. Nếu chưa có, cần migration trước.

---

```
[C - CONTEXT]
Dự án: CiT Hub — CRM+LMS nội bộ cho CiT EDU
Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Shadcn UI · Prisma
Brand: Navy #0A1628 · Flame #E8471A · Ink #111111
File cần sửa: app/(admin)/dashboard/page.tsx — thêm panel cảnh báo bảo lưu
Điều kiện tiên quyết: Enrollment có trường suspended_until: DateTime? (ngày hết hạn bảo lưu)
Bảng: Enrollment { status: 'suspended', suspended_until: DateTime?, deleted_at }
      → include: contact { full_name, phone }
      → include: class { name }

[R - RED LINES]
❌ Chỉ query enrollment status='suspended' — không hiển thị active/completed
❌ Cảnh báo phải là thông tin thực từ DB — không hardcode

[A - ACTION]
Thêm panel nhỏ "Bảo lưu sắp hết hạn" vào Dashboard Admin.
Hiện danh sách học viên đang bảo lưu có suspended_until trong vòng 30 ngày tới.
Sắp xếp: gần hết hạn nhất lên đầu. Nếu không có ai → ẩn panel hoàn toàn.

[F - FLOW]
1. Tính ngưỡng cảnh báo: 30 ngày từ hôm nay
   const today = new Date()
   const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

2. Query:
   const expiringSoon = await prisma.enrollment.findMany({
     where: {
       status: 'suspended',
       suspended_until: { gte: today, lte: in30Days },
       deleted_at: null
     },
     orderBy: { suspended_until: 'asc' },
     include: {
       contact: { select: { full_name: true, phone: true } },
       class: { select: { name: true } }
     }
   })

3. Nếu expiringSoon.length === 0: KHÔNG render panel (ẩn hoàn toàn)

4. Nếu có: render panel với title "⚠️ Bảo lưu sắp hết hạn ({count})"
   Mỗi item:
   - Tên học viên + SĐT
   - Lớp học
   - "Còn X ngày" — tính = Math.ceil((suspended_until - today) / 86400000)
   - Màu "Còn X ngày":
     * X ≤ 7: text-red-500 (khẩn cấp)
     * X ≤ 14: text-amber-500 (cảnh báo)
     * X ≤ 30: text-blue-400 (thông tin)

5. Panel đặt dưới panel "Lead cần liên hệ hôm nay" hoặc cạnh panel "Hoạt động gần đây"

[T - TEST CASES]
✅ 2 học viên bảo lưu còn 5 ngày + 1 học viên còn 25 ngày → panel hiển thị 3 người
✅ Người còn 5 ngày → "Còn 5 ngày" màu đỏ
✅ Enrollment suspended_until = null (không đặt hạn) → KHÔNG hiển thị
✅ Không có ai bảo lưu sắp hết hạn → panel ẩn hoàn toàn (không render)
❌ Enrollment status='active' dù có suspended_until cũ → KHÔNG hiển thị
❌ Enrollment đã hết hạn (suspended_until < today) → KHÔNG hiển thị (đã quá hạn, Admin cần xử lý qua flow khác)
```

---

## GHI CHÚ TRIỂN KHAI

### Thứ tự khuyến nghị
```
Sprint 1 (fix ngay — không tốn nhiều công):
  T-01 → T-02 → T-03

Sprint 2 (thêm metric quan trọng):
  T-04 → T-05

Sprint 3 (cải thiện UX):
  T-06 → T-07 → T-08

Sprint 4 (tính năng nâng cao — cần xác nhận schema):
  T-09
```

### Kiểm tra trước khi làm T-09
Chạy lệnh sau để xác nhận schema:
```bash
npx prisma studio
# hoặc
grep -A 20 "model Enrollment" prisma/schema.prisma | grep suspended
```
Nếu `suspended_until` chưa có → tạo migration trước khi viết code T-09.

### Checklist chung (từ INSTRUCTIONS Phần 8)
Trước mỗi task, confirm:
- [ ] Công nợ tính từ `agreed_price` (không phải `Program.price`)
- [ ] Computed values KHÔNG lưu vào DB
- [ ] Soft delete: query luôn có `deleted_at: null`
- [ ] Chỉ ADMIN thấy Dashboard này (middleware đã enforce ở layout)

---

*Task list v1.0 · CiT Hub Dashboard · Tháng 5/2026*
*Tạo từ phân tích gap so với INSTRUCTIONS_cithub.md*