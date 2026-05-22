'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@prisma/client'

type UserRow = Pick<User, 'id' | 'email' | 'full_name' | 'role' | 'phone' | 'is_active' | 'created_at'>

// ─── Dialog thêm người dùng ───────────────────────────────────────────────────

function AddUserDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'HOMEROOM'>('HOMEROOM')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError('')
    if (!fullName.trim()) return setError('Vui lòng nhập họ tên')
    if (!email.trim()) return setError('Vui lòng nhập email')
    if (password.length < 8) return setError('Mật khẩu tối thiểu 8 ký tự')

    startTransition(async () => {
      const res = await fetch('/api/admin/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, password, role, phone }),
      })
      let data: { error?: string } = {}
      try { data = await res.json() } catch { /* empty */ }
      if (!res.ok) return setError(data.error ?? 'Lỗi tạo người dùng')
      onCreated()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Thêm người dùng</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Thị B"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="b@citedu.vn"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Mật khẩu tạm <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Vai trò <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'HOMEROOM')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            >
              <option value="HOMEROOM">Chủ nhiệm lớp (CNL)</option>
              <option value="ADMIN">Quản lý (Admin)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Số điện thoại <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-ink transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-5 py-2 bg-flame hover:bg-flame/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Đang tạo...' : 'Tạo người dùng'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dialog sửa người dùng ────────────────────────────────────────────────────

function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(user.full_name)
  const [role, setRole] = useState<'ADMIN' | 'HOMEROOM'>(user.role)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError('')
    if (!fullName.trim()) return setError('Vui lòng nhập họ tên')

    startTransition(async () => {
      const res = await fetch(`/api/admin/settings/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, role, phone }),
      })
      let data: { error?: string } = {}
      try { data = await res.json() } catch { /* empty */ }
      if (!res.ok) return setError(data.error ?? 'Lỗi cập nhật')
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Sửa thông tin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Vai trò <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'HOMEROOM')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            >
              <option value="HOMEROOM">Chủ nhiệm lớp (CNL)</option>
              <option value="ADMIN">Quản lý (Admin)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Số điện thoại <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-ink transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-5 py-2 bg-flame hover:bg-flame/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Component chính ──────────────────────────────────────────────────────────

export default function SettingsUsersClient({
  users: initialUsers,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [confirmToggleUser, setConfirmToggleUser] = useState<UserRow | null>(null)
  const [toggleError, setToggleError] = useState('')
  const [isToggling, startToggle] = useTransition()

  function refresh() {
    router.refresh()
  }

  function handleCreated() {
    setShowAddDialog(false)
    refresh()
  }

  function handleSaved() {
    setEditingUser(null)
    refresh()
  }

  function confirmToggle() {
    if (!confirmToggleUser) return
    setToggleError('')

    startToggle(async () => {
      const res = await fetch(`/api/admin/settings/users/${confirmToggleUser.id}/toggle-active`, {
        method: 'PATCH',
      })
      let data: { error?: string } = {}
      try { data = await res.json() } catch { /* empty */ }
      if (!res.ok) {
        setToggleError(data.error ?? 'Lỗi thay đổi trạng thái')
        return
      }
      setConfirmToggleUser(null)
      refresh()
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {initialUsers.length} người dùng · {initialUsers.filter(u => u.is_active).length} đang hoạt động
        </p>
        <button
          onClick={() => setShowAddDialog(true)}
          className="bg-flame hover:bg-flame/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Thêm người dùng
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Họ tên</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vai trò</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">SĐT</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {initialUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{u.full_name}</span>
                    {u.id === currentUserId && (
                      <span className="text-[10px] bg-navy/10 text-navy px-1.5 py-0.5 rounded font-medium">Bạn</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  {u.role === 'ADMIN' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Quản lý
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Chủ nhiệm lớp
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                  {u.phone ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                      Đã vô hiệu hóa
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="text-xs font-medium text-gray-500 hover:text-ink border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => { setToggleError(''); setConfirmToggleUser(u) }}
                      disabled={u.id === currentUserId}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        u.id === currentUserId
                          ? 'text-gray-300 border-gray-100 cursor-not-allowed'
                          : u.is_active
                            ? 'text-red-500 hover:text-red-700 border-red-200 hover:border-red-300'
                            : 'text-green-600 hover:text-green-800 border-green-200 hover:border-green-300'
                      }`}
                      title={u.id === currentUserId ? 'Không thể tự vô hiệu hóa tài khoản của mình' : undefined}
                    >
                      {u.is_active ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog xác nhận toggle */}
      {confirmToggleUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-ink text-lg mb-2">
              {confirmToggleUser.is_active ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?'}
            </h3>
            <p className="text-gray-600 text-sm mb-2">
              {confirmToggleUser.is_active
                ? `"${confirmToggleUser.full_name}" sẽ không thể đăng nhập vào hệ thống.`
                : `"${confirmToggleUser.full_name}" sẽ có thể đăng nhập trở lại.`
              }
            </p>
            {toggleError && (
              <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{toggleError}</p>
            )}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setConfirmToggleUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-ink transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmToggle}
                disabled={isToggling}
                className={`px-5 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                  confirmToggleUser.is_active
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isToggling
                  ? 'Đang xử lý...'
                  : confirmToggleUser.is_active ? 'Vô hiệu hóa' : 'Kích hoạt lại'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddDialog && (
        <AddUserDialog
          onClose={() => setShowAddDialog(false)}
          onCreated={handleCreated}
        />
      )}

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
