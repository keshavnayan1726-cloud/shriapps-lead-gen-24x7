// src/components/OutreachSequenceModal.tsx — 3-Touch WhatsApp Sequence Outreach Hub
import { useState, useEffect } from 'react'
import {
  X, MessageSquare, Clock, Copy, Check, Send, RefreshCw
} from 'lucide-react'
import { fetchLeadSequence } from '../api/client'
import type { Lead, OutreachSequenceResponse, SequenceTouch } from '../api/client'

interface Props {
  lead: Lead
  isOpen: boolean
  onClose: () => void
}

export default function OutreachSequenceModal({ lead, isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [sequence, setSequence] = useState<OutreachSequenceResponse | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setCopiedIndex(null)
      setError('')
      loadSequence()
    }
  }, [isOpen, lead.id])

  const loadSequence = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchLeadSequence(lead.id)
      setSequence(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load outreach sequence.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-100">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">3-Touch WhatsApp Sequence</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                  {lead.phone || 'No Phone'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Personalized cold outreach & follow-up sequence for {lead.business_name}
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
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Generating psychological 3-touch sequence...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          ) : sequence?.touches ? (
            sequence.touches.map((touch: SequenceTouch, idx: number) => (
              <div
                key={touch.touch}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Day {touch.delay_days === 0 ? '1 (Initial)' : touch.delay_days}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800">{touch.title}</h4>
                  </div>
                  <button
                    onClick={() => handleCopy(touch.message, idx)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedIndex === idx ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80 select-all font-sans">
                  {touch.message}
                </p>

                <div className="flex items-center justify-end">
                  <a
                    href={touch.wa_link}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    Send Touch {touch.touch} on WhatsApp
                  </a>
                </div>
              </div>
            ))
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={loadSequence}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
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
