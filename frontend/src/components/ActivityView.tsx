// src/components/ActivityView.tsx — Simple, Clean Light-Mode Real-Time Activity Audit
import { useState, useEffect } from 'react'
import {
  Activity, CheckCircle2, Bot, ArrowRight,
  Flame, RefreshCw
} from 'lucide-react'
import type { ActivityLog } from '../api/client'
import { fetchActivityLogs } from '../api/client'

export default function ActivityView() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = async () => {
    try {
      const data = await fetchActivityLogs(35)
      setLogs(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
    const timer = setInterval(loadLogs, 10000)
    return () => clearInterval(timer)
  }, [])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'scrape_started':
        return <Bot size={14} className="text-sky-600" />
      case 'scrape_completed':
        return <CheckCircle2 size={14} className="text-emerald-600" />
      case 'status_changed':
        return <ArrowRight size={14} className="text-amber-600" />
      case 'lead_created':
        return <Flame size={14} className="text-rose-500 fill-rose-500" />
      default:
        return <Activity size={14} className="text-indigo-600" />
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs animate-fadeIn">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" />
            <span>24/7 Real-Time Activity Log</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit stream of autonomous crawls, 3x AI scorings, and CRM interactions
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors border border-slate-200"
          title="Refresh logs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">No activity recorded yet.</p>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all text-xs"
            >
              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                {getEventIcon(log.event_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">{log.title}</span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {log.description && (
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed font-sans">
                    {log.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
