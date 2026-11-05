// src/components/SettingsModal.tsx
import { useState } from 'react'
import { X, Server, Globe, Check, AlertCircle, RefreshCw, Zap } from 'lucide-react'
import { getApiBaseUrl, setApiBaseUrl, testConnection } from '../api/client'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function SettingsModal({ onClose, onSaved }: Props) {
  const currentUrl = getApiBaseUrl()
  const [url, setUrl] = useState(currentUrl)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; latency: number; error?: string } | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const res = await testConnection(url)
    setTestResult(res)
    setTesting(false)
  }

  const handleSave = () => {
    setApiBaseUrl(url)
    setSavedNotice(true)
    setTimeout(() => {
      onSaved()
      onClose()
    }, 800)
  }

  const handleReset = () => {
    setApiBaseUrl('')
    const defaultUrl = getApiBaseUrl()
    setUrl(defaultUrl)
    setTestResult(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
              <Server size={16} />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Network & Server Settings</h2>
              <p className="text-[11px] text-slate-400">Connect from ANY network (4G/5G/Cloud)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Connection Status */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 mb-4 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block mb-1">
            Backend API Endpoint
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setTestResult(null)
              }}
              placeholder="e.g. http://10.90.225.190:8000 or https://xyz.loca.lt"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <button
              onClick={handleTest}
              disabled={testing || !url.trim()}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1 shrink-0"
            >
              {testing ? <RefreshCw size={12} className="animate-spin text-sky-400" /> : <Zap size={12} className="text-amber-400" />}
              <span>Test</span>
            </button>
          </div>

          {/* Test results banner */}
          {testResult && (
            <div
              className={`mt-2.5 p-2 rounded-xl text-xs flex items-center gap-2 border ${
                testResult.success
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800'
              }`}
            >
              {testResult.success ? (
                <>
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Connected successfully! Response time: <strong>{testResult.latency}ms</strong></span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="text-rose-400 shrink-0" />
                  <span>Connection failed: {testResult.error || 'Server unreachable'}. Check URL or tunnel.</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Preset Helpers */}
        <div className="space-y-2 mb-4 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">
            How to Connect Anywhere (No Wi-Fi Restriction)
          </span>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-2.5 text-slate-300 space-y-1 text-[11px] leading-relaxed">
            <p>
              🌐 <strong>Mobile 4G/5G / Public Internet</strong>: Run <code>run-tunnel.bat</code> on your PC or deploy backend to Render/Railway. Paste the public HTTPS URL above.
            </p>
            <p>
              📶 <strong>Local Home Wi-Fi</strong>: Use your PC IP: <code>http://10.90.225.190:8000</code>.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition-all"
          >
            Auto-Detect
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-sky-950/30 transition-all flex items-center justify-center gap-1.5"
          >
            {savedNotice ? <Check size={14} /> : <Globe size={14} />}
            <span>{savedNotice ? 'Saved!' : 'Save & Connect'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
