'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PrerequisiteInfo {
  prerequisite_id: string
  logic_group: number
  prerequisite: { id: string; name: string }
}

interface ProgramOption {
  id: string
  name: string
  branch: string
  level: number | null
  prerequisites: PrerequisiteInfo[]
}

interface EligibleRow {
  contact_id: string
  contact_name: string
  contact_phone: string
  completed_programs: {
    program_id: string
    program_name: string
    completed_at: string
  }[]
  latest_completion_at: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRANCH_LABEL: Record<string, string> = {
  tu_duy: 'Tư duy',
  coaching: 'Coaching',
  ky_nang: 'Kỹ năng',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN')
}

// Mô tả điều kiện lên cấp dạng văn bản để Admin hiểu
function describePrerequisites(prereqs: PrerequisiteInfo[]): string {
  const groups = new Map<number, string[]>()
  for (const p of prereqs) {
    if (!groups.has(p.logic_group)) groups.set(p.logic_group, [])
    groups.get(p.logic_group)!.push(p.prerequisite.name)
  }

  const groupDescriptions = Array.from(groups.values()).map((names) =>
    names.length === 1 ? names[0] : `(${names.join(' hoặc ')})`
  )

  return 'Đã hoàn thành: ' + groupDescriptions.join(' và ')
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgressionPage() {
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [eligible, setEligible] = useState<EligibleRow[]>([])
  const [alreadyEnrolledCount, setAlreadyEnrolledCount] = useState(0)

  // Tải danh sách programs có prerequisites
  useEffect(() => {
    fetch('/api/admin/reports/progression')
      .then((res) => res.json())
      .then((data) => {
        const list: ProgramOption[] = data.programs ?? []
        setPrograms(list)
        // Mặc định: chọn program Cấp 2 Tư duy (level=2 branch=tu_duy), hoặc program đầu tiên
        const defaultProgram =
          list.find((p) => p.branch === 'tu_duy' && p.level === 2) ?? list[0]
        if (defaultProgram) setSelectedId(defaultProgram.id)
      })
      .finally(() => setLoading(false))
  }, [])

  const fetchEligible = useCallback(async (programId: string) => {
    if (!programId) return
    setSearching(true)
    try {
      const res = await fetch(
        `/api/admin/reports/progression?targetProgramId=${programId}`,
      )
      const data = await res.json()
      setEligible(data.eligible ?? [])
      setAlreadyEnrolledCount(data.alreadyEnrolledCount ?? 0)
    } finally {
      setSearching(false)
    }
  }, [])

  // Fetch khi selectedId thay đổi
  useEffect(() => {
    if (selectedId) fetchEligible(selectedId)
  }, [selectedId, fetchEligible])

  const selectedProgram = programs.find((p) => p.id === selectedId)

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center text-gray-400">
        Đang tải...
      </div>
    )
  }

  if (programs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
        <p className="text-gray-400">
          Chưa có chương trình nào có điều kiện tiên quyết được thiết lập.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#E8471A] uppercase tracking-wide">Lên cấp · Upsell</h1>
        <p className="text-gray-400 text-sm mt-1">
          Danh sách học viên đủ điều kiện học chương trình tiếp theo — chưa đăng ký
        </p>
      </div>

      {/* Chọn chương trình mục tiêu */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-5 py-4 mb-5">
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Chương trình mục tiêu
        </label>
        <div className="flex flex-wrap items-start gap-4">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy/30 bg-white dark:bg-gray-800 text-ink dark:text-gray-100 min-w-[280px]"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({BRANCH_LABEL[p.branch] ?? p.branch}
                {p.level != null ? ` · Cấp ${p.level}` : ''})
              </option>
            ))}
          </select>

          {/* Mô tả điều kiện */}
          {selectedProgram && selectedProgram.prerequisites.length > 0 && (
            <p className="text-sm text-muted-foreground pt-2">
              <span className="font-medium">Điều kiện:</span>{' '}
              {describePrerequisites(selectedProgram.prerequisites)}
            </p>
          )}
        </div>
      </div>

      {/* Kết quả */}
      {searching ? (
        <div className="bg-background rounded-xl border border-border shadow-sm p-10 text-center text-muted-foreground">
          Đang tìm kiếm...
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-flame/10 text-flame text-sm font-semibold px-3 py-1.5 rounded-full">
              <span className="text-base font-bold">{eligible.length}</span>
              người đủ điều kiện · chưa đăng ký
            </span>
            {alreadyEnrolledCount > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-sm font-medium px-3 py-1.5 rounded-full">
                {alreadyEnrolledCount} người đã đăng ký rồi
              </span>
            )}
          </div>

          {eligible.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
              <p className="text-gray-400">
                {alreadyEnrolledCount > 0
                  ? `Tất cả ${alreadyEnrolledCount} học viên đủ điều kiện đã đăng ký chương trình này rồi.`
                  : 'Chưa có học viên nào đủ điều kiện học chương trình này.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                  Sắp xếp: hoàn thành gần nhất lên đầu — cơ hội upsell cao nhất
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Học viên
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Khóa đã hoàn thành
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Hoàn thành lúc
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((row) => (
                    <tr
                      key={row.contact_id}
                      className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{row.contact_name}</p>
                        <p className="text-xs text-gray-400">{row.contact_phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {/* De-duplicate by program_id vì có thể học nhiều lớp cùng program */}
                          {Array.from(
                            new Map(
                              row.completed_programs.map((cp) => [cp.program_id, cp]),
                            ).values(),
                          ).map((cp) => (
                            <span
                              key={cp.program_id}
                              className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium"
                            >
                              ✓ {cp.program_name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                        {formatDate(row.latest_completion_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/admin/contacts/${row.contact_id}`}
                          target="_blank"
                          className="inline-block bg-navy text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-navy-light transition-colors"
                        >
                          Xem hồ sơ →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
