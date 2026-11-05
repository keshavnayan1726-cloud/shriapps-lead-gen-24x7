// src/components/ScrapeModal.tsx
import { useState } from 'react'
import { X, Search, Loader2, Sparkles } from 'lucide-react'
import { triggerScrape } from '../api/client'

interface Props {
  onClose: () => void
  onStarted: () => void
}

const QUICK_QUERIES = [
  'cafes and restaurants Gurugram',
  'luxury salons and spas Gurugram',
  'gyms and fitness studios Gurugram',
  'dental clinics and implants Gurugram',
  'boutique hotels and banquet halls Gurugram',
  'car detailing and auto workshops Gurugram',
  'real estate consultants and brokers Gurugram',
  'interior designers and architects Gurugram',
  'pet clinics and grooming Gurugram',
  'skin clinics and dermatologists Gurugram',
]

export default function ScrapeModal({ onClose, onStarted }: Props) {
  const [query, setQuery] = useState('cafes and restaurants Gurugram')
  const [maxResults, setMaxResults] = useState(15)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      await triggerScrape({ query: query.trim(), max_results: maxResults })
      onStarted()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to initiate scraper.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
              <Sparkles size={15} />
            </div>
            <h2 className="font-bold text-base text-white">Manual AI Hunt Trigger</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Crawl any Gurugram commercial sector on-demand. Leads are enriched with Gemini AI pitches for 'Shri Apps and Web'.
        </p>

        <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Search Target / Location</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. cafes in DLF Cyber Hub Gurugram"
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 mb-3"
        />

        {/* Quick Pick Presets */}
        <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Gurugram High-Value Sectors:</label>
        <div className="flex flex-wrap gap-1.5 mb-4 max-h-36 overflow-y-auto pr-1">
          {QUICK_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className={`text-[11px] rounded-lg px-2.5 py-1 border transition-all text-left truncate max-w-full ${
                query === q
                  ? 'bg-sky-600 border-sky-500 text-white font-semibold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Max Results */}
        <div className="mb-4 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-400">Prospects to Extract:</span>
            <span className="font-bold text-sky-400">{maxResults} businesses</span>
          </div>
          <input
            type="range"
            min={5}
            max={35}
            step={5}
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            className="w-full accent-sky-500"
          />
        </div>

        {error && <p className="text-rose-400 text-xs mb-3 bg-rose-950/40 p-2 rounded-lg border border-rose-800">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !query.trim()}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl py-3 shadow-lg shadow-sky-950/40 transition-all"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          <span>{loading ? 'Initiating Crawler…' : 'Start AI Lead Extraction'}</span>
        </button>
      </div>
    </div>
  )
}
