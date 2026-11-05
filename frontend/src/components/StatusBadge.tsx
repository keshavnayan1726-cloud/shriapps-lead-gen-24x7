// src/components/StatusBadge.tsx
import type { LeadStatus } from '../api/client'

const map: Record<LeadStatus, { label: string; classes: string }> = {
  new: { label: 'New', classes: 'bg-violet-950/80 text-violet-300 border-violet-800' },
  contacted: { label: 'Contacted', classes: 'bg-amber-950/80 text-amber-300 border-amber-800' },
  interested: { label: 'Interested ⭐', classes: 'bg-sky-950/80 text-sky-300 border-sky-800' },
  closed: { label: 'Deal Won 🏆', classes: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' },
  rejected: { label: 'Archived', classes: 'bg-rose-950/80 text-rose-300 border-rose-800' },
}

export default function StatusBadge({ status }: { status: LeadStatus }) {
  const item = map[status] || map.new
  return (
    <span className={`text-[11px] font-semibold tracking-wide border rounded-full px-2.5 py-0.5 shadow-sm inline-flex items-center gap-1 ${item.classes}`}>
      {item.label}
    </span>
  )
}
