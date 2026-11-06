// src/api/client.ts — Zero-Friction Auto-Connecting Client with 3x AI Hunter & AI Config APIs.
import axios from 'axios'

const STORAGE_KEY = 'shri_apps_api_base_url'
export const CURRENT_LAN_IP = '10.83.139.190'

// Dynamic host detection + localStorage override for connecting from any network
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_KEY)
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '')
    }

    // If loaded directly from FastAPI unified port (e.g. :8000 or custom cloud domain)
    if (window.location.port === '8000' || window.location.protocol === 'https:') {
      return window.location.origin
    }
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '')
  }

  // Detect Capacitor native app or mobile environment
  const isCapacitor =
    typeof window !== 'undefined' &&
    Boolean((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor)
  const hostname = (typeof window !== 'undefined' && window.location.hostname) || ''

  // Inside mobile APK or when hostname is localhost, use the PC's Wi-Fi IP
  if (isCapacitor || hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${CURRENT_LAN_IP}:8000`
  }

  return `http://${hostname || CURRENT_LAN_IP}:8000`
}

export const setApiBaseUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    // Update Axios baseURL dynamically
    apiClient.defaults.baseURL = getApiBaseUrl()
  }
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Keep baseURL in sync before requests
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl()
  return config
})

// ── AUTOMATIC ZERO-TOUCH DISCOVERY ──────────────────────────────────
export const autoDiscoverBackend = async (): Promise<string> => {
  if (typeof window === 'undefined') return getApiBaseUrl()

  const current = getApiBaseUrl()
  const candidates = [
    current,
    window.location.origin,
    `http://${window.location.hostname}:8000`,
    `http://${CURRENT_LAN_IP}:8000`,
    'http://localhost:8000',
    'http://127.0.0.1:8000',
  ]
  const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)))

  for (const url of uniqueCandidates) {
    try {
      const clean = url.replace(/\/+$/, '')
      const res = await axios.get(`${clean}/api/health`, { timeout: 1800 })
      if (res.status === 200) {
        setApiBaseUrl(clean)
        return clean
      }
    } catch {
      continue
    }
  }

  return current
}

export type LeadStatus = 'new' | 'contacted' | 'interested' | 'closed' | 'rejected'

export interface Lead {
  id: number
  business_name: string
  category: string | null
  address: string | null
  phone: string | null
  website: string | null
  email: string | null
  rating: string | null
  reviews_count: string | null
  lead_score: number
  problems_identified: string | null
  sales_pitch: string | null
  source_query: string | null
  status: LeadStatus
  created_at: string
  updated_at: string
  notes: string | null
}

export interface LeadListResponse {
  total: number
  page: number
  page_size: number
  items: Lead[]
}

export interface Stats {
  total: number
  new: number
  contacted: number
  interested: number
  closed: number
  rejected: number
  today_new: number
  hot_leads_count: number
  average_score: number
}

export interface ScrapeJob {
  id: number
  query: string
  agent_name?: string
  status: 'running' | 'completed' | 'failed'
  leads_found: number
  leads_saved: number
  started_at: string
  completed_at: string | null
  error_message: string | null
}

export interface ActivityLog {
  id: number
  event_type: string
  title: string
  description: string | null
  created_at: string
}

export interface AgentStatus {
  id: number
  name: string
  specialty: string
  badge: string
  description: string
  is_active: boolean
  is_running: boolean
  current_target: string
  leads_found: number
}

export interface SchedulerStatus {
  is_enabled: boolean
  interval_minutes: number
  agents: AgentStatus[]
  total_jobs_run: number
  leads_found_today: number
}

export interface AnalyticsData {
  total_leads: number
  hot_leads: number
  average_score: number
  categories: Array<{ category: string; count: number }>
  statuses: Array<{ status: string; count: number }>
  daily_trend: Array<{ date: string; count: number }>
}

export interface ScrapeRequest {
  query?: string
  max_results: number
  agent_id?: number
  run_all_agents?: boolean
}

export interface AiStatus {
  connected: boolean
  model: string
  provider: string
  has_api_key: boolean
}

// ── API FUNCTIONS ───────────────────────────────────────────────────

