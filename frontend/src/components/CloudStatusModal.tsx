// src/components/CloudStatusModal.tsx — 24/7 Free Cloud Hosting & Gemini Pro Discovery Hub
import { useState, useEffect } from 'react'
import {
  X, Cloud, Server, ExternalLink, CheckCircle2,
  Sparkles, Search, ShieldCheck, Laptop
} from 'lucide-react'
import { fetchCloudStatus, triggerCloudDiscovery, getApiBaseUrl, setApiBaseUrl } from '../api/client'
import type { CloudStatusResponse } from '../api/client'

interface Props {
  isOpen: boolean
  onClose: () => void
  onDiscoverySuccess: () => void
}

export default function CloudStatusModal({ isOpen, onClose, onDiscoverySuccess }: Props) {
  const [cloudStatus, setCloudStatus] = useState<CloudStatusResponse | null>(null)
  const [cloudUrlInput, setCloudUrlInput] = useState('')
  const [queryInput, setQueryInput] = useState('cafes and restaurants in Sector 29 Gurugram')
  const [discovering, setDiscovering] = useState(false)
  const [discoveryMsg, setDiscoveryMsg] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCloudUrlInput(getApiBaseUrl())
      setDiscoveryMsg('')
      fetchCloudStatus().then(setCloudStatus).catch(() => {})
    }
  }, [isOpen])

  const handleSaveUrl = () => {
    setSavingUrl(true)
    setApiBaseUrl(cloudUrlInput)
    setTimeout(() => {
      setSavingUrl(false)
      window.location.reload()
    }, 400)
  }

  const handleRunDiscovery = async () => {
    if (!queryInput.trim()) return
    setDiscovering(true)
    setDiscoveryMsg('')
    try {
      const res = await triggerCloudDiscovery(queryInput.trim(), 10)
      setDiscoveryMsg(`✅ ${res.message}`)
      onDiscoverySuccess()
    } catch (err: any) {
      setDiscoveryMsg(`❌ Discovery error: ${err?.message || 'Failed'}`)
    } finally {
      setDiscovering(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-50 via-white to-blue-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-100">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">24/7 Cloud Engine & Hosting Hub</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-sky-100 text-sky-800">
                  {cloudStatus?.is_cloud ? '☁️ Cloud Deployed' : '💻 Local Machine'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Run AI Lead Hunters 24/7 even when your laptop is turned off
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border ${cloudStatus?.is_cloud ? 'bg-emerald-50/80 border-emerald-200' : 'bg-slate-50 border-slate-200'} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                {cloudStatus?.is_cloud ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Laptop className="w-4 h-4 text-slate-600" />
                )}
                Active Server Environment
              </span>
              <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {cloudStatus?.provider || 'Detecting...'}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {cloudStatus?.instructions ||
                'Deploy to Render or Railway to operate your AI Lead Engine 24/7 for 100% free with zero laptop dependence.'}
            </p>
          </div>

          {/* 1-Click Free Cloud Deployment Options */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-600" />
              1-Click 100% Free Cloud Deployment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Render Free Web Service</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">100% Free</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Automatic Docker deployment with pre-configured <code>render.yaml</code>. Runs continuously in Singapore/Frankfurt.
                </p>
                <a
                  href="https://dashboard.render.com/select-repo?type=web"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-sky-600 hover:text-sky-800 pt-1"
                >
                  Deploy to Render <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Railway App</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">Zero Setup</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Fastest 1-click Docker build with automatic HTTPS URL generation and 24/7 background worker daemons.
                </p>
                <a
                  href="https://railway.app/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-purple-600 hover:text-purple-800 pt-1"
                >
                  Deploy to Railway <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Cloud API Base URL Switcher */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <h4 className="font-bold uppercase tracking-wider text-slate-700">
              Cloud Server URL (For Phone APK & Web)
            </h4>
            <p className="text-[11px] text-slate-500">
              Paste your deployed cloud domain (e.g. <code>https://shriapps-lead-gen.onrender.com</code>) so your phone app talks directly to the 24/7 cloud server.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={cloudUrlInput}
                onChange={(e) => setCloudUrlInput(e.target.value)}
                placeholder="https://your-app.onrender.com"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                onClick={handleSaveUrl}
                disabled={savingUrl}
                className="px-4 py-2 font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shrink-0"
              >
                {savingUrl ? 'Connecting...' : 'Save & Connect'}
              </button>
            </div>
          </div>

          {/* Zero-RAM Gemini Pro Cloud Discovery */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-slate-900">Zero-RAM Gemini Pro Cloud Discovery</h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              In low-RAM cloud containers where running heavy headless browsers is restricted, Gemini Pro uses its live commercial research brain to discover verified Gurugram leads with zero browser memory overhead.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="e.g. fine dine restaurants in Cyber Hub Gurugram"
                className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleRunDiscovery}
                disabled={discovering}
                className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
              >
                {discovering ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                {discovering ? 'Researching...' : 'Discover Leads'}
              </button>
            </div>
            {discoveryMsg ? (
              <p className="text-xs font-semibold mt-1 text-slate-800">{discoveryMsg}</p>
            ) : null}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted cloud communication</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
