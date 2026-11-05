// src/components/AnalyticsView.tsx
import { BarChart3, PieChart, TrendingUp, Sparkles, Flame } from 'lucide-react'
import type { AnalyticsData } from '../api/client'

interface Props {
  analytics: AnalyticsData | null
  loading: boolean
}

export default function AnalyticsView({ analytics, loading }: Props) {
  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <span className="text-sm">Calculating real-time analytics…</span>
      </div>
    )
  }

  const categories = analytics?.categories || []
  const statuses = analytics?.statuses || []
  const daily = analytics?.daily_trend || []
  const total = analytics?.total_leads || 1
  const hotLeads = analytics?.hot_leads || 0
  const avgScore = analytics?.average_score || 0

  // Find max count for normalized bar charts
  const maxCatCount = Math.max(...categories.map((c) => c.count), 1)
  const maxDailyCount = Math.max(...daily.map((d) => d.count), 1)

  return (
    <div className="space-y-4">
      {/* ── Key Conversion Highlights ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Pool</span>
            <span className="text-2xl font-black text-white block mt-1">{analytics?.total_leads ?? 0}</span>
            <span className="text-[11px] text-slate-500">Gurugram Businesses</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400">
            <BarChart3 size={20} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-amber-950/30 border border-amber-900/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-400 uppercase font-bold flex items-center gap-1">
              <Flame size={12} className="fill-amber-400" /> Hot Leads
            </span>
            <span className="text-2xl font-black text-amber-300 block mt-1">{hotLeads}</span>
            <span className="text-[11px] text-amber-400/80">
              {total > 0 ? `${Math.round((hotLeads / total) * 100)}% of pipeline` : '0%'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-violet-400 uppercase font-semibold">Avg AI Score</span>
            <span className="text-2xl font-black text-violet-300 block mt-1">{avgScore}/100</span>
            <span className="text-[11px] text-slate-500">Tech Opportunity Index</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-800 flex items-center justify-center text-violet-400">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* ── Daily Trend Chart (SVG) ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-emerald-400" />
          <span>7-Day AI Lead Acquisition Velocity</span>
        </h3>

        {daily.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No trend data yet. Autonomous scanner will log runs.</p>
        ) : (
          <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2">
            {daily.map((item, idx) => {
              const heightPct = Math.round((item.count / maxDailyCount) * 100)
              const label = item.date.slice(5) // MM-DD
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    +{item.count}
                  </span>
                  <div className="w-full bg-slate-800 rounded-t-lg h-24 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                      className="w-full bg-gradient-to-t from-emerald-600 to-sky-400 rounded-t-lg transition-all duration-500 group-hover:brightness-125"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">{label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Gurugram Sectors Breakdown & CRM Pipeline ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Categories Bar List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-sky-400" />
            <span>Top Gurugram Commercial Sectors</span>
          </h3>

          <div className="space-y-2.5">
            {categories.map((c, i) => {
              const pct = Math.round((c.count / maxCatCount) * 100)
              return (
                <div key={i} className="text-xs">
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="font-medium truncate max-w-[200px]">{c.category}</span>
                    <span className="font-bold text-white shrink-0">{c.count} leads</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pipeline Stage Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-3">
            <PieChart size={16} className="text-violet-400" />
            <span>Sales Pipeline Funnel</span>
          </h3>

          <div className="space-y-3">
            {statuses.map((s, idx) => {
              const pct = Math.round((s.count / total) * 100)
              const color =
                s.status === 'closed'
                  ? 'bg-emerald-500'
                  : s.status === 'interested'
                  ? 'bg-sky-500'
                  : s.status === 'contacted'
                  ? 'bg-amber-500'
                  : s.status === 'new'
                  ? 'bg-violet-500'
                  : 'bg-slate-600'

              return (
                <div key={idx} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="capitalize font-semibold text-slate-200">{s.status}</span>
                    <span className="text-slate-400 font-mono">{s.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`${color} h-full rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
