// src/components/GeminiResearchModal.tsx — Deep Gemini Pro Research & Audit Modal
import { useState, useEffect } from 'react'
import {
  X, Sparkles, AlertTriangle, ShieldCheck,
  TrendingDown, CheckCircle2, Copy, Send, RefreshCw, IndianRupee
} from 'lucide-react'
import { runLeadResearch, updateLead } from '../api/client'
import type { Lead, ResearchAuditResponse } from '../api/client'

interface Props {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onLeadUpdated: (updated: Lead) => void
}

export default function GeminiResearchModal({ lead, isOpen, onClose, onLeadUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [audit, setAudit] = useState<ResearchAuditResponse | null>(null)
  const [dealValue, setDealValue] = useState(lead.deal_value || 35000)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setDealValue(lead.deal_value || 35000)
      setCopied(false)
      setError('')
      // Trigger research automatically if not yet audited
      executeAudit()
    }
  }, [isOpen, lead.id])

  const executeAudit = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await runLeadResearch(lead.id)
      setAudit(data)
      setDealValue(data.suggested_deal_value_inr || 35000)
      onLeadUpdated({
        ...lead,
        status: lead.status === 'new' ? 'audited' : lead.status,
        audit_report: data.audit_markdown,
        deal_value: data.suggested_deal_value_inr,
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to complete Gemini Pro audit.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDealValue = async () => {
    try {
      const updated = await updateLead(lead.id, { deal_value: dealValue })
      onLeadUpdated(updated)
    } catch {
      // ignore
    }
  }

  const handleCopyPitch = () => {
    if (audit?.irresistible_pitch) {
      navigator.clipboard.writeText(audit.irresistible_pitch)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  const cleanPhone = (lead.phone || '').replace(/[^\d+]/g, '')
  const waLink = audit?.irresistible_pitch
    ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(audit.irresistible_pitch)}`
    : `https://wa.me/${cleanPhone.replace('+', '')}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{lead.business_name}</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700">
                  Gemini Pro Brain
                </span>
              </div>
              <p className="text-xs text-slate-500">{lead.category || 'Local Business'} • Gurugram</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-800">
                  Gemini Pro is Auditing {lead.business_name}...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Analyzing digital presence, computing aggregator commission loss, and generating Shri Apps and Web pitch.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4" /> Audit Error
              </div>
              <p className="text-xs">{error}</p>
              <button
                onClick={executeAudit}
                className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Audit
              </button>
            </div>
          ) : audit ? (
            <>
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Digital Maturity
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
                    {audit.digital_maturity_score}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {audit.digital_maturity_score > 60 ? 'Moderate Digitization' : 'High Modernization Gap'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-200">
                  <div className="text-[11px] font-semibold text-red-700 uppercase tracking-wider flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Revenue Leak
                  </div>
                  <div className="text-sm font-bold text-red-900 mt-1 leading-snug">
                    {audit.estimated_monthly_loss_inr}
                  </div>
                  <div className="text-[11px] text-red-600/90 mt-0.5">Aggregator fees & lost bookings</div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200">
                  <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" /> Deal Value
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      value={dealValue}
                      onChange={(e) => setDealValue(Number(e.target.value))}
                      onBlur={handleSaveDealValue}
                      className="text-lg font-bold text-indigo-950 bg-white border border-indigo-300 rounded px-2 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-indigo-700 font-medium">INR</span>
                  </div>
                  <div className="text-[11px] text-indigo-600/90 mt-0.5">Suggested agency contract</div>
                </div>
              </div>

              {/* Executive Diagnosis */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Executive Diagnosis</h4>
                <p className="text-xs text-slate-700 leading-relaxed">{audit.executive_summary}</p>
              </div>

              {/* Critical Vulnerabilities */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Identified Gaps & Vulnerabilities
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {audit.tech_vulnerabilities?.map((v, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/60 text-xs text-amber-900">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Shri Apps and Web Services */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Recommended Shri Apps and Web Solutions
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {audit.recommended_services?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-medium">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cold Pitch Box */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    High-Converting Pitch Hook
                  </span>
                  <button
                    onClick={handleCopyPitch}
                    className="text-xs font-medium text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-indigo-950 font-medium italic bg-white/80 p-3 rounded-lg border border-indigo-100">
                  "{audit.irresistible_pitch}"
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={executeAudit}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-Audit
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Close
            </button>
            {cleanPhone ? (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send Pitch on WhatsApp
              </a>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  )
}
