// src/components/ProposalModal.tsx — B2B Proposal & Quotation Generator for Shri Apps and Web
import { useState, useEffect } from 'react'
import {
  X, FileText, Check, Copy, Send, RefreshCw,
  IndianRupee
} from 'lucide-react'
import { generateLeadProposal } from '../api/client'
import type { Lead, ProposalGenerateResponse } from '../api/client'

interface Props {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onLeadUpdated: (updated: Lead) => void
}

export default function ProposalModal({ lead, isOpen, onClose, onLeadUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [proposal, setProposal] = useState<ProposalGenerateResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setCopied(false)
      setError('')
      executeGenerate()
    }
  }, [isOpen, lead.id])

  const executeGenerate = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await generateLeadProposal(lead.id)
      setProposal(data)
      onLeadUpdated({
        ...lead,
        status: lead.status === 'new' || lead.status === 'audited' ? 'proposal_sent' : lead.status,
        proposal_content: data.proposal_markdown,
        deal_value: data.suggested_deal_value_inr,
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to generate proposal.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyProposal = () => {
    if (proposal?.proposal_markdown) {
      navigator.clipboard.writeText(proposal.proposal_markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  const cleanPhone = (lead.phone || '').replace(/[^\d+]/g, '')
  const summaryMessage = `Hi ${lead.business_name} team! Following up with our proposal from Shri Apps and Web for your custom web app & WhatsApp automation system. We've outlined 3 scalable packages (Starter ₹18,000, Growth ₹38,000, Enterprise ₹75,000). When would be a good time to review the 5-min roadmap?`
  const waLink = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(summaryMessage)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">B2B Proposal: {lead.business_name}</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
                  Shri Apps and Web
                </span>
              </div>
              <p className="text-xs text-slate-500">Commercial Quote & Scope of Work • Gurugram</p>
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-800">Drafting B2B Proposal...</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Architecting technical deliverables, pricing tiers, and Gurugram growth ROI for {lead.business_name}.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <p className="font-semibold">Generation Error</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          ) : proposal ? (
            <>
              {/* Package Tiers Visual Cards */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Investment Packages (INR ₹)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Starter</span>
                    <div className="text-xl font-bold text-slate-900 flex items-center">
                      <IndianRupee className="w-4 h-4 text-slate-700" />
                      18,000
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      <li>• 5-Page Fast PWA App</li>
                      <li>• Basic WhatsApp Button</li>
                      <li>• UPI Payment Gateway</li>
                      <li>• 7 Days Delivery</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50/40 relative shadow-sm space-y-2">
                    <div className="absolute -top-2.5 right-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      Recommended
                    </div>
                    <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Growth Accelerator</span>
                    <div className="text-xl font-bold text-blue-950 flex items-center">
                      <IndianRupee className="w-4 h-4 text-blue-700" />
                      38,000
                    </div>
                    <ul className="text-[11px] text-slate-700 space-y-1 font-medium">
                      <li>• Complete Direct Ordering PWA</li>
                      <li>• Automated WhatsApp Bot</li>
                      <li>• Real-Time Admin Dashboard</li>
                      <li>• Local SEO Top 3 Push</li>
                      <li>• 14 Days Delivery</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
                    <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Enterprise Suite</span>
                    <div className="text-xl font-bold text-purple-950 flex items-center">
                      <IndianRupee className="w-4 h-4 text-purple-700" />
                      75,000
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      <li>• Full PWA + Native Android App</li>
                      <li>• AI-Powered Inbound WhatsApp Bot</li>
                      <li>• Multi-Location Management</li>
                      <li>• 60 Days VIP Maintenance</li>
                      <li>• 24 Days Delivery</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Full Proposal Markdown Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Full Proposal Document
                  </h4>
                  <button
                    onClick={handleCopyProposal}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Document'}
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap select-all">
                  {proposal.proposal_markdown}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={executeGenerate}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyProposal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Proposal
            </button>
            {cleanPhone ? (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                WhatsApp Summary to Client
              </a>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  )
}
