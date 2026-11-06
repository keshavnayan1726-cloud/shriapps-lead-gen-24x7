// src/components/SchedulerView.tsx — Simple, Clean Light-Mode 3x AI Hunter Hub
import { useState, useEffect } from 'react'
import {
  Clock, Play, Pause, Zap, RefreshCw, Send,
  History, Sparkles
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
  const [launchingAgentId, setLaunchingAgentId] = useState<number | null>(null)
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
    setNotice(`Scraper interval updated to ${mins} mins.`)
    await loadData()
    setTimeout(() => setNotice(''), 3000)
  }

  async function handleLaunchSingleAgent(agentId: number) {
    setLaunchingAgentId(agentId)
    try {
      const res = await triggerScrape({ agent_id: agentId, max_results: 15 })
      setNotice(res.message)
      await loadData()
      setTimeout(() => setNotice(''), 3500)
    } finally {
      setLaunchingAgentId(null)
    }
  }

  async function handleLaunchAllAgents() {
    setTriggering(true)
    try {
      const res = await triggerScrape({ run_all_agents: true, max_results: 36 })
      setNotice(res.message)
      await loadData()
      setTimeout(() => setNotice(''), 3500)
    } finally {
      setTriggering(false)
    }
  }

  async function handleCustomDispatch() {
    if (!customQuery.trim()) return
    setTriggering(true)
    try {
      await triggerScrape({ query: customQuery.trim(), max_results: 15 })
      setNotice(`Scraper dispatched for "${customQuery.trim()}"!`)
      setCustomQuery('')
      await loadData()
      setTimeout(() => setNotice(''), 3500)
    } finally {
      setTriggering(false)
    }
  }

  const isEnabled = status?.is_enabled ?? true
  const agents = status?.agents || []

  return (
    <div className="space-y-5 animate-fadeIn">
      {notice && (
        <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* 1. THREE SIMULTANEOUS AI HUNTERS (PARALLEL FLEET) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Zap size={18} className="text-indigo-600 fill-indigo-600" />
              <span>3 Simultaneous AI Lead Hunters</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Three autonomous workers crawling Gurugram in parallel for 3x lead acquisition
            </p>
          </div>

          <button
            onClick={handleLaunchAllAgents}
            disabled={triggering}
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            {triggering ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} className="fill-amber-300 text-amber-300" />}
            <span>Deploy All 3 Simultaneously</span>
          </button>
        </div>

        {/* The 3 Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {agents.map((ag) => (
            <div
              key={ag.id}
              className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                ag.is_running
                  ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">
                    {ag.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      ag.is_running
                        ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {ag.is_running ? 'Crawling Maps...' : 'Standing By'}
                  </span>
                </div>

                <div className="text-[11px] font-semibold text-indigo-700 mb-1">
                  {ag.badge}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {ag.description}
                </p>

                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 mb-3 text-[11px]">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                    Target Sector
                  </span>
                  <span className="text-slate-800 font-medium truncate block">
                    {ag.current_target}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-slate-500 text-[11px]">
                  Found: <strong>{ag.leads_found}</strong>
                </span>

                <button
                  onClick={() => handleLaunchSingleAgent(ag.id)}
                  disabled={ag.is_running || launchingAgentId === ag.id}
                  className="bg-white hover:bg-slate-100 active:scale-95 text-indigo-600 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 text-xs transition-all flex items-center gap-1"
                >
                  {launchingAgentId === ag.id ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : (
                    <Play size={11} className="fill-indigo-600" />
                  )}
                  <span>Launch</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 24/7 AUTOMATION & INTERVAL SETTINGS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Clock size={17} className="text-indigo-600" />
              <span>24/7 Automation Schedule</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The scheduler continuously runs all 3 AI agents in the background
            </p>
          </div>

          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              isEnabled
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {toggling ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : isEnabled ? (
              <Pause size={12} />
            ) : (
              <Play size={12} className="fill-white" />
            )}
            <span>{isEnabled ? 'Pause 24/7 Engine' : 'Resume 24/7 Engine'}</span>
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-700 block">
            Scraping Frequency
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleIntervalChange(opt.value)}
                className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                  status?.interval_minutes === opt.value
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. CUSTOM SECTOR DISPATCHER */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
          <Send size={16} className="text-indigo-600" />
          <span>Manual Sector Dispatch</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Send an immediate crawl request for a specific Gurugram niche or location
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="e.g. bakeries in Galleria Market Gurugram"
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleCustomDispatch}
            disabled={triggering || !customQuery.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
          >
            {triggering ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            <span>Dispatch</span>
          </button>
        </div>
      </div>

      {/* 4. SCRAPE JOBS AUDIT TRAIL */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
          <History size={16} className="text-indigo-600" />
          <span>Autonomous Scrape Audit Trail</span>
        </h3>

        {jobs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No scrape jobs recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((jb) => (
              <div
                key={jb.id}
                className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{jb.query}</span>
                    {jb.agent_name && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                        {jb.agent_name}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Started: {new Date(jb.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-bold text-emerald-700 block text-xs">
                      +{jb.leads_saved} Leads
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {jb.leads_found} found
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      jb.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : jb.status === 'running'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {jb.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
