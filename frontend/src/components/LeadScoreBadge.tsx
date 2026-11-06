// src/components/LeadScoreBadge.tsx — Crisp Light-Mode Lead Score
import { Flame, Zap, Snowflake } from 'lucide-react'

export default function LeadScoreBadge({ score }: { score: number }) {
  if (score >= 80) {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight shadow-xs">
        <Flame size={13} className="text-amber-600 fill-amber-500 animate-pulse" />
        <span>{score}/100</span>
        <span className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold hidden xs:inline">
          HOT
        </span>
      </span>
    )
  }
  if (score >= 60) {
    return (
      <span className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 text-sky-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
        <Zap size={12} className="text-sky-600 fill-sky-400" />
        <span>{score}/100</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
      <Snowflake size={12} className="text-slate-500" />
      <span>{score}/100</span>
    </span>
  )
}
