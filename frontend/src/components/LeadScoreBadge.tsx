// src/components/LeadScoreBadge.tsx
import { Flame, Zap, Snowflake } from 'lucide-react'

export default function LeadScoreBadge({ score }: { score: number }) {
  if (score >= 80) {
    return (
      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight shadow-sm">
        <Flame size={13} className="text-amber-400 fill-amber-400 animate-pulse" />
        <span>{score}/100</span>
        <span className="text-[10px] uppercase tracking-wider text-amber-400 font-extrabold hidden xs:inline">HOT</span>
      </span>
    )
  }
  if (score >= 60) {
    return (
      <span className="inline-flex items-center gap-1 bg-sky-950/70 border border-sky-700/60 text-sky-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">
        <Zap size={12} className="text-sky-400 fill-sky-400" />
        <span>{score}/100</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 text-slate-400 px-2.5 py-0.5 rounded-full text-xs font-medium">
      <Snowflake size={12} className="text-slate-400" />
      <span>{score}/100</span>
    </span>
  )
}
