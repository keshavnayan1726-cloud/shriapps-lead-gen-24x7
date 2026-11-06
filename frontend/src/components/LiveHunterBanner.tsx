// src/components/LiveHunterBanner.tsx — Simple, Friendly Light-Mode Status Banner
import { useState } from 'react'
import { Play, Pause, RefreshCw, Zap, Sparkles } from 'lucide-react'
import type { SchedulerStatus } from '../api/client'

interface Props {
  scheduler: SchedulerStatus | null
  loading: boolean
  onToggle: () => Promise<void>
  onManualTrigger: () => void
  onTripleFleetTrigger?: () => void
}

export default function LiveHunterBanner({
  scheduler,
  loading: _loading,
  onToggle,
  onManualTrigger,
  onTripleFleetTrigger,
}: Props) {
  const isEnabled = scheduler?.is_enabled ?? true
  const intervalMins = scheduler?.interval_minutes || 60
  const agents = scheduler?.agents || []
  const anyRunning = agents.some((a) => a.is_running)

  const [toggling, setToggling] = useState(false)
  const [toggleFeedback, setToggleFeedback] = useState<string | null>(null)

  const handleToggleClick = async () => {
    setToggling(true)
    try {
      await onToggle()
      setToggleFeedback(!isEnabled ? '24/7 AI Resumed!' : '24/7 AI Paused')
      setTimeout(() => setToggleFeedback(null), 2500)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm mb-4 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Engine Status & 3x Fleet Badge */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              anyRunning
                ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-sm'
                : isEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm'
                : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}
          >
            {anyRunning ? (
              <RefreshCw size={20} className="animate-spin text-amber-600" />
            ) : (
              <Sparkles size={20} className={isEnabled ? 'text-emerald-600' : 'text-slate-400'} />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base text-slate-900 tracking-tight">
                24/7 Gurugram Business Hunter
              </h2>
              {/* Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  anyRunning
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : isEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    anyRunning
                      ? 'bg-amber-500 animate-ping'
                      : isEnabled
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
                {anyRunning ? '3x AI Scrapers Active' : isEnabled ? 'Active 24/7' : 'Paused'}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              {anyRunning
                ? 'Scraping and analyzing qualified Gurugram businesses right now...'
                : isEnabled
                ? `Rotating 3 AI fleets across 15+ Gurugram sectors every ${intervalMins}m.`
                : 'Autonomous hunter is currently paused.'}
            </p>

            {/* 3 AI Hunters Tags */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200/80 px-2 py-0.5 rounded-md">
                🍔 Hunter Alpha (F&B)
              </span>
              <span className="text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-md">
                🏥 Hunter Beta (Healthcare)
              </span>
              <span className="text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 rounded-md">
                💎 Hunter Gamma (Retail/Property)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {/* Pause / Resume Button */}
          <button
            onClick={handleToggleClick}
            disabled={toggling}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 shadow-sm ${
              isEnabled
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
            }`}
            title={isEnabled ? 'Pause 24/7 AI Scraper' : 'Resume 24/7 AI Scraper'}
          >
            {toggling ? (
              <RefreshCw size={13} className="animate-spin text-slate-400" />
            ) : isEnabled ? (
              <Pause size={13} className="text-slate-600" />
            ) : (
              <Play size={13} className="text-white fill-white" />
            )}
            <span>{toggleFeedback || (isEnabled ? 'Pause' : 'Resume AI')}</span>
          </button>

          {/* Launch 3x AI Fleet (Simultaneous) */}
          <button
            onClick={onTripleFleetTrigger || onManualTrigger}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all active:scale-95"
            title="Deploy all 3 AI Hunters simultaneously"
          >
            <Zap size={13} className="fill-amber-300 text-amber-300" />
            <span>Deploy 3x AI</span>
          </button>
        </div>
      </div>
    </div>
  )
}
