'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@prisma/client'

type UserRow = Pick<User, 'id' | 'email' | 'full_name' | 'role' | 'phone' | 'is_active' | 'created_at'>

// ─── Shared input/select className ───────────────────────────────────────────

const inputCls =
  'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm ' +
  'bg-white dark:bg-gray-800 text-ink dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame'

const inputDisabledCls =
  'w-full border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm ' +
  'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'

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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink dark:text-gray-100">Thêm người dùng</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink dark:hover:text-gray-100 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Thị B"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="b@citedu.vn"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">
              Mật khẩu tạm <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">
              Vai trò <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'HOMEROOM')}
              className={inputCls}
            >
              <option value="HOMEROOM">Chủ nhiệm lớp (CNL)</option>
              <option value="ADMIN">Quản lý (Admin)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">
              Số điện thoại <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-ink dark:hover:text-gray-100 transition-colors"
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink dark:text-gray-100">Sửa thông tin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink dark:hover:text-gray-100 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className={inputDisabledCls}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Email không thể thay đổi</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">
              Vai trò <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'HOMEROOM')}
              className={inputCls}
            >
              <option value="HOMEROOM">Chủ nhiệm lớp (CNL)</option>
              <option value="ADMIN">Quản lý (Admin)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">
              Số điện thoại <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-ink dark:hover:text-gray-100 transition-colors"
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

// ─── Dialog đổi mật khẩu ─────────────────────────────────────────────────────

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: UserRow
  onClose: () => void
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError('')
    if (newPassword.length < 8) return setError('Mật khẩu tối thiểu 8 ký tự')
    if (newPassword !== confirmPassword) return setError('Mật khẩu xác nhận không khớp')

    startTransition(async () => {
      const res = await fetch(`/api/admin/settings/users/${user.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      let data: { error?: string } = {}
      try { data = await res.json() } catch { /* empty */ }
      if (!res.ok) return setError(data.error ?? 'Lỗi đổi mật khẩu')
      setSuccess(true)
      setTimeout(onClose, 1200)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink dark:text-gray-100">Đổi mật khẩu</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{user.full_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-ink dark:hover:text-gray-100 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">
              Mật khẩu mới <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              autoFocus
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink dark:text-gray-200 mb-1.5">
              Xác nhận mật khẩu <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}
          {success && (
            <p className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
              ✓ Đã đổi mật khẩu thành công
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-ink dark:hover:text-gray-100 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || success}
            className="px-5 py-2 bg-navy hover:bg-navy/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Đang đổi...' : 'Đổi mật khẩu'}
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
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(null)
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
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {initialUsers.length} người dùng · {initialUsers.filter(u => u.is_active).length} đang hoạt động
        </p>
        <button
          onClick={() => setShowAddDialog(true)}
          className="bg-flame hover:bg-flame/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Thêm người dùng
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Họ tên</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vai trò</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">SĐT</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Trạng thái</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {initialUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink dark:text-gray-100">{u.full_name}</span>
                    {u.id === currentUserId && (
                      <span className="text-[10px] bg-navy/10 dark:bg-navy/30 text-navy dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">Bạn</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                <td className="px-4 py-3">
                  {u.role === 'ADMIN' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      Quản lý
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      Chủ nhiệm lớp
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                  {u.phone ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                      Đã vô hiệu hóa
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-ink dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => setResetPasswordUser(u)}
                      className="text-xs font-medium text-navy dark:text-blue-300 hover:text-navy/70 dark:hover:text-blue-200 border border-navy/20 dark:border-blue-700 hover:border-navy/40 dark:hover:border-blue-500 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Đổi MK
                    </button>
                    <button
                      onClick={() => { setToggleError(''); setConfirmToggleUser(u) }}
                      disabled={u.id === currentUserId}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        u.id === currentUserId
                          ? 'text-gray-300 dark:text-gray-600 border-gray-100 dark:border-gray-700 cursor-not-allowed'
                          : u.is_active
                            ? 'text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-600'
                            : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-600'
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-ink dark:text-gray-100 text-lg mb-2">
              {confirmToggleUser.is_active ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
              {confirmToggleUser.is_active
                ? `"${confirmToggleUser.full_name}" sẽ không thể đăng nhập vào hệ thống.`
                : `"${confirmToggleUser.full_name}" sẽ có thể đăng nhập trở lại.`
              }
            </p>
            {toggleError && (
              <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4">{toggleError}</p>
            )}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setConfirmToggleUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-ink dark:hover:text-gray-100 transition-colors"
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

      {resetPasswordUser && (
        <ResetPasswordDialog
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
        />
      )}
    </>
  )
}
