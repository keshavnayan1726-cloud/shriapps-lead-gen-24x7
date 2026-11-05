// src/components/SchedulerView.tsx
import { useState, useEffect } from 'react'
import {
  Clock, Play, Pause, Bot,
  Loader2, Send, History, ListOrdered
} from 'lucide-react'
import type { SchedulerStatus, ScrapeJob } from '../api/client'
import {
  fetchSchedulerStatus,
  toggleScheduler,
  updateSchedulerConfig,
  triggerScrape,
  fetchScrapeJobs,
} from '../api/client'

const INTERVAL_OPTIONS = [
  { label: 'Every 15 minutes (Fast)', value: 15 },
  { label: 'Every 30 minutes', value: 30 },
  { label: 'Every 1 hour (Recommended)', value: 60 },
  { label: 'Every 2 hours', value: 120 },
  { label: 'Every 4 hours', value: 240 },
]

export default function SchedulerView() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null)
  const [jobs, setJobs] = useState<ScrapeJob[]>([])
  const [toggling, setToggling] = useState(false)
  const [customQuery, setCustomQuery] = useState('')
  const [triggering, setTriggering] = useState(false)
  const [notice, setNotice] = useState('')

  const loadData = async () => {
    try {
      const [st, jb] = await Promise.all([fetchSchedulerStatus(), fetchScrapeJobs(15)])
      setStatus(st)
      setJobs(jb)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 8000)
    return () => clearInterval(timer)
  }, [])

  async function handleToggle() {
    setToggling(true)
    try {
      const res = await toggleScheduler()
      setNotice(res.message)
      await loadData()
      setTimeout(() => setNotice(''), 3000)
    } finally {
      setToggling(false)
    }
  }

  async function handleIntervalChange(mins: number) {
    await updateSchedulerConfig({ interval_minutes: mins })
    await loadData()
  }

  async function handleCustomTrigger() {
    if (!customQuery.trim()) return
    setTriggering(true)
    try {
      await triggerScrape({ query: customQuery.trim(), max_results: 15 })
      setNotice(`Scraper dispatched for "${customQuery.trim()}"!`)
      setCustomQuery('')
      setTimeout(() => setNotice(''), 4000)
    } finally {
      setTriggering(false)
    }
  }

  const isEnabled = status?.is_enabled ?? true
  const isBusy = (status?.active_jobs_count ?? 0) > 0

  return (
    <div className="space-y-4">
      {notice && (
        <div className="bg-sky-950/70 border border-sky-600 rounded-xl p-3 text-xs text-sky-200 flex items-center gap-2 animate-fadeIn">
          <Bot size={15} className="text-sky-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* ── 24/7 Master Control Card ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">24/7 Autonomous Lead Hunter</span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                  isEnabled
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}
              >
                {isEnabled ? 'RUNNING 24*7' : 'PAUSED'}
              </span>
              {isBusy && (
                <span className="text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full animate-pulse">
                  Scanning
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Automatically crawls commercial sectors in Gurugram, extracts business contact info,
              identifies tech problems with Gemini AI, and enriches pitches for Shri Apps and Web.
            </p>
          </div>

          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 ${
              isEnabled
                ? 'bg-rose-600/90 hover:bg-rose-500 text-white shadow-rose-950/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/30'
            }`}
          >
            {toggling ? (
              <Loader2 size={15} className="animate-spin" />
            ) : isEnabled ? (
              <>
                <Pause size={15} className="fill-white" />
                <span>Pause 24/7 Engine</span>
              </>
            ) : (
              <>
                <Play size={15} className="fill-white" />
                <span>Start 24/7 Engine</span>
              </>
            )}
          </button>
        </div>

        {/* Configuration settings bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-400 font-medium block mb-1.5 flex items-center gap-1.5">
              <Clock size={13} className="text-sky-400" />
              <span>Rotation Frequency</span>
            </label>
            <select
              value={status?.interval_minutes || 60}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-slate-400 font-medium block mb-1.5 flex items-center gap-1.5">
              <ListOrdered size={13} className="text-emerald-400" />
              <span>Current Target Category</span>
            </span>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs truncate">
              {status?.current_category || 'Commercial Gurugram'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Instant Custom Sector Scan ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-2">
          <Bot size={16} className="text-sky-400" />
          <span>Dispatch Instant AI Hunt</span>
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Want leads for a specific niche immediately? Type any query (e.g. <em>"rooftop restaurants Cyber Hub"</em>).
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomTrigger()}
            placeholder="e.g. cafes in DLF Phase 2 Gurugram"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            onClick={handleCustomTrigger}
            disabled={triggering || !customQuery.trim()}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all"
          >
            {triggering ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>Launch</span>
          </button>
        </div>
      </div>

      {/* ── Autonomous Scrape Jobs Audit Log ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-3">
          <History size={16} className="text-violet-400" />
          <span>Autonomous Scrape Audit Trail</span>
        </h3>

        {jobs.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No scrape records yet.</p>
        ) : (
          <div className="space-y-2.5">
            {jobs.map((jb) => (
              <div
                key={jb.id}
                className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-200 truncate">{jb.query}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        jb.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : jb.status === 'running'
                          ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      {jb.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                    {new Date(jb.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {new Date(jb.started_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-emerald-400 font-bold block">+{jb.leads_saved} saved</span>
                  <span className="text-[11px] text-slate-400">{jb.leads_found} scanned</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
