// src/components/PipelineView.tsx — Agency Deals Pipeline & Revenue Funnel (Light Theme)
import { useState, useEffect } from 'react'
import {
  TrendingUp, IndianRupee, CheckCircle2, RefreshCw
} from 'lucide-react'
import { fetchPipelineOverview, updateLead } from '../api/client'
import type { Lead, PipelineOverviewResponse, PipelineStageData, LeadStatus } from '../api/client'

interface Props {
  onOpenAudit: (lead: Lead) => void
  onOpenProposal: (lead: Lead) => void
  onOpenSequence: (lead: Lead) => void
}

export default function PipelineView({ onOpenAudit, onOpenProposal, onOpenSequence }: Props) {
  const [loading, setLoading] = useState(true)
  const [pipeline, setPipeline] = useState<PipelineOverviewResponse | null>(null)
  const [_error, setError] = useState('')

  const loadPipeline = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchPipelineOverview()
      setPipeline(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load pipeline data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPipeline()
  }, [])

  const handleStageChange = async (leadId: number, newStage: LeadStatus) => {
    try {
      await updateLead(leadId, { status: newStage })
      loadPipeline()
    } catch {
      // ignore
    }
  }

  if (loading && !pipeline) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Calculating CRM Pipeline Revenue...</p>
      </div>
    )
  }

  const STAGE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    new: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', badge: 'bg-slate-200 text-slate-700' },
    audited: { bg: 'bg-indigo-50/60', border: 'border-indigo-200', text: 'text-indigo-900', badge: 'bg-indigo-100 text-indigo-800' },
    contacted: { bg: 'bg-blue-50/60', border: 'border-blue-200', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-800' },
    interested: { bg: 'bg-amber-50/60', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-800' },
    proposal_sent: { bg: 'bg-purple-50/60', border: 'border-purple-200', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-800' },
    closed: { bg: 'bg-emerald-50/60', border: 'border-emerald-200', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' },
    rejected: { bg: 'bg-slate-100/50', border: 'border-slate-200', text: 'text-slate-500', badge: 'bg-slate-200 text-slate-600' },
  }

  const totalWonValue = pipeline?.stages
    ?.find((s) => s.stage === 'closed')
    ?.total_value_inr || 0

  return (
    <div className="space-y-6">
      
      {/* Top Value Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Active Pipeline
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-center">
              <IndianRupee className="w-6 h-6 text-indigo-600" />
              {(pipeline?.total_pipeline_value_inr || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Across {pipeline?.total_leads_in_pipeline || 0} commercial opportunities
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Won Revenue 🏆
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-1 flex items-center">
              <IndianRupee className="w-6 h-6 text-emerald-600" />
              {totalWonValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600/90 mt-0.5">Closed deals for Shri Apps and Web</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Average Deal Size
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-center">
              <IndianRupee className="w-6 h-6 text-blue-600" />
              32,500
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Custom PWA & Automation packages</div>
          </div>
          <button
            onClick={loadPipeline}
            className="p-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh Pipeline"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Kanban Board / Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
        {pipeline?.stages
          ?.filter((s) => s.stage !== 'rejected')
          .map((stage: PipelineStageData) => {
            const colors = STAGE_COLORS[stage.stage] || STAGE_COLORS.new
            return (
              <div
                key={stage.stage}
                className={`rounded-2xl border ${colors.border} ${colors.bg} p-3 flex flex-col max-h-[750px] shadow-sm`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 mb-2.5">
                  <div>
                    <h3 className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>
                      {stage.label}
                    </h3>
                    <div className="text-[11px] font-semibold text-slate-600 flex items-center mt-0.5">
                      <IndianRupee className="w-3 h-3 text-slate-500" />
                      {stage.total_value_inr.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${colors.badge}`}>
                    {stage.count}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
                  {stage.leads.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400 font-medium">
                      No leads here
                    </div>
                  ) : (
                    stage.leads.map((lead: Lead) => {
                      const cleanPhone = (lead.phone || '').replace(/[^\d+]/g, '')
                      return (
                        <div
                          key={lead.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2 text-slate-800"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                  {lead.business_name}
                                </h4>
                                {cleanPhone ? (
                                  <a
                                    href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold"
                                    title="Open WhatsApp"
                                  >
                                    WA 💬
                                  </a>
                                ) : null}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                {lead.category || 'Gurugram'}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 whitespace-nowrap">
                              ₹{(lead.deal_value || 25000).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Quick Action Tools */}
                          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100">
                            <button
                              onClick={() => onOpenAudit(lead)}
                              className="text-[10px] font-medium py-1 px-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-center"
                              title="Gemini Pro Audit"
                            >
                              🔬 Audit
                            </button>
                            <button
                              onClick={() => onOpenProposal(lead)}
                              className="text-[10px] font-medium py-1 px-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-center"
                              title="B2B Proposal"
                            >
                              📑 Quote
                            </button>
                            <button
                              onClick={() => onOpenSequence(lead)}
                              className="text-[10px] font-medium py-1 px-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-center"
                              title="WhatsApp Sequence"
                            >
                              💬 3-Touch
                            </button>
                          </div>

                          {/* Stage Transition Selector */}
                          <div className="flex items-center justify-between pt-1 text-[10px]">
                            <span className="text-slate-400">Move:</span>
                            <select
                              value={lead.status}
                              onChange={(e) => handleStageChange(lead.id, e.target.value as LeadStatus)}
                              className="text-[10px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none"
                            >
                              <option value="new">New</option>
                              <option value="audited">Audited 🔬</option>
                              <option value="contacted">Pitch Sent 💬</option>
                              <option value="interested">Interested ⭐</option>
                              <option value="proposal_sent">Proposal 📑</option>
                              <option value="closed">Won 🏆</option>
                              <option value="rejected">Archive</option>
                            </select>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
