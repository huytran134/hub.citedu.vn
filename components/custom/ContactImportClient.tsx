'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportRow = {
  name: string
  phone: string
  source: string
  email?: string | null
  note?: string | null
}

type ConflictEntry = {
  phone: string
  file: { name: string; email?: string | null; source: string }
  db: { id: string; name: string; email?: string | null; source: string }
  diff: string[]
}

type ImportResult = {
  created: number
  skipped: number
  conflicts: ConflictEntry[]
}

type Step = 'upload' | 'preview' | 'processing' | 'result'

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSVRow(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

// Mapping tên cột → field
const COL_ALIASES: Record<keyof ImportRow, string[]> = {
  name: ['họ tên', 'tên', 'ho ten', 'ten', 'name', 'fullname', 'full_name', 'họ và tên', 'ho va ten'],
  phone: ['số điện thoại', 'sdt', 'phone', 'điện thoại', 'dien thoai', 'so dien thoai', 'số dt', 'tel'],
  source: ['nguồn', 'source', 'nguon', 'kênh', 'kenh'],
  email: ['email', 'e-mail', 'mail'],
  note: ['ghi chú', 'note', 'notes', 'ghi chu', 'ghi_chu'],
}

function findColIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().trim())
  for (const alias of aliases) {
    const idx = normalized.findIndex((h) => h === alias || h.includes(alias))
    if (idx !== -1) return idx
  }
  return -1
}

function parseCSV(text: string): { rows: ImportRow[]; errors: string[] } {
  // Xóa BOM UTF-8 (thường có khi export từ Excel)
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const lines = clean.split('\n').filter((l) => l.trim())
  if (lines.length < 2) {
    return { rows: [], errors: ['File không có dữ liệu (cần ít nhất 1 dòng header + 1 dòng data)'] }
  }

  // Tự phát hiện delimiter: ưu tiên tab, rồi semicolon, rồi comma
  const firstLine = lines[0]
  const delimiter = firstLine.includes('\t')
    ? '\t'
    : firstLine.split(';').length > firstLine.split(',').length
      ? ';'
      : ','

  const rawHeaders = parseCSVRow(lines[0], delimiter)
  const errors: string[] = []

  // Xác định index của từng cột
  const colIdx: Record<keyof ImportRow, number> = {
    name: findColIndex(rawHeaders, COL_ALIASES.name),
    phone: findColIndex(rawHeaders, COL_ALIASES.phone),
    source: findColIndex(rawHeaders, COL_ALIASES.source),
    email: findColIndex(rawHeaders, COL_ALIASES.email),
    note: findColIndex(rawHeaders, COL_ALIASES.note),
  }

  // Kiểm tra cột bắt buộc
  const missing: string[] = []
  if (colIdx.name === -1) missing.push('"Họ tên"')
  if (colIdx.phone === -1) missing.push('"Số điện thoại"')
  if (colIdx.source === -1) missing.push('"Nguồn"')

  if (missing.length > 0) {
    return {
      rows: [],
      errors: [`File thiếu cột bắt buộc: ${missing.join(', ')}. Tên cột cần khớp với: Họ tên | Số điện thoại | Nguồn`],
    }
  }

  const rows: ImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i], delimiter)
    const phone = cells[colIdx.phone]?.trim() ?? ''
    if (!phone) continue // Bỏ qua dòng không có SĐT — không báo lỗi

    rows.push({
      name: cells[colIdx.name]?.trim() ?? '',
      phone,
      source: cells[colIdx.source]?.trim() ?? 'other',
      email: colIdx.email !== -1 ? (cells[colIdx.email]?.trim() || null) : undefined,
      note: colIdx.note !== -1 ? (cells[colIdx.note]?.trim() || null) : undefined,
    })
  }

  return { rows, errors }
}

// ─── Source Label ──────────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook', website: 'Website', hys: 'HYS',
  referral: 'Giới thiệu', event: 'Sự kiện', other: 'Khác',
}

