// src/components/StatsBar.tsx
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Total Leads</span>
          <span className="text-xl font-black text-white mt-0.5 block">
            {loading ? '…' : stats?.total ?? 0}
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
          <Users size={16} />
        </div>
      </div>

      {/* 2. Hot Leads (Clickable) */}
      <button
        onClick={onFilterHotLeads}
        className="bg-gradient-to-br from-slate-900 to-amber-950/20 border border-amber-900/40 hover:border-amber-600/60 rounded-2xl p-3 flex items-center justify-between text-left transition-all group"
      >
        <div>
          <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider flex items-center gap-1">
            Hot Leads
          </span>
          <span className="text-xl font-black text-amber-300 mt-0.5 block">
            {loading ? '…' : stats?.hot_leads_count ?? 0}
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
          <Flame size={16} className="fill-amber-400" />
        </div>
      </button>

      {/* 3. Discovered Today */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">New Today</span>
          <span className="text-xl font-black text-emerald-400 mt-0.5 block">
            {loading ? '…' : `+${stats?.today_new ?? 0}`}
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
          <Zap size={16} className="fill-emerald-400/30" />
        </div>
      </div>

      {/* 4. Average Lead Score */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Avg Quality</span>
          <span className="text-xl font-black text-violet-300 mt-0.5 block">
            {loading ? '…' : `${stats?.average_score ?? 0}%`}
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-violet-950/60 border border-violet-800/60 flex items-center justify-center text-violet-400">
          <Target size={16} />
        </div>
      </div>

      {/* 5. Contacted */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Contacted</span>
          <span className="text-xl font-black text-amber-300 mt-0.5 block">
            {loading ? '…' : stats?.contacted ?? 0}
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
          <Phone size={16} />
        </div>
      </div>

      {/* 6. Deals Won */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Deals Won</span>
          <span className="text-xl font-black text-emerald-300 mt-0.5 block">
            {loading ? '…' : stats?.closed ?? 0}
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
          <Award size={16} />
        </div>
      </div>
    </div>
  )
}
