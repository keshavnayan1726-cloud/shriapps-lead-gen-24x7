// src/components/StatusBadge.tsx — Crisp Light-Mode Status Badge
import type { LeadStatus } from '../api/client'

const map: Record<LeadStatus, { label: string; classes: string }> = {
  new: { label: 'New', classes: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  contacted: { label: 'Contacted', classes: 'bg-amber-50 text-amber-800 border-amber-200' },
  interested: { label: 'Interested ⭐', classes: 'bg-sky-50 text-sky-700 border-sky-200' },
  closed: { label: 'Deal Won 🏆', classes: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rejected: { label: 'Archived', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
}

export default function StatusBadge({ status }: { status: LeadStatus }) {
  const item = map[status] || map.new
  return (
    <span
      className={`text-[11px] font-semibold tracking-wide border rounded-full px-2.5 py-0.5 shadow-xs inline-flex items-center gap-1 ${item.classes}`}
    >
      {item.label}
    </span>
  )
}
