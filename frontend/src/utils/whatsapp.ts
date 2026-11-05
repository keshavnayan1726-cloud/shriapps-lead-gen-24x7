// src/utils/whatsapp.ts

/**
 * Strips formatting and non-digits (preserving leading +),
 * then builds a wa.me deep-link with the pitch URL-encoded.
 */
export function buildWhatsAppUrl(phone: string, pitch: string): string {
  const cleaned = cleanPhone(phone)
  const encoded = encodeURIComponent(pitch.trim())
  return `https://wa.me/${cleaned}?text=${encoded}`
}

export function cleanPhone(raw: string): string {
  if (!raw) return ''
  let cleaned = raw.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '+91' + cleaned.slice(1)
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = '+' + cleaned
  } else if (cleaned.length === 10) {
    cleaned = '+91' + cleaned
  }
  return cleaned
}

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '—'
  return raw
}
