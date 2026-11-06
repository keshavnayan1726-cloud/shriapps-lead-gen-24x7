// src/components/StatsBar.tsx — Clean, Friendly Light-Mode Metrics
import { Users, Flame, Zap, Target, Phone, Award } from 'lucide-react'
import type { Stats } from '../api/client'

interface Props {
  stats: Stats | undefined
  loading: boolean
  onFilterHotLeads?: () => void
}

export default function StatsBar({ stats, loading, onFilterHotLeads }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
      {/* 1. Total Leads */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
            Total Leads
          </span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">
            {loading ? '…' : stats?.total ?? 0}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
          <Users size={16} />
        </div>
      </div>

      {/* 2. Hot Leads (Clickable) */}
      <button
        onClick={onFilterHotLeads}
        className="bg-amber-50/70 hover:bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-left transition-all active:scale-95 group shadow-sm"
      >
        <div>
          <span className="text-[11px] font-bold text-amber-700 block uppercase tracking-wider flex items-center gap-1">
            Hot Leads
          </span>
          <span className="text-xl font-bold text-amber-800 mt-0.5 block">
            {loading ? '…' : stats?.hot_leads_count ?? 0}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
          <Flame size={16} className="fill-amber-500" />
        </div>
      </button>

      {/* 3. Discovered Today */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
            New Today
          </span>
          <span className="text-xl font-bold text-emerald-600 mt-0.5 block">
            {loading ? '…' : `+${stats?.today_new ?? 0}`}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
          <Zap size={16} className="fill-emerald-400" />
        </div>
      </div>

      {/* 4. Average Score */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
            Avg Score
          </span>
          <span className="text-xl font-bold text-indigo-600 mt-0.5 block">
            {loading ? '…' : `${stats?.average_score ?? 0}%`}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <Target size={16} />
        </div>
      </div>

      {/* 5. Contacted */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
            Contacted
          </span>
          <span className="text-xl font-bold text-blue-600 mt-0.5 block">
            {loading ? '…' : stats?.contacted ?? 0}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
          <Phone size={16} />
        </div>
      </div>

      {/* 6. Deals Won */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
            Deals Won
          </span>
          <span className="text-xl font-bold text-purple-600 mt-0.5 block">
            {loading ? '…' : stats?.closed ?? 0}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
          <Award size={16} />
        </div>
      </div>
    </div>
  )
}
