// src/components/LiveHunterBanner.tsx
import { useState } from 'react'
import { Bot, Play, Pause, RefreshCw, Compass, CheckCircle } from 'lucide-react'
import type { SchedulerStatus } from '../api/client'

interface Props {
  scheduler: SchedulerStatus | null
  loading: boolean
  onToggle: () => Promise<void>
  onManualTrigger: () => void
}

export default function LiveHunterBanner({
  scheduler,
  loading,
  onToggle,
  onManualTrigger,
}: Props) {
  const isEnabled = scheduler?.is_enabled ?? true
  const isBusy = (scheduler?.active_jobs_count ?? 0) > 0
  const currentCategory = scheduler?.current_category || 'Commercial Sectors Gurugram'
  const intervalMins = scheduler?.interval_minutes || 60

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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 p-4 sm:p-5 shadow-2xl mb-4 transition-all">
      {/* Background ambient glow */}
      <div
        className={`absolute -right-10 -top-10 w-52 h-52 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-700 ${
          isBusy
            ? 'bg-amber-500'
            : isEnabled
            ? 'bg-emerald-500'
            : 'bg-rose-500'
        }`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        {/* Left: AI Hunter Status & Info */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
              isBusy
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-400 shadow-lg shadow-amber-950/40'
                : isEnabled
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400 shadow-lg shadow-emerald-950/40'
                : 'bg-slate-850 border-slate-700 text-slate-400'
            }`}
          >
            <Bot size={26} className={isBusy ? 'animate-bounce' : ''} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                24/7 Autonomous AI Hunter
                {isEnabled ? (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                ) : (
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500"></span>
                )}
              </span>

              {/* Status pill */}
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${
                  isBusy
                    ? 'bg-amber-950 text-amber-300 border-amber-700 animate-pulse'
                    : isEnabled
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {isBusy ? 'Scraping Live' : isEnabled ? 'Active 24*7' : 'Paused'}
              </span>

              {toggleFeedback && (
                <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1 animate-fadeIn">
                  <CheckCircle size={12} className="text-sky-400" />
                  <span>{toggleFeedback}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 truncate">
              <Compass size={13} className="text-sky-400 shrink-0" />
              <span>Target:</span>
              <strong className="text-white font-semibold truncate">{currentCategory}</strong>
              <span className="text-slate-400 text-[11px]">({intervalMins}m cycle)</span>
            </p>
          </div>
        </div>

        {/* Right: High-Impact Action Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <button
            onClick={onManualTrigger}
            disabled={loading || isBusy}
            title="Scan Now"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={isBusy ? 'animate-spin text-amber-400' : 'text-sky-400'} />
            <span>{isBusy ? 'Scanning…' : 'Hunt Sector'}</span>
          </button>

          {/* ⏸️ The Primary PAUSE / RESUME Button */}
          <button
            onClick={handleToggleClick}
            disabled={loading || toggling}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg border ${
              isEnabled
                ? 'bg-slate-800/90 hover:bg-rose-950/70 text-slate-200 hover:text-rose-200 border-slate-700 hover:border-rose-800 shadow-slate-950/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-950/50 animate-pulse'
            }`}
          >
            {isEnabled ? (
              <>
                <Pause size={14} className="text-amber-400 fill-amber-400" />
                <span>Pause AI Hunter</span>
              </>
            ) : (
              <>
                <Play size={14} className="fill-white" />
                <span>Resume 24/7 AI Hunter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
