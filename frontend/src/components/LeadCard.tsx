// src/components/LeadCard.tsx — Simple, Tactile Light-Mode Card with 1-Tap WhatsApp
import { useState } from 'react'
import {
  Phone, Globe, MapPin, Tag, MessageCircle,
  ChevronDown, ChevronUp, Pencil, Trash2, AlertTriangle,
  Megaphone, Copy, Check, ExternalLink, Star, Share2
} from 'lucide-react'
import type { Lead, LeadStatus } from '../api/client'
import { updateLead, deleteLead } from '../api/client'
import { buildWhatsAppUrl, cleanPhone } from '../utils/whatsapp'
import StatusBadge from './StatusBadge'
import LeadScoreBadge from './LeadScoreBadge'

const STATUS_OPTIONS: LeadStatus[] = ['new', 'audited', 'contacted', 'interested', 'proposal_sent', 'closed', 'rejected']

interface Props {
  lead: Lead
  onUpdate: (updated: Lead) => void
  onDelete: (id: number) => void
  onOpenAudit?: (lead: Lead) => void
  onOpenProposal?: (lead: Lead) => void
  onOpenSequence?: (lead: Lead) => void
}

export default function LeadCard({
  lead,
  onUpdate,
  onDelete,
  onOpenAudit,
  onOpenProposal,
  onOpenSequence,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [copiedPitch, setCopiedPitch] = useState(false)
  const [shared, setShared] = useState(false)

  const cleanedPhone = cleanPhone(lead.phone || '')
  const whatsappUrl =
    cleanedPhone && lead.sales_pitch
      ? buildWhatsAppUrl(cleanedPhone, lead.sales_pitch)
      : null

  async function handleStatusChange(status: LeadStatus) {
    const updated = await updateLead(lead.id, { status })
    onUpdate(updated)
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    try {
      const updated = await updateLead(lead.id, { notes })
      onUpdate(updated)
      setEditingNotes(false)
    } finally {
      setSavingNotes(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${lead.business_name}" from pipeline?`)) return
    await deleteLead(lead.id)
    onDelete(lead.id)
  }

  function handleCopyPitch() {
    if (!lead.sales_pitch) return
    navigator.clipboard.writeText(lead.sales_pitch)
    setCopiedPitch(true)
    setTimeout(() => setCopiedPitch(false), 2000)
  }

  async function handleShare() {
    if (!navigator.share) {
      handleCopyPitch()
      return
    }
    try {
      await navigator.share({
        title: `Lead: ${lead.business_name}`,
        text: `Phone: ${lead.phone || 'N/A'}\nPitch: ${lead.sales_pitch}`,
        url: lead.website || undefined,
      })
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {}
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
      {/* Top Header: Business Name + Score + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate">
              {lead.business_name}
            </h3>
            {lead.rating && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-md">
                <Star size={11} className="fill-amber-500 text-amber-500" />
                {lead.rating}
                {lead.reviews_count && (
                  <span className="text-slate-400 font-normal">({lead.reviews_count})</span>
                )}
              </span>
            )}
          </div>

          {/* Category & Address */}
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            {lead.category && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <Tag size={12} className="text-slate-400 shrink-0" />
                {lead.category}
              </span>
            )}
            {lead.address && (
              <span className="inline-flex items-center gap-1 text-slate-500 truncate max-w-xs">
                <MapPin size={12} className="text-slate-400 shrink-0" />
                {lead.address}
              </span>
            )}
          </div>
        </div>

        {/* Lead Score & Status Picker */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <LeadScoreBadge score={lead.lead_score} />
          <div className="flex items-center gap-1">
            <StatusBadge status={lead.status} />
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className="opacity-0 absolute w-6 h-6 cursor-pointer"
              title="Change status"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contact Bar */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs">
        {lead.phone ? (
          <a
            href={`tel:${cleanedPhone || lead.phone}`}
            className="inline-flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-medium"
          >
            <Phone size={13} className="text-indigo-600" />
            <span>{lead.phone}</span>
          </a>
        ) : (
          <span className="text-slate-400 italic text-[11px]">No phone listed</span>
        )}

        {lead.website ? (
          <a
            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 truncate max-w-[160px]"
          >
            <Globe size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
            <ExternalLink size={10} className="shrink-0 text-slate-400" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-rose-600 font-medium text-[11px]">
            <AlertTriangle size={11} /> No website (High opportunity)
          </span>
        )}
      </div>

      {/* Agency Quick Toolkit Row */}
      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 flex-wrap">
        {onOpenAudit && (
          <button
            onClick={() => onOpenAudit(lead)}
            className="text-[11px] font-semibold py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 transition-colors flex items-center gap-1 active:scale-95"
            title="Run Gemini Pro Deep Audit"
          >
            <span>🔬 AI Audit</span>
          </button>
        )}
        {onOpenProposal && (
          <button
            onClick={() => onOpenProposal(lead)}
            className="text-[11px] font-semibold py-1 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 transition-colors flex items-center gap-1 active:scale-95"
            title="Generate B2B Proposal & Quote"
          >
            <span>📑 Proposal</span>
          </button>
        )}
        {onOpenSequence && (
          <button
            onClick={() => onOpenSequence(lead)}
            className="text-[11px] font-semibold py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 transition-colors flex items-center gap-1 active:scale-95"
            title="View 3-Touch WhatsApp Sequence"
          >
            <span>💬 3-Touch Sequence</span>
          </button>
        )}
        <div className="ml-auto text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          ₹{(lead.deal_value || 25000).toLocaleString('en-IN')}
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="flex items-center gap-2 mt-3.5 flex-wrap">
        {/* ONE-TAP WHATSAPP BUTTON (Prominent Emerald) */}
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (lead.status === 'new') handleStatusChange('contacted')
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 min-w-[170px]"
          >
            <MessageCircle size={16} className="fill-white shrink-0" />
            <span>Message on WhatsApp</span>
          </a>
        ) : (
          <button
            disabled
            className="flex-1 bg-slate-100 text-slate-400 font-medium text-xs py-2.5 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} />
            <span>No Phone Available</span>
          </button>
        )}

        {/* Copy Pitch Button */}
        {lead.sales_pitch && (
          <button
            onClick={handleCopyPitch}
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
            title="Copy Pitch to clipboard"
          >
            {copiedPitch ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copiedPitch ? 'Copied!' : 'Copy Pitch'}</span>
          </button>
        )}

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors shrink-0"
          title="Share lead"
        >
          {shared ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
        </button>

        {/* Expand Details Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors shrink-0 ml-auto"
          title={expanded ? 'Hide details' : 'Show problems & pitch'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expandable Section: AI Analysis & Notes */}
      {expanded && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-3 animate-fadeIn text-xs">
          {/* Problems Identified */}
          {lead.problems_identified && (
            <div className="bg-rose-50/70 border border-rose-200/70 rounded-xl p-3">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <AlertTriangle size={13} />
                Bottlenecks & Opportunities
              </span>
              <p className="text-slate-700 whitespace-pre-line leading-relaxed font-sans text-xs">
                {lead.problems_identified}
              </p>
            </div>
          )}

          {/* AI Tailored Pitch */}
          {lead.sales_pitch && (
            <div className="bg-sky-50/70 border border-sky-200/70 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1">
                  <Megaphone size={13} />
                  Tailored Pitch for Shri Apps and Web
                </span>
                <button
                  onClick={handleCopyPitch}
                  className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1"
                >
                  {copiedPitch ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedPitch ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-slate-800 leading-relaxed font-sans text-xs bg-white/80 p-2.5 rounded-lg border border-sky-100">
                "{lead.sales_pitch}"
              </p>
            </div>
          )}

          {/* Notes & Audit */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Internal CRM Notes
              </span>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px]"
                >
                  <Pencil size={11} />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Spoke to manager Aman, promised to send demo on Friday..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={2}
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setEditingNotes(false)}
                    className="text-slate-500 hover:text-slate-700 text-xs px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-lg"
                  >
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 italic text-xs">
                {lead.notes || 'No notes added yet.'}
              </p>
            )}
          </div>

          {/* Delete action */}
          <div className="flex justify-end pt-1">
            <button
              onClick={handleDelete}
              className="text-rose-600 hover:text-rose-700 text-[11px] font-medium flex items-center gap-1 hover:underline"
            >
              <Trash2 size={12} />
              <span>Remove lead from pipeline</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
