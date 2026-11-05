// src/App.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, BarChart3, Bot, Activity,
  Search, Filter, Download, Wifi, WifiOff,
  Flame, Loader2, Sparkles, MessageSquarePlus, ChevronLeft, ChevronRight,
  Settings
} from 'lucide-react'
import {
  fetchLeads, fetchStats, fetchAnalytics,
  fetchSchedulerStatus, toggleScheduler, exportLeadsCsvUrl,
  getApiBaseUrl
} from './api/client'
import type { Lead, LeadStatus, Stats, AnalyticsData, SchedulerStatus } from './api/client'
import LeadCard from './components/LeadCard'
import StatsBar from './components/StatsBar'
import LiveHunterBanner from './components/LiveHunterBanner'
import AnalyticsView from './components/AnalyticsView'
import SchedulerView from './components/SchedulerView'
import ActivityView from './components/ActivityView'
import ScrapeModal from './components/ScrapeModal'
import SettingsModal from './components/SettingsModal'
import { useWebSocket } from './hooks/useWebSocket'

type TabType = 'leads' | 'analytics' | 'scheduler' | 'activity'

const STATUS_FILTERS: Array<{ label: string; value: LeadStatus | '' }> = [
  { label: 'All Statuses', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Interested ⭐', value: 'interested' },
  { label: 'Closed Won 🏆', value: 'closed' },
  { label: 'Archived', value: 'rejected' },
]

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('leads')

  // Leads Feed state
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')
  const [hotLeadsOnly, setHotLeadsOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'newest' | 'oldest'>('score_desc')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Analytics & Stats state
  const [stats, setStats] = useState<Stats | undefined>()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [showScrapeModal, setShowScrapeModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [error, setError] = useState('')

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const { isConnected, lastMessage } = useWebSocket()

  // Debounce search query
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
  }, [search])

  const loadLeadsData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchLeads({
        page,
        page_size: PAGE_SIZE,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        min_score: hotLeadsOnly ? 80 : undefined,
        sort_by: sortBy,
      })
      setLeads(data.items)
      setTotal(data.total)
    } catch {
      setError(`Cannot connect to ${getApiBaseUrl()}. Check server or tap ⚙️ Settings.`)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, debouncedSearch, hotLeadsOnly, sortBy])

  const loadOverviewData = useCallback(async () => {
    setStatsLoading(true)
    setAnalyticsLoading(true)
    try {
      const [st, an, sc] = await Promise.all([
        fetchStats(),
        fetchAnalytics(),
        fetchSchedulerStatus(),
      ])
      setStats(st)
      setAnalytics(an)
      setSchedulerStatus(sc)
    } catch (e) {
      console.warn('Overview fetch error:', e)
    } finally {
      setStatsLoading(false)
      setAnalyticsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeadsData()
  }, [loadLeadsData])

  useEffect(() => {
    loadOverviewData()
  }, [loadOverviewData])

  // Handle incoming real-time WebSocket notifications
  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'SCRAPE_COMPLETED') {
      const data = lastMessage.data
      setToastMessage(`⚡ 24/7 AI found +${data.leads_saved} new leads for "${data.query}"!`)
      loadLeadsData()
      loadOverviewData()
      setTimeout(() => setToastMessage(null), 5000)
    } else if (lastMessage.type === 'SCRAPE_STARTED') {
      setToastMessage(`🤖 24/7 AI started scanning "${lastMessage.data.query}"…`)
      loadOverviewData()
      setTimeout(() => setToastMessage(null), 4000)
    } else if (lastMessage.type === 'SCHEDULER_STATUS') {
      loadOverviewData()
    }
  }, [lastMessage, loadLeadsData, loadOverviewData])

  async function handleToggleScheduler() {
    await toggleScheduler()
    await loadOverviewData()
  }

  function handleLeadUpdated(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    loadOverviewData()
  }

  function handleLeadDeleted(id: number) {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    setTotal((t) => t - 1)
    loadOverviewData()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const isBusy = (schedulerStatus?.active_jobs_count ?? 0) > 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 select-none sm:select-auto">
      {/* ── Real-Time Notification Toast ── */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-2 border border-sky-400/40 animate-bounce">
          <div className="flex items-center gap-2 truncate">
            <Sparkles size={16} className="text-amber-300 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-sky-200 hover:text-white shrink-0 text-sm font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ── Fixed Top Header ── */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <h1 className="font-black text-base sm:text-lg tracking-tight text-white truncate">
                Shri Apps and Web
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-sky-950 border border-sky-800 text-sky-300 px-2 py-0.5 rounded-md hidden xs:inline">
                Gurugram 24/7
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Autonomous B2B Lead Generator & Outreach Pipeline
            </p>
          </div>

          {/* Real-time Status Badges & Quick Actions */}
          <div className="flex items-center gap-2">
            {/* WS Status */}
            <span
              title={isConnected ? 'Live WebSocket Connected' : 'Connecting to Server…'}
              className="flex items-center gap-1 text-xs"
            >
              {isConnected ? (
                <Wifi size={17} className="text-emerald-400" />
              ) : (
                <WifiOff size={17} className="text-rose-400" />
              )}
            </span>

            {/* Scraping spinner */}
            {isBusy && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-xl border border-amber-800/80 animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                <span className="hidden sm:inline">Hunting…</span>
              </span>
            )}

            {/* Export CSV Button */}
            <a
              href={exportLeadsCsvUrl({
                status: statusFilter || undefined,
                search: debouncedSearch || undefined,
                min_score: hotLeadsOnly ? 80 : undefined,
              })}
              download
              title="Download Leads CSV"
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold px-2.5 py-2 rounded-xl border border-slate-700 transition-colors"
            >
              <Download size={14} className="text-emerald-400" />
              <span className="hidden sm:inline">Export</span>
            </a>

            {/* Settings Button (⚙️) */}
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Network & Server Settings"
              className="p-2 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
            >
              <Settings size={15} />
            </button>

            {/* Manual Trigger Button */}
            <button
              onClick={() => setShowScrapeModal(true)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md shadow-sky-950/30 transition-all"
            >
              <MessageSquarePlus size={14} />
              <span className="hidden xs:inline">Hunt Sector</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Workspace Body ── */}
      <main className="max-w-4xl mx-auto px-4 py-4 flex-1 w-full">
        {/* Live 24/7 Autonomous Hunter Status Banner with Prominent Pause Button */}
        <LiveHunterBanner
          scheduler={schedulerStatus}
          loading={statsLoading}
          onToggle={handleToggleScheduler}
          onManualTrigger={() => setShowScrapeModal(true)}
        />

        {/* Global Stats Grid Bar */}
        <StatsBar
          stats={stats}
          loading={statsLoading}
          onFilterHotLeads={() => {
            setCurrentTab('leads')
            setHotLeadsOnly((prev) => !prev)
            setPage(1)
          }}
        />

        {/* Error Alert Banner */}
        {error && (
          <div className="bg-rose-950/70 border border-rose-800 rounded-2xl p-3.5 text-xs text-rose-300 mb-4 flex items-center justify-between shadow-lg">
            <span>{error}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="bg-rose-900/60 hover:bg-rose-800 text-white font-bold px-2.5 py-1 rounded-lg text-xs"
              >
                Change URL
              </button>
              <button onClick={loadLeadsData} className="underline font-bold text-rose-200">
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT ── */}
        {currentTab === 'leads' && (
          <div className="space-y-3">
            {/* Search, Filter & Sorting Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3.5 shadow-sm space-y-3">
              <div className="flex gap-2">
                {/* Search input */}
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search Gurugram businesses, categories, phone…"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status dropdown */}
                <div className="relative shrink-0">
                  <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as LeadStatus | '')
                      setPage(1)
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-2xl pl-7 pr-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    {STATUS_FILTERS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles & Sort */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1.5 border-t border-slate-800">
                {/* Hot Leads Only Pill */}
                <button
                  onClick={() => {
                    setHotLeadsOnly((prev) => !prev)
                    setPage(1)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                    hotLeadsOnly
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Flame size={13} className={hotLeadsOnly ? 'fill-slate-950' : 'text-amber-400'} />
                  <span>🔥 Hot Leads Only (80%+)</span>
                </button>

                {/* Sort dropdown */}
                <div className="flex items-center gap-1.5 ml-auto text-slate-400">
                  <span className="text-[11px]">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as any)
                      setPage(1)
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="score_desc">Highest AI Score</option>
                    <option value="score_asc">Lowest AI Score</option>
                    <option value="newest">Newest Scraped</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Leads List Feed */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
                <Loader2 size={32} className="animate-spin text-sky-500" />
                <span className="text-xs">Loading prospects pipeline…</span>
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
                  📭
                </div>
                <h3 className="font-bold text-base text-white">No prospects found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {search || statusFilter || hotLeadsOnly
                    ? 'No leads match your current search or filters. Try resetting filters.'
                    : 'The 24/7 engine will continuously add leads. You can also trigger a manual scan right now.'}
                </p>
                <button
                  onClick={() => setShowScrapeModal(true)}
                  className="mt-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md"
                >
                  Scan Gurugram Sectors Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onUpdate={handleLeadUpdated}
                    onDelete={handleLeadDeleted}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 mt-4 text-xs">
                <span className="text-slate-400">
                  Showing <strong className="text-white">{(page - 1) * PAGE_SIZE + 1}</strong> –{' '}
                  <strong className="text-white">{Math.min(page * PAGE_SIZE, total)}</strong> of{' '}
                  <strong className="text-white">{total}</strong> prospects
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-mono text-slate-200 px-2 font-semibold">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView analytics={analytics} loading={analyticsLoading} />
        )}

        {currentTab === 'scheduler' && <SchedulerView />}

        {currentTab === 'activity' && <ActivityView />}
      </main>

      {/* ── Mobile-First Bottom Navigation Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-3 py-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {/* Tab 1: Leads */}
          <button
            onClick={() => setCurrentTab('leads')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
              currentTab === 'leads'
                ? 'text-sky-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={18} />
            <span className="text-[10px]">Leads ({total})</span>
          </button>

          {/* Tab 2: Analytics */}
          <button
            onClick={() => setCurrentTab('analytics')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
              currentTab === 'analytics'
                ? 'text-sky-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 size={18} />
            <span className="text-[10px]">Analytics</span>
          </button>

          {/* Tab 3: 24/7 Hunter */}
          <button
            onClick={() => setCurrentTab('scheduler')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all relative ${
              currentTab === 'scheduler'
                ? 'text-sky-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot size={18} />
            <span className="text-[10px]">24/7 Engine</span>
            {schedulerStatus?.is_enabled && (
              <span className="absolute top-1.5 right-6 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Tab 4: Activity Log */}
          <button
            onClick={() => setCurrentTab('activity')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
              currentTab === 'activity'
                ? 'text-sky-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity size={18} />
            <span className="text-[10px]">Activity</span>
          </button>
        </div>
      </nav>

      {/* ── Manual Scrape Modal ── */}
      {showScrapeModal && (
        <ScrapeModal
          onClose={() => setShowScrapeModal(false)}
          onStarted={() => {
            loadLeadsData()
            loadOverviewData()
          }}
        />
      )}

      {/* ── Network & Server Settings Modal ── */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSaved={() => {
            loadLeadsData()
            loadOverviewData()
          }}
        />
      )}
    </div>
  )
}
