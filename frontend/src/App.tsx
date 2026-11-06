// src/App.tsx — Clean, Simple Light-Mode UI with 100% Automated Zero-Touch Connectivity
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, BarChart3, Activity,
  Search, Download, Wifi, WifiOff,
  Flame, Sparkles, MessageSquarePlus, ChevronLeft, ChevronRight,
  Settings, Zap, RefreshCw
} from 'lucide-react'
import {
  fetchLeads, fetchStats, fetchAnalytics,
  fetchSchedulerStatus, toggleScheduler, exportLeadsCsvUrl,
  getApiBaseUrl, autoDiscoverBackend, triggerTripleAiFleet
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
import GeminiResearchModal from './components/GeminiResearchModal'
import ProposalModal from './components/ProposalModal'
import OutreachSequenceModal from './components/OutreachSequenceModal'
import PipelineView from './components/PipelineView'
import CloudStatusModal from './components/CloudStatusModal'
import { useWebSocket } from './hooks/useWebSocket'
import { Cloud, DollarSign } from 'lucide-react'

type TabType = 'leads' | 'pipeline' | 'analytics' | 'scheduler' | 'activity'

const STATUS_FILTERS: Array<{ label: string; value: LeadStatus | '' }> = [
  { label: 'All Statuses', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Audited 🔬', value: 'audited' },
  { label: 'Pitch Sent 💬', value: 'contacted' },
  { label: 'Interested ⭐', value: 'interested' },
  { label: 'Proposal Sent 📑', value: 'proposal_sent' },
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
  const [_statsLoading, setStatsLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [showScrapeModal, setShowScrapeModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showCloudModal, setShowCloudModal] = useState(false)
  const [activeAuditLead, setActiveAuditLead] = useState<Lead | null>(null)
  const [activeProposalLead, setActiveProposalLead] = useState<Lead | null>(null)
  const [activeSequenceLead, setActiveSequenceLead] = useState<Lead | null>(null)
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
      // Auto-Discovery Fallback: try candidate hosts automatically
      try {
        await autoDiscoverBackend()
        const retryData = await fetchLeads({
          page,
          page_size: PAGE_SIZE,
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
          min_score: hotLeadsOnly ? 80 : undefined,
          sort_by: sortBy,
        })
        setLeads(retryData.items)
        setTotal(retryData.total)
        setError('')
      } catch {
        setError(`Connecting to server at ${getApiBaseUrl()}... Tap ⚙️ Settings if on a different network.`)
      }
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
    } catch {
      // Silent catch
    } finally {
      setStatsLoading(false)
      setAnalyticsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadLeadsData()
    loadOverviewData()
  }, [loadLeadsData, loadOverviewData])

  // Periodic overview refresh
  useEffect(() => {
    const timer = setInterval(() => {
      loadOverviewData()
    }, 12000)
    return () => clearInterval(timer)
  }, [loadOverviewData])

  // Live WebSocket message handler
  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'NEW_LEAD') {
      const newLead = lastMessage.lead as Lead
      setToastMessage(`🔥 New Lead: ${newLead.business_name} (${newLead.lead_score}/100)`)
      setTimeout(() => setToastMessage(null), 4500)
      loadLeadsData()
      loadOverviewData()
    } else if (lastMessage.type === 'AGENT_COMPLETED' || lastMessage.type === 'SCRAPE_COMPLETED') {
      setToastMessage(`✅ ${lastMessage.agent_name || 'AI Hunter'}: +${lastMessage.leads_saved || 0} Leads Added!`)
      setTimeout(() => setToastMessage(null), 4500)
      loadLeadsData()
      loadOverviewData()
    } else if (lastMessage.type === 'AGENT_STARTED' || lastMessage.type === 'SCRAPE_STARTED') {
      setToastMessage(`🤖 ${lastMessage.agent_name || 'AI'}: Searching ${lastMessage.query}...`)
      setTimeout(() => setToastMessage(null), 3500)
      loadOverviewData()
    } else if (lastMessage.type === 'SCHEDULER_TOGGLED') {
      loadOverviewData()
    }
  }, [lastMessage, loadLeadsData, loadOverviewData])

  const handleUpdateLead = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    loadOverviewData()
  }

  const handleDeleteLead = (id: number) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    setTotal((prev) => Math.max(0, prev - 1))
    loadOverviewData()
  }

  const handleToggleScheduler = async () => {
    const res = await toggleScheduler()
    setSchedulerStatus((prev) =>
      prev ? { ...prev, is_enabled: res.is_enabled } : null
    )
    setToastMessage(res.message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleTripleFleetDeploy = async () => {
    try {
      const res = await triggerTripleAiFleet(36)
      setToastMessage(res.message)
      setTimeout(() => setToastMessage(null), 4000)
      loadOverviewData()
    } catch {
      setShowScrapeModal(true)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-24 md:pb-12">
      {/* ── TOP HEADER (Clean White Light Theme) ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand Profile */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm font-black text-sm">
              SA
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  Shri Apps and Web
                </h1>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                  Gurugram B2B
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Autonomous 24/7 AI Lead Generation & WhatsApp Outreach
              </p>
            </div>
          </div>

          {/* Top Actions & Network Status */}
          <div className="flex items-center gap-2">
            {/* Cloud 24/7 Deployment Hub */}
            <button
              onClick={() => setShowCloudModal(true)}
              className="bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-sky-200 transition-all flex items-center gap-1.5 active:scale-95"
              title="Cloud 24/7 Status & Zero-RAM Discovery"
            >
              <Cloud size={13} className="text-sky-600" />
              <span className="hidden sm:inline">Cloud 24/7</span>
            </button>

            {/* Deploy 3x AI Button */}
            <button
              onClick={handleTripleFleetDeploy}
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              title="Launch all 3 AI Hunters simultaneously"
            >
              <Zap size={13} className="text-amber-300 fill-amber-300" />
              <span className="hidden sm:inline">Deploy 3x AI</span>
              <span className="sm:hidden">3x AI</span>
            </button>

            {/* Manual Scrape Modal */}
            <button
              onClick={() => setShowScrapeModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <MessageSquarePlus size={13} />
              <span className="hidden md:inline">Custom Scrape</span>
            </button>

            {/* Live Connection Pill */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isConnected ? 'Live WebSocket Connected' : 'Connecting to live push...'}
            >
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden sm:inline">{isConnected ? 'Live' : 'Syncing'}</span>
            </div>

            {/* Settings (⚙️) */}
            <button
              onClick={() => setShowSettingsModal(true)}
              title="App & AI Settings"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 rounded-xl border border-slate-200 transition-colors"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── TOAST NOTIFICATIONS ── */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 animate-bounce">
          <div className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-lg border border-indigo-500 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-300" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-6xl mx-auto w-full px-4 pt-4 flex-1">
        {/* Connection Error / Fallback Alert */}
        {error && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-white text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-300 shrink-0"
            >
              Settings ⚙️
            </button>
          </div>
        )}

        {/* 24/7 AI Hunter Banner with Instant Controls */}
        <LiveHunterBanner
          scheduler={schedulerStatus}
          loading={loading}
          onToggle={handleToggleScheduler}
          onManualTrigger={() => setShowScrapeModal(true)}
          onTripleFleetTrigger={handleTripleFleetDeploy}
        />

        {/* Stats Summary Bar */}
        <StatsBar
          stats={stats}
          loading={loading}
          onFilterHotLeads={() => {
            setHotLeadsOnly(!hotLeadsOnly)
            setPage(1)
          }}
        />

        {/* ── TAB NAVIGATION (Desktop & Tablet) ── */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2 flex-wrap gap-2">
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setCurrentTab('leads')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'leads'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users size={14} />
              <span>Leads Feed</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                currentTab === 'leads' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {total}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('pipeline')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'pipeline'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <DollarSign size={14} />
              <span>Deals Pipeline</span>
            </button>

            <button
              onClick={() => setCurrentTab('scheduler')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'scheduler'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Zap size={14} className={currentTab === 'scheduler' ? 'fill-amber-300 text-amber-300' : 'text-amber-500'} />
              <span>3x AI Fleet</span>
            </button>

            <button
              onClick={() => setCurrentTab('analytics')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 size={14} />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setCurrentTab('activity')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'activity'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity size={14} />
              <span>Audit Log</span>
            </button>
          </nav>

          {/* CSV Export Button */}
          {currentTab === 'leads' && (
            <a
              href={exportLeadsCsvUrl({
                status: statusFilter,
                search: debouncedSearch,
                min_score: hotLeadsOnly ? 80 : undefined,
              })}
              download
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </a>
          )}
        </div>

        {/* ── TAB 1: LEADS FEED ── */}
        {currentTab === 'leads' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search Gurugram businesses, sectors, categories..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Hot Leads Only Toggle */}
                <button
                  onClick={() => {
                    setHotLeadsOnly(!hotLeadsOnly)
                    setPage(1)
                  }}
                  className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                    hotLeadsOnly
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Flame size={13} className={hotLeadsOnly ? 'fill-amber-600 text-amber-600' : 'text-slate-400'} />
                  <span>🔥 Hot Leads (80%+)</span>
                </button>

                {/* Sort Order */}
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any)
                    setPage(1)
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="score_desc">Highest AI Score</option>
                  <option value="score_asc">Lowest AI Score</option>
                  <option value="newest">Newest Scraped</option>
                  <option value="oldest">Oldest Scraped</option>
                </select>
              </div>

              {/* Status Horizontal Pill Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setStatusFilter(f.value)
                      setPage(1)
                    }}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all shrink-0 border ${
                      statusFilter === f.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leads List Grid */}
            {loading && leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <RefreshCw size={24} className="animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Loading Gurugram business leads…</span>
              </div>
            ) : leads.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Users size={22} />
                </div>
                <h4 className="font-bold text-sm text-slate-800">No leads match your filter</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Deploy the 3x AI Hunters to scrape fresh qualified businesses across Gurugram.
                </p>
                <button
                  onClick={handleTripleFleetDeploy}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition-all"
                >
                  Deploy 3x AI Fleet Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onUpdate={handleUpdateLead}
                    onDelete={handleDeleteLead}
                    onOpenAudit={(l) => setActiveAuditLead(l)}
                    onOpenProposal={(l) => setActiveProposalLead(l)}
                    onOpenSequence={(l) => setActiveSequenceLead(l)}
                  />
                ))}
              </div>
            )}

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600 shadow-xs">
                <span>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} leads)
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: DEALS CRM PIPELINE ── */}
        {currentTab === 'pipeline' && (
          <PipelineView
            onOpenAudit={(l) => setActiveAuditLead(l)}
            onOpenProposal={(l) => setActiveProposalLead(l)}
            onOpenSequence={(l) => setActiveSequenceLead(l)}
          />
        )}

        {/* ── TAB 2: 3x AI FLEET / 24x7 ENGINE ── */}
        {currentTab === 'scheduler' && <SchedulerView />}

        {/* ── TAB 3: REAL-TIME ANALYTICS ── */}
        {currentTab === 'analytics' && (
          <AnalyticsView analytics={analytics} loading={analyticsLoading} />
        )}

        {/* ── TAB 4: AUDIT STREAM ── */}
        {currentTab === 'activity' && <ActivityView />}
      </main>

      {/* ── STICKY MOBILE BOTTOM BAR (Clean Light Theme) ── */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around z-40 md:hidden shadow-lg">
        <button
          onClick={() => setCurrentTab('leads')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            currentTab === 'leads' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Users size={17} />
          <span>Leads</span>
        </button>

        <button
          onClick={() => setCurrentTab('pipeline')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            currentTab === 'pipeline' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <DollarSign size={17} />
          <span>Pipeline</span>
        </button>

        <button
          onClick={() => setCurrentTab('scheduler')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            currentTab === 'scheduler' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Zap size={17} className={currentTab === 'scheduler' ? 'fill-amber-400 text-amber-500' : ''} />
          <span>3x AI</span>
        </button>

        <button
          onClick={() => setCurrentTab('analytics')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            currentTab === 'analytics' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <BarChart3 size={17} />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setShowCloudModal(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-sky-600"
        >
          <Cloud size={17} />
          <span>Cloud 24/7</span>
        </button>
      </nav>

      {/* ── MODALS ── */}
      {showScrapeModal && (
        <ScrapeModal
          onClose={() => setShowScrapeModal(false)}
          onStarted={() => {
            loadLeadsData()
            loadOverviewData()
          }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSaved={() => {
            loadLeadsData()
            loadOverviewData()
          }}
        />
      )}

      {/* ── GEMINI PRO DEEP AUDIT MODAL ── */}
      {activeAuditLead && (
        <GeminiResearchModal
          lead={activeAuditLead}
          isOpen={Boolean(activeAuditLead)}
          onClose={() => setActiveAuditLead(null)}
          onLeadUpdated={(updated) => {
            handleUpdateLead(updated)
            setActiveAuditLead(updated)
          }}
        />
      )}

      {/* ── B2B PROPOSAL MODAL ── */}
      {activeProposalLead && (
        <ProposalModal
          lead={activeProposalLead}
          isOpen={Boolean(activeProposalLead)}
          onClose={() => setActiveProposalLead(null)}
          onLeadUpdated={(updated) => {
            handleUpdateLead(updated)
            setActiveProposalLead(updated)
          }}
        />
      )}

      {/* ── 3-TOUCH WHATSAPP SEQUENCE MODAL ── */}
      {activeSequenceLead && (
        <OutreachSequenceModal
          lead={activeSequenceLead}
          isOpen={Boolean(activeSequenceLead)}
          onClose={() => setActiveSequenceLead(null)}
        />
      )}

      {/* ── 24/7 CLOUD HOSTING & DISCOVERY MODAL ── */}
      <CloudStatusModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        onDiscoverySuccess={() => {
          loadLeadsData()
          fetchStats().then(setStats).catch(() => {})
        }}
      />
    </div>
  )
}
