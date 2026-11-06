// src/components/SettingsModal.tsx — Simple, Friendly Light-Mode Settings & AI Brain Hub
import { useState, useEffect } from 'react'
import {
  X, Server, Check, AlertCircle, RefreshCw, Zap,
  Cpu, Sparkles
} from 'lucide-react'
import {
  getApiBaseUrl, setApiBaseUrl, testConnection, autoDiscoverBackend,
  fetchAiStatus, updateAiConfig, testAiConnection, CURRENT_LAN_IP,
  type AiStatus
} from '../api/client'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function SettingsModal({ onClose, onSaved }: Props) {
  const currentUrl = getApiBaseUrl()
  const [url, setUrl] = useState(currentUrl)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; latency: number; error?: string } | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  // AI Brain state
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash')
  const [savingAi, setSavingAi] = useState(false)
  const [aiNotice, setAiNotice] = useState<string | null>(null)
  const [testingAi, setTestingAi] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<string | null>(null)

  useEffect(() => {
    fetchAiStatus()
      .then((st) => setAiStatus(st))
      .catch(() => {})
  }, [])

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const res = await testConnection(url)
    setTestResult(res)
    setTesting(false)
  }

  const handleAutoDiscover = async () => {
    setDiscovering(true)
    const discovered = await autoDiscoverBackend()
    setUrl(discovered)
    const res = await testConnection(discovered)
    setTestResult(res)
    setDiscovering(false)
  }

  const handleSave = () => {
    setApiBaseUrl(url)
    setSavedNotice(true)
    setTimeout(() => {
      onSaved()
      onClose()
    }, 600)
  }

  const handleSaveAi = async () => {
    if (!apiKeyInput.trim()) return
    setSavingAi(true)
    setAiNotice(null)
    try {
      const res = await updateAiConfig({
        api_key: apiKeyInput.trim(),
        model: selectedModel,
      })
      setAiNotice(res.message)
      setApiKeyInput('')
      const updated = await fetchAiStatus()
      setAiStatus(updated)
    } catch (err: any) {
      setAiNotice(err?.response?.data?.detail || 'Failed to connect Gemini key.')
    } finally {
      setSavingAi(false)
    }
  }

  const handleTestAi = async () => {
    setTestingAi(true)
    setAiTestResult(null)
    try {
      const res = await testAiConnection()
      if (res.success) {
        setAiTestResult(`✅ AI Live: ${res.message}`)
      } else {
        setAiTestResult(`⚠️ ${res.message}`)
      }
    } catch (e: any) {
      setAiTestResult(`❌ Error testing AI: ${e.message}`)
    } finally {
      setTestingAi(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Server size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">App & AI Settings</h2>
              <p className="text-xs text-slate-500">Automate connection and manage AI brain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* SECTION 1: 🧠 AI BRAIN SETTINGS (Latest High-Thinking Models) */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 mb-4 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Cpu size={14} className="text-indigo-600" />
              AI Intelligence Engine
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                aiStatus?.connected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {aiStatus?.connected ? `Active: ${aiStatus.model}` : 'Running: Local High-IQ Engine'}
            </span>
          </div>

          <p className="text-slate-500 text-[11px] mb-3 leading-relaxed">
            Connect Google Gemini to generate custom B2B sales pitches and lead scores.
          </p>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Google Gemini API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={aiStatus?.has_api_key ? '••••••••••••••••••••••••' : 'AIzaSy... (Paste Gemini Key)'}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSaveAi}
                  disabled={savingAi || !apiKeyInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold px-3 py-2 rounded-xl text-xs transition-all shrink-0"
                >
                  {savingAi ? 'Connecting...' : 'Save Key'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Thinking Model:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium"
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest Thinking)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deepest Reasoning)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
                </select>
              </div>

              <button
                onClick={handleTestAi}
                disabled={testingAi}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 active:scale-95"
              >
                {testingAi ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                <span>Test AI Brain</span>
              </button>
            </div>

            {aiNotice && (
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px]">
                {aiNotice}
              </div>
            )}

            {aiTestResult && (
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] leading-relaxed">
                {aiTestResult}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: 🌐 BACKEND SERVER CONNECTION */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 mb-4 text-xs">
          <span className="font-bold text-slate-800 text-xs block mb-1">
            Backend Server Connection
          </span>
          <p className="text-[11px] text-slate-500 mb-2.5">
            The app automatically connects to the server. You can also test or change it below.
          </p>

          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setTestResult(null)
              }}
              placeholder={`http://${CURRENT_LAN_IP}:8000 or Cloud URL`}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleTest}
              disabled={testing || !url.trim()}
              className="bg-white hover:bg-slate-100 active:scale-95 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 transition-all flex items-center gap-1 shrink-0"
            >
              {testing ? <RefreshCw size={12} className="animate-spin text-indigo-600" /> : <Zap size={12} className="text-amber-500" />}
              <span>Test</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex gap-2 mb-2 flex-wrap">
            <button
              type="button"
              onClick={handleAutoDiscover}
              disabled={discovering}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 active:scale-95"
            >
              {discovering ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
              <span>Auto-Discover Backend</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUrl(`http://${CURRENT_LAN_IP}:8000`)
                setTestResult(null)
              }}
              className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] py-1.5 px-2.5 rounded-lg active:scale-95"
            >
              📶 Wi-Fi ({CURRENT_LAN_IP})
            </button>

            <button
              type="button"
              onClick={() => {
                setUrl('http://localhost:8000')
                setTestResult(null)
              }}
              className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] py-1.5 px-2.5 rounded-lg active:scale-95"
            >
              💻 Localhost
            </button>
          </div>

          {/* Test results banner */}
          {testResult && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {testResult.success ? (
                <>
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Connected successfully! Response time: <strong>{testResult.latency}ms</strong></span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="text-rose-600 shrink-0" />
                  <span>Connection failed: {testResult.error || 'Server unreachable'}. Check URL or Wi-Fi.</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2.5 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            {savedNotice ? <Check size={14} /> : null}
            <span>{savedNotice ? 'Saved!' : 'Save & Connect'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
