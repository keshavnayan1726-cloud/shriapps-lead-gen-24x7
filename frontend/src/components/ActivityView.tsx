// src/components/ActivityView.tsx
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
        return <Bot size={14} className="text-sky-400" />
      case 'scrape_completed':
        return <CheckCircle2 size={14} className="text-emerald-400" />
      case 'status_changed':
        return <ArrowRight size={14} className="text-amber-400" />
      case 'lead_created':
        return <Flame size={14} className="text-rose-400 fill-rose-400" />
      default:
        return <Activity size={14} className="text-violet-400" />
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" />
            <span>24/7 Real-Time Activity Log</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit stream of autonomous crawls, AI scorings, and CRM interactions.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh Feed"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-slate-500 py-8 text-center">No activity recorded yet.</p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {logs.map((log) => (
            <div key={log.id} className="relative group">
              {/* Dot icon */}
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-950 border border-slate-750 flex items-center justify-center shrink-0">
                {getEventIcon(log.event_type)}
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-200">{log.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {log.description && (
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
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
