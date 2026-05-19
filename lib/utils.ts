import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: bigint | number): string {
  return Number(amount).toLocaleString('vi-VN') + ' đ'
}

// Smart Match: chuẩn hóa SĐT trước khi so sánh — 0912... → 84912...
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('0') ? '84' + digits.slice(1) : digits
}
