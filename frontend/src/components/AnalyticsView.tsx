// src/components/AnalyticsView.tsx — Simple, Clean Light-Mode Analytics
import { BarChart3, TrendingUp, Sparkles, Flame } from 'lucide-react'
import type { AnalyticsData } from '../api/client'

interface Props {
  analytics: AnalyticsData | null
  loading: boolean
}

export default function AnalyticsView({ analytics, loading }: Props) {
  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
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

  const maxCatCount = Math.max(...categories.map((c) => c.count), 1)
  const maxDailyCount = Math.max(...daily.map((d) => d.count), 1)

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Key Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">Total Pool</span>
            <span className="text-2xl font-bold text-slate-900 block mt-1">
              {analytics?.total_leads ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">Gurugram Businesses</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <BarChart3 size={20} />
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-amber-800 uppercase font-bold flex items-center gap-1">
              <Flame size={13} className="fill-amber-500 text-amber-600" /> Hot Leads
            </span>
            <span className="text-2xl font-bold text-amber-900 block mt-1">{hotLeads}</span>
            <span className="text-[11px] text-amber-700">
              {total > 0 ? `${Math.round((hotLeads / total) * 100)}% of pipeline` : '0%'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">Average Readiness</span>
            <span className="text-2xl font-bold text-indigo-600 block mt-1">{avgScore}%</span>
            <span className="text-[11px] text-slate-400">Digital Need Score</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* 7-Day Velocity Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
          <TrendingUp size={16} className="text-indigo-600" />
          <span>7-Day Lead Velocity</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Daily new business discoveries across Gurugram
        </p>

        {daily.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No trend data yet.</p>
        ) : (
          <div className="h-32 flex items-end gap-2 pt-4">
            {daily.map((d) => {
              const heightPct = Math.round((d.count / maxDailyCount) * 100)
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-24 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                      className="w-full bg-indigo-600 rounded-t-lg transition-all duration-500 group-hover:bg-indigo-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 truncate w-full text-center">
                    {d.date.slice(5)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Category Breakdown & Status Funnel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Categories */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h4 className="font-bold text-sm text-slate-900 mb-3">
            Top Gurugram Categories
          </h4>
          <div className="space-y-2.5">
            {categories.map((c) => {
              const pct = Math.round((c.count / maxCatCount) * 100)
              return (
                <div key={c.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{c.category}</span>
                    <span className="font-bold text-slate-900">{c.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-indigo-600 rounded-full"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h4 className="font-bold text-sm text-slate-900 mb-3">
            Sales Pipeline Funnel
          </h4>
          <div className="space-y-2.5">
            {statuses.map((s) => {
              const count = s.count
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={s.status} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 uppercase tracking-wide">
                      {s.status}
                    </span>
                    <span className="font-bold text-slate-900">
                      {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-emerald-600 rounded-full"
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
