// src/components/ScrapeModal.tsx — Simple, Friendly Light-Mode AI Scrape Launcher
import { useState } from 'react'
import { X, Search, Loader2, Sparkles, Zap } from 'lucide-react'
import { triggerScrape } from '../api/client'

interface Props {
  onClose: () => void
  onStarted: () => void
}

const QUICK_QUERIES = [
  'cafes and restaurants in Sector 29 Gurugram',
  'fine dine and restrobars in Cyber Hub Gurugram',
  'dental clinics and implants in South City Gurugram',
  'luxury gyms and fitness in Sector 56 Gurugram',
  'dermatologists and skin clinics in Golf Course Road Gurugram',
  'real estate consultants in DLF Phase 5 Gurugram',
  'jewellery boutiques in Gold Souk Mall Gurugram',
  'bakeries and cloud kitchens in Galleria Market Gurugram',
]

export default function ScrapeModal({ onClose, onStarted }: Props) {
  const [mode, setMode] = useState<'triple' | 'single'>('triple')
  const [query, setQuery] = useState(QUICK_QUERIES[0])
  const [maxResults, setMaxResults] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      if (mode === 'triple') {
        await triggerScrape({
          run_all_agents: true,
          max_results: maxResults,
        })
      } else {
        await triggerScrape({
          query: query.trim(),
          max_results: maxResults,
        })
      }
      onStarted()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to initiate scraper. Check server connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Launch AI Lead Hunter</h2>
              <p className="text-xs text-slate-500">Autonomous Google Maps business extraction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hunter Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('triple')
              setMaxResults(36)
            }}
            className={`p-3 rounded-2xl border text-left transition-all ${
              mode === 'triple'
                ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
              <Zap size={14} className="text-amber-500 fill-amber-500" />
              <span>3x AI Fleet (Simultaneous)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Runs all 3 AI hunters in parallel (F&B + Health + Retail). 3x faster!
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('single')
              setMaxResults(20)
            }}
            className={`p-3 rounded-2xl border text-left transition-all ${
              mode === 'single'
                ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
              <Search size={14} className="text-indigo-600" />
              <span>Single Sector</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Target a specific Gurugram niche or custom keywords.
            </p>
          </button>
        </div>

        {/* Custom Sector Input if Single Mode */}
        {mode === 'single' && (
          <div className="mb-4 space-y-2">
            <label className="text-[11px] font-semibold text-slate-600 block uppercase tracking-wider">
              Target Keywords & Sector
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. cafes in Sector 29 Gurugram"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_QUERIES.slice(0, 4).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuery(q)}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors"
                >
                  {q.replace(' in Gurugram', '')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Slider */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700">Leads Target:</span>
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
              {maxResults} Qualified Businesses
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={60}
            step={5}
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>10 Leads</span>
            <span>35 Leads</span>
            <span>60 Leads</span>
          </div>
        </div>

        {error && (
          <div className="mb-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2.5 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <Zap size={14} className="text-amber-300 fill-amber-300" />
                <span>{mode === 'triple' ? 'Deploy 3x AI Fleet' : 'Start Hunt'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