export const fetchLeads = (params: {
  page?: number
  page_size?: number
  status?: LeadStatus | ''
  search?: string
  min_score?: number
  sort_by?: 'score_desc' | 'score_asc' | 'newest' | 'oldest'
}) =>
  apiClient
    .get<LeadListResponse>('/api/leads', { params })
    .then((r) => r.data)

export const fetchLeadById = (id: number) =>
  apiClient.get<Lead>(`/api/leads/${id}`).then((r) => r.data)

export const fetchStats = () =>
  apiClient.get<Stats>('/api/stats').then((r) => r.data)

export const fetchAnalytics = () =>
  apiClient.get<AnalyticsData>('/api/analytics').then((r) => r.data)

export const updateLead = (
  id: number,
  data: Partial<Pick<Lead, 'status' | 'notes' | 'phone' | 'email' | 'sales_pitch' | 'lead_score'>>
) =>
  apiClient.patch<Lead>(`/api/leads/${id}`, data).then((r) => r.data)

export const deleteLead = (id: number) =>
  apiClient.delete(`/api/leads/${id}`)

export const triggerScrape = (payload: ScrapeRequest) =>
  apiClient
    .post<{ job_id: number; query: string; message: string; agent_name?: string }>(
      '/api/scrape/trigger',
      payload
    )
    .then((r) => r.data)

export const triggerTripleAiFleet = (maxResults = 36) =>
  apiClient
    .post<{ job_id: number; query: string; message: string; agent_name?: string }>(
      '/api/scrape/trigger',
      { run_all_agents: true, max_results: maxResults }
    )
    .then((r) => r.data)

export const fetchAgents = () =>
  apiClient.get<AgentStatus[]>('/api/agents').then((r) => r.data)

export const fetchScrapeJobs = (limit = 15) =>
  apiClient.get<ScrapeJob[]>('/api/scrape/jobs', { params: { limit } }).then((r) => r.data)

export const fetchActivityLogs = (limit = 25) =>
  apiClient.get<ActivityLog[]>('/api/activity', { params: { limit } }).then((r) => r.data)

export const fetchSchedulerStatus = () =>
  apiClient.get<SchedulerStatus>('/api/scheduler/status').then((r) => r.data)

export const toggleScheduler = () =>
  apiClient.post<{ is_enabled: boolean; message: string }>('/api/scheduler/toggle').then((r) => r.data)

export const updateSchedulerConfig = (config: { interval_minutes?: number; custom_queries?: string }) =>
  apiClient.post('/api/scheduler/config', config).then((r) => r.data)

// ── AI CONFIG & BRAIN APIS ──
export const fetchAiStatus = () =>
  apiClient.get<AiStatus>('/api/ai/status').then((r) => r.data)

export const updateAiConfig = (payload: { api_key: string; model?: string }) =>
  apiClient
    .post<{ status: string; message: string; model: string }>('/api/ai/config', payload)
    .then((r) => r.data)

export const testAiConnection = () =>
  apiClient
    .post<{ success: boolean; message: string; model?: string; mode: string }>('/api/ai/test')
    .then((r) => r.data)

export const exportLeadsCsvUrl = (params?: { status?: string; search?: string; min_score?: number }) => {
  const base = getApiBaseUrl()
  const query = new URLSearchParams()
  if (params?.status) query.append('status', params.status)
  if (params?.search) query.append('search', params.search)
  if (params?.min_score) query.append('min_score', String(params.min_score))
  return `${base}/api/leads/export/csv?${query.toString()}`
}

export const testConnection = async (
  targetUrl?: string
): Promise<{ success: boolean; latency: number; error?: string }> => {
  const url = targetUrl && targetUrl.trim() ? targetUrl.trim().replace(/\/+$/, '') : getApiBaseUrl()
  const start = Date.now()
  try {
    const res = await axios.get(`${url}/api/health`, { timeout: 5000 })
    if (res.status === 200) {
      return { success: true, latency: Date.now() - start }
    }
    return { success: false, latency: Date.now() - start, error: `HTTP ${res.status}` }
  } catch (err: any) {
    return { success: false, latency: Date.now() - start, error: err?.message || 'Connection failed' }
  }
}