const DIFF_LABEL: Record<string, string> = {
  name: 'Tên', email: 'Email', source: 'Nguồn',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContactImportClient() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
  const [parseError, setParseError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [apiError, setApiError] = useState('')

  // ── Step 1: Đọc và parse file CSV ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParseError('')
    setParsedRows([])

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { rows, errors } = parseCSV(text)
      if (errors.length > 0) {
        setParseError(errors[0])
        setStep('upload')
        return
      }
      setParsedRows(rows)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  // ── Step 2: Gửi lên API ──
  const handleImport = async () => {
    setStep('processing')
    setApiError('')

    try {
      const res = await fetch('/api/admin/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedRows),
      })

      if (!res.ok) {
        const err = await res.json()
        setApiError(err.error ?? 'Có lỗi xảy ra')
        setStep('preview')
        return
      }

      const data: ImportResult = await res.json()
      setResult(data)
      setStep('result')
    } catch {
      setApiError('Không kết nối được máy chủ')
      setStep('preview')
    }
  }

  // ── Reset ──
  const reset = () => {
    setStep('upload')
    setFileName('')
    setParsedRows([])
    setParseError('')
    setResult(null)
    setApiError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">
      {/* ── STEP: UPLOAD ──────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div>
          {/* Hướng dẫn format */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6">
            <p className="text-sm font-semibold text-blue-800 mb-2">Định dạng CSV yêu cầu</p>
            <p className="text-sm text-blue-700 mb-3">
              File CSV cần có ít nhất 3 cột (tên cột không phân biệt hoa/thường):
            </p>
            <div className="bg-white rounded-lg border border-blue-100 overflow-x-auto">
              <table className="text-xs w-full">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-blue-700">Họ tên *</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-700">Số điện thoại *</th>
                    <th className="px-3 py-2 text-left font-semibold text-blue-700">Nguồn *</th>
                    <th className="px-3 py-2 text-left text-blue-500">Email</th>
                    <th className="px-3 py-2 text-left text-blue-500">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-blue-50">
                    <td className="px-3 py-2 text-gray-600">Nguyễn Văn A</td>
                    <td className="px-3 py-2 text-gray-600">0912345678</td>
                    <td className="px-3 py-2 text-gray-600">Facebook</td>
                    <td className="px-3 py-2 text-gray-400">a@gmail.com</td>
                    <td className="px-3 py-2 text-gray-400">Quan tâm khóa TD</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Cột Nguồn chấp nhận: Facebook · Website · HYS · Giới thiệu · Sự kiện · Khác
            </p>
          </div>

          {/* Drop zone */}
          <label
            htmlFor="csv-file"
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-12 cursor-pointer hover:border-flame/50 hover:bg-flame/5 transition-colors"
          >
            <div className="text-4xl mb-3 text-gray-300">📊</div>
            <p className="text-base font-semibold text-ink mb-1">Chọn file CSV để import</p>
            <p className="text-sm text-gray-400">hoặc kéo thả vào đây</p>
            {fileName && (
              <p className="mt-3 text-sm font-medium text-flame">{fileName}</p>
            )}
            <input
              ref={fileRef}
              id="csv-file"
              type="file"
              accept=".csv,.tsv,text/csv"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {parseError && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-sm text-red-600 font-medium">{parseError}</p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: PREVIEW ─────────────────────────────────────────────────── */}
      {step === 'preview' && (
        <div>
          {/* Stats */}
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-800">Đọc thành công</p>
              <p className="text-sm text-green-700">
                {parsedRows.length} dòng hợp lệ từ file <span className="font-medium">{fileName}</span>
              </p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Chọn file khác
            </button>
          </div>

          {/* Preview table — 10 dòng đầu */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Xem trước ({Math.min(10, parsedRows.length)} / {parsedRows.length} dòng)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs text-gray-500 px-4 py-2.5 font-medium">Tên</th>
                    <th className="text-left text-xs text-gray-500 px-4 py-2.5 font-medium">SĐT</th>
                    <th className="text-left text-xs text-gray-500 px-4 py-2.5 font-medium">Nguồn</th>
                    <th className="text-left text-xs text-gray-500 px-4 py-2.5 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parsedRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-ink font-medium">{row.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.phone}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.source}</td>
                      <td className="px-4 py-2.5 text-gray-400">{row.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 10 && (
              <p className="text-xs text-gray-400 text-center py-2.5 border-t border-gray-50">
                + {parsedRows.length - 10} dòng nữa
              </p>
            )}
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-600">{apiError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="border border-gray-200 text-sm font-semibold rounded-lg px-5 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              Huỷ
            </button>
            <button
              onClick={handleImport}
              className="bg-flame text-white text-sm font-semibold rounded-lg px-6 py-2.5 hover:bg-flame/90 transition-colors min-h-[44px] flex items-center gap-2"
            >
              Bắt đầu import {parsedRows.length} dòng
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: PROCESSING ──────────────────────────────────────────────── */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 border-4 border-flame/30 border-t-flame rounded-full animate-spin mb-4" />
          <p className="text-base font-semibold text-ink">Đang import...</p>
          <p className="text-sm text-gray-400 mt-1">Xử lý {parsedRows.length} dòng — vui lòng chờ</p>
        </div>
      )}

      {/* ── STEP: RESULT ──────────────────────────────────────────────────── */}
      {step === 'result' && result && (
        <div>
          {/* Summary badges */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex-1 min-w-[120px] bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{result.created}</p>
              <p className="text-sm text-green-700 mt-0.5 font-medium">Contact mới</p>
            </div>
            <div className="flex-1 min-w-[120px] bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-gray-500">{result.skipped}</p>
              <p className="text-sm text-gray-500 mt-0.5 font-medium">Trùng · bỏ qua</p>
            </div>
            <div className={`flex-1 min-w-[120px] rounded-xl p-4 text-center border ${
              result.conflicts.length > 0
                ? 'bg-amber-50 border-amber-100'
                : 'bg-gray-50 border-gray-100'
            }`}>
              <p className={`text-3xl font-bold ${result.conflicts.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {result.conflicts.length}
              </p>
              <p className={`text-sm mt-0.5 font-medium ${result.conflicts.length > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                Xung đột · cần xem
              </p>
            </div>
          </div>

          {/* Conflict table */}
          {result.conflicts.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-amber-50 bg-amber-50/50">
                <p className="text-sm font-semibold text-amber-800">
                  {result.conflicts.length} xung đột cần Admin xem lại
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Dữ liệu trong DB giữ nguyên — không tự động ghi đè
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">SĐT</th>
                      <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">Trong file</th>
                      <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">Trong DB</th>
                      <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">Field khác nhau</th>
                      <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.conflicts.map((c, i) => (
                      <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.phone}</td>

                        {/* File data */}
                        <td className="px-4 py-3">
                          <p className={`font-medium ${c.diff.includes('name') ? 'text-amber-700' : 'text-ink'}`}>
                            {c.file.name}
                          </p>
                          {c.file.email && (
                            <p className={`text-xs mt-0.5 ${c.diff.includes('email') ? 'text-amber-600' : 'text-gray-400'}`}>
                              {c.file.email}
                            </p>
                          )}
                          <p className={`text-xs mt-0.5 ${c.diff.includes('source') ? 'text-amber-600' : 'text-gray-400'}`}>
                            {SOURCE_LABEL[c.file.source] ?? c.file.source}
                          </p>
                        </td>

                        {/* DB data */}
                        <td className="px-4 py-3">
                          <p className={`font-medium ${c.diff.includes('name') ? 'text-amber-700' : 'text-ink'}`}>
                            {c.db.name}
                          </p>
                          {c.db.email && (
                            <p className={`text-xs mt-0.5 ${c.diff.includes('email') ? 'text-amber-600' : 'text-gray-400'}`}>
                              {c.db.email}
                            </p>
                          )}
                          <p className={`text-xs mt-0.5 ${c.diff.includes('source') ? 'text-amber-600' : 'text-gray-400'}`}>
                            {SOURCE_LABEL[c.db.source] ?? c.db.source}
                          </p>
                        </td>

                        {/* Diff fields */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.diff.map((field) => (
                              <span
                                key={field}
                                className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full"
                              >
                                {DIFF_LABEL[field] ?? field}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Link xem hồ sơ */}
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/contacts/${c.db.id}`}
                            className="text-xs font-semibold text-flame hover:underline whitespace-nowrap"
                          >
                            Xem hồ sơ →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Done message khi không có conflict */}
          {result.conflicts.length === 0 && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-5 mb-6 text-center">
              <p className="text-base font-semibold text-green-700">Import hoàn tất, không có xung đột</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="border border-gray-200 text-sm font-semibold rounded-lg px-5 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              Import file khác
            </button>
            <Link
              href="/admin/contacts"
              className="bg-flame text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-flame/90 transition-colors min-h-[44px] flex items-center"
            >
              Xem danh sách Contacts
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
