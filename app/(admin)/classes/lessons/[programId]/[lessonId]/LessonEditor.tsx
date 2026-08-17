'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Lesson {
  id: string
  session_number: number
  title: string
  objectives: string | null
  content: string | null
  materials_url: string | null
  discussion_questions: string | null
  notes_for_teacher: string | null
  program: { id: string; name: string; branch: string }
  _count: { versions: number }
}

interface LessonVersion {
  id: string
  version_number: number
  title: string
  objectives: string | null
  content: string | null
  materials_url: string | null
  discussion_questions: string | null
  notes_for_teacher: string | null
  change_note: string | null
  created_at: string
  created_by: { full_name: string }
}

interface AiSuggestion {
  content?: string
  discussion_questions?: string
  notes_for_teacher?: string
}

export default function LessonEditor({ lesson }: { lesson: Lesson }) {
  const router = useRouter()

  const [form, setForm] = useState({
    title: lesson.title,
    objectives: lesson.objectives ?? '',
    content: lesson.content ?? '',
    materials_url: lesson.materials_url ?? '',
    discussion_questions: lesson.discussion_questions ?? '',
    notes_for_teacher: lesson.notes_for_teacher ?? '',
    change_note: '',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; versionNumber?: number; msg?: string } | null>(null)

  // Panel AI
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null)
  const [aiError, setAiError] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)

  // Panel lịch sử
  const [versions, setVersions] = useState<LessonVersion[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versionCount, setVersionCount] = useState(lesson._count.versions)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSave() {
    setSaveResult(null)
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveResult({ ok: false, msg: data.error || 'Có lỗi xảy ra' })
        return
      }
      setVersionCount(data.version.version_number)
      setSaveResult({ ok: true, versionNumber: data.version.version_number })
      setForm((f) => ({ ...f, change_note: '' }))
      router.refresh()
    } catch {
      setSaveResult({ ok: false, msg: 'Không thể kết nối server' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAiSuggest = useCallback(async () => {
    setAiError('')
    setIsAiLoading(true)
    setShowAiPanel(true)
    setShowVersions(false)
    setAiSuggestion(null)
    try {
      const res = await fetch(`/api/admin/lessons/${lesson.id}/ai-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, objectives: form.objectives }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error || 'AI không phản hồi được')
        return
      }
      setAiSuggestion(data.suggestion)
    } catch {
      setAiError('Không thể kết nối AI')
    } finally {
      setIsAiLoading(false)
    }
  }, [lesson.id, form.title, form.objectives])

  async function loadVersions() {
    setVersionsLoading(true)
    setShowVersions(true)
    setShowAiPanel(false)
    try {
      const res = await fetch(`/api/admin/lessons/${lesson.id}/versions`)
      const data = await res.json()
      setVersions(data)
    } finally {
      setVersionsLoading(false)
    }
  }

  async function handleRestore(version: LessonVersion) {
    if (!confirm(`Khôi phục về Version ${version.version_number}? Nội dung hiện tại sẽ được lưu thành version mới.`)) return
    setRestoringId(version.id)
    try {
      const res = await fetch(`/api/admin/lessons/${lesson.id}/versions/${version.id}/restore`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Có lỗi xảy ra')
        return
      }
      // Cập nhật form với nội dung đã khôi phục
      setForm({
        title: data.lesson.title,
        objectives: data.lesson.objectives ?? '',
        content: data.lesson.content ?? '',
        materials_url: data.lesson.materials_url ?? '',
        discussion_questions: data.lesson.discussion_questions ?? '',
        notes_for_teacher: data.lesson.notes_for_teacher ?? '',
        change_note: '',
      })
      setVersionCount(data.version.version_number)
      setSaveResult({ ok: true, versionNumber: data.version.version_number })
      await loadVersions()
      router.refresh()
    } finally {
      setRestoringId(null)
    }
  }

  function applyAiField(field: 'content' | 'discussion_questions' | 'notes_for_teacher') {
    const value = aiSuggestion?.[field]
    if (value) setForm((f) => ({ ...f, [field]: value }))
  }

  const hasAiField = (field: 'content' | 'discussion_questions' | 'notes_for_teacher') =>
    Boolean(aiSuggestion?.[field])

  return (
    <div className="flex gap-6 items-start">
      {/* FORM — cột trái */}
      <div className="flex-1 min-w-0">
        <div className="bg-background rounded-xl shadow-sm border border-border p-6 space-y-5">

          {/* Tiêu đề */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Tiêu đề buổi học *
            </label>
            <input
              value={form.title}
              onChange={set('title')}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-flame/30"
              placeholder="Nhập tiêu đề buổi học"
            />
          </div>

          {/* Mục tiêu */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Mục tiêu buổi học
            </label>
            <input
              value={form.objectives}
              onChange={set('objectives')}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-flame/30"
              placeholder="Học viên hiểu được... / Học viên làm được..."
            />
          </div>

          {/* Nội dung */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Nội dung bài giảng
              </label>
              <div className="flex items-center gap-2">
                {hasAiField('content') && (
                  <button
                    type="button"
                    onClick={() => applyAiField('content')}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Dùng gợi ý AI →
                  </button>
                )}
                <span className="text-xs text-muted-foreground/70">Hỗ trợ Markdown</span>
              </div>
            </div>
            <textarea
              value={form.content}
              onChange={set('content')}
              rows={12}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-flame/30 resize-y"
              placeholder="## Giới thiệu&#10;&#10;Nội dung buổi học...&#10;&#10;## Nội dung chính&#10;&#10;1. Điểm 1&#10;2. Điểm 2&#10;&#10;## Tóm tắt"
            />
          </div>

          {/* Link tài liệu */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Link tài liệu
            </label>
            <input
              value={form.materials_url}
              onChange={set('materials_url')}
              type="url"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-flame/30"
              placeholder="https://drive.google.com/..."
            />
          </div>

          {/* Câu hỏi thảo luận */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Câu hỏi thảo luận
              </label>
              {hasAiField('discussion_questions') && (
                <button
                  type="button"
                  onClick={() => applyAiField('discussion_questions')}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Dùng gợi ý AI →
                </button>
              )}
            </div>
            <textarea
              value={form.discussion_questions}
              onChange={set('discussion_questions')}
              rows={5}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-flame/30 resize-y"
              placeholder="1. Câu hỏi thảo luận đầu tiên?&#10;2. Câu hỏi thứ hai?&#10;3. ..."
            />
          </div>

          {/* Ghi chú giảng viên */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Ghi chú giảng viên
              </label>
              {hasAiField('notes_for_teacher') && (
                <button
                  type="button"
                  onClick={() => applyAiField('notes_for_teacher')}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Dùng gợi ý AI →
                </button>
              )}
            </div>
            <textarea
              value={form.notes_for_teacher}
              onChange={set('notes_for_teacher')}
              rows={4}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-flame/30 resize-y"
              placeholder="Lưu ý điểm cần nhấn mạnh, cách xử lý câu hỏi khó..."
            />
          </div>

          {/* Ghi chú thay đổi lần này */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Ghi chú thay đổi <span className="font-normal text-muted-foreground/70 normal-case">(không bắt buộc)</span>
            </label>
            <input
              value={form.change_note}
              onChange={set('change_note')}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-flame/30"
              placeholder="VD: Cập nhật nội dung theo phản hồi học viên tháng 5"
            />
          </div>

          {/* Save result */}
          {saveResult && (
            <div className={`text-sm px-3 py-2 rounded-lg ${saveResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {saveResult.ok
                ? `Đã lưu thành công (Version ${saveResult.versionNumber})`
                : saveResult.msg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-flame text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-flame-light disabled:opacity-50 transition-colors min-w-[100px]"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu bài giảng'}
            </button>

            <button
              onClick={handleAiSuggest}
              disabled={isAiLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 transition-colors"
            >
              <span>✨</span>
              {isAiLoading ? 'Đang hỏi AI...' : 'AI gợi ý'}
            </button>

            <button
              onClick={showVersions ? () => setShowVersions(false) : loadVersions}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:border-border/80 transition-colors"
            >
              <span>🕐</span>
              Lịch sử{versionCount > 0 ? ` (v${versionCount})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* PANEL PHẢI — AI gợi ý hoặc Lịch sử */}
      {(showAiPanel || showVersions) && (
        <div className="w-96 flex-shrink-0">
          <div className="bg-background rounded-xl shadow-sm border border-border p-5">
            {/* AI Panel */}
            {showAiPanel && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-ink flex items-center gap-2">
                    <span>✨</span> Gợi ý từ AI
                  </h3>
                  <button
                    onClick={() => setShowAiPanel(false)}
                    className="text-muted-foreground/70 hover:text-foreground text-lg leading-none"
                  >
                    ×
                  </button>
                </div>

                {isAiLoading && (
                  <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground/70">
                    <div className="w-5 h-5 border-2 border-border border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm">AI đang soạn nội dung...</span>
                  </div>
                )}

                {aiError && (
                  <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{aiError}</div>
                )}

                {aiSuggestion && !isAiLoading && (
                  <div className="space-y-4 text-sm">
                    <p className="text-xs text-muted-foreground/70">
                      Bấm "Dùng gợi ý AI →" bên cạnh từng trường để áp dụng vào form.
                      Bạn có thể chỉnh sửa trước khi lưu.
                    </p>

                    {aiSuggestion.content && (
                      <AiSectionPreview
                        label="Nội dung bài giảng"
                        value={aiSuggestion.content}
                        onApply={() => applyAiField('content')}
                      />
                    )}
                    {aiSuggestion.discussion_questions && (
                      <AiSectionPreview
                        label="Câu hỏi thảo luận"
                        value={aiSuggestion.discussion_questions}
                        onApply={() => applyAiField('discussion_questions')}
                      />
                    )}
                    {aiSuggestion.notes_for_teacher && (
                      <AiSectionPreview
                        label="Ghi chú giảng viên"
                        value={aiSuggestion.notes_for_teacher}
                        onApply={() => applyAiField('notes_for_teacher')}
                      />
                    )}

                    <button
                      onClick={handleAiSuggest}
                      className="w-full text-xs text-center text-muted-foreground/70 hover:text-blue-500 py-1 border border-dashed border-border rounded-lg hover:border-blue-300 transition-colors"
                    >
                      Tạo lại gợi ý
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Version History Panel */}
            {showVersions && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-ink flex items-center gap-2">
                    <span>🕐</span> Lịch sử phiên bản
                  </h3>
                  <button
                    onClick={() => setShowVersions(false)}
                    className="text-muted-foreground/70 hover:text-foreground text-lg leading-none"
                  >
                    ×
                  </button>
                </div>

                {versionsLoading && (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-border border-t-flame rounded-full animate-spin" />
                  </div>
                )}

                {!versionsLoading && versions.length === 0 && (
                  <p className="text-sm text-muted-foreground/70 text-center py-6">Chưa có phiên bản nào được lưu</p>
                )}

                {!versionsLoading && versions.length > 0 && (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {versions.map((v) => (
                      <div
                        key={v.id}
                        className="border border-border rounded-lg p-3 hover:border-border/80 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-navy bg-navy/10 px-2 py-0.5 rounded">
                            v{v.version_number}
                          </span>
                          <span className="text-xs text-muted-foreground/70 text-right">
                            {new Date(v.created_at).toLocaleString('vi-VN', {
                              day: '2-digit', month: '2-digit', year: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-ink mb-0.5">{v.title}</p>
                        <p className="text-xs text-muted-foreground/70">{v.created_by.full_name}</p>
                        {v.change_note && (
                          <p className="text-xs text-muted-foreground italic mt-1 border-l-2 border-border pl-2">
                            {v.change_note}
                          </p>
                        )}
                        {v.version_number < versionCount && (
                          <button
                            onClick={() => handleRestore(v)}
                            disabled={restoringId === v.id}
                            className="mt-2 text-xs text-flame hover:underline disabled:opacity-50 font-medium"
                          >
                            {restoringId === v.id ? 'Đang khôi phục...' : 'Khôi phục version này'}
                          </button>
                        )}
                        {v.version_number === versionCount && (
                          <span className="mt-2 inline-block text-xs text-green-600 font-medium">
                            ✓ Phiên bản hiện tại
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AiSectionPreview({
  label,
  value,
  onApply,
}: {
  label: string
  value: string
  onApply: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-blue-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-blue-50">
        <span className="text-xs font-semibold text-blue-700">{label}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-blue-500 hover:underline"
          >
            {expanded ? 'Thu gọn' : 'Xem trước'}
          </button>
          <button
            onClick={onApply}
            className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-2 py-0.5 rounded transition-colors"
          >
            Dùng →
          </button>
        </div>
      </div>
      {expanded && (
        <pre className="p-3 text-xs text-foreground/90 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto bg-background">
          {value}
        </pre>
      )}
    </div>
  )
}
