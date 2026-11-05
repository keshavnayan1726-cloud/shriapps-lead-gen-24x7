// src/components/LeadCard.tsx
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

const STATUS_OPTIONS: LeadStatus[] = ['new', 'contacted', 'interested', 'closed', 'rejected']

interface Props {
  lead: Lead
  onUpdate: (updated: Lead) => void
  onDelete: (id: number) => void
}

export default function LeadCard({ lead, onUpdate, onDelete }: Props) {
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

  async function handleShareLead() {
    const shareText = `🚀 Lead: ${lead.business_name}\nCategory: ${lead.category || 'N/A'}\nPhone: ${lead.phone || 'N/A'}\nScore: ${lead.lead_score}/100\nPitch: ${lead.sales_pitch || ''}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: lead.business_name,
          text: shareText,
        })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      } catch {
        // user cancelled share
      }
    } else {
      navigator.clipboard.writeText(shareText)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg transition-all hover:border-slate-700">
      {/* ── Card Main Header ── */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight truncate">
                {lead.business_name}
              </h3>
              <LeadScoreBadge score={lead.lead_score || 50} />
            </div>

            <div className="flex items-center gap-2 mt-1.5 text-slate-400 text-xs flex-wrap">
              {lead.category && (
                <span className="flex items-center gap-1 bg-slate-800/90 px-2.5 py-0.5 rounded-lg border border-slate-700/60 font-medium">
                  <Tag size={10} className="text-sky-400" />
                  <span className="truncate">{lead.category}</span>
                </span>
              )}
              {lead.rating && (
                <span className="flex items-center gap-1 text-amber-300 font-bold bg-amber-950/40 px-2.5 py-0.5 rounded-lg border border-amber-800/40">
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  <span>{lead.rating}</span>
                  {lead.reviews_count && (
                    <span className="text-slate-400 font-normal">({lead.reviews_count.replace(/[^0-9]/g, '') || 'reviews'})</span>
                  )}
                </span>
              )}
            </div>
          </div>

          <StatusBadge status={lead.status} />
        </div>

        {/* Contact info row */}
        <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-300">
          {lead.phone ? (
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-semibold bg-sky-950/30 px-2 py-0.5 rounded-md border border-sky-900/40"
            >
              <Phone size={12} />
              <span>{lead.phone}</span>
            </a>
          ) : (
            <span className="text-slate-500 text-xs italic">No phone found</span>
          )}

          {lead.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.business_name + ' ' + lead.address)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 truncate max-w-[200px] xs:max-w-[260px]"
            >
              <MapPin size={12} className="text-rose-400 shrink-0" />
              <span className="truncate">{lead.address}</span>
            </a>
          )}

          {lead.website ? (
            <a
              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
            >
              <Globe size={12} />
              <span>Website</span>
              <ExternalLink size={10} />
            </a>
          ) : (
            <span className="text-amber-400 text-[11px] font-bold bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-900/40">
              No Website (Prime Prospect)
            </span>
          )}
        </div>

        {/* ── Action Buttons Row (One-Tap WhatsApp & Quick Tools) ── */}
        <div className="mt-4 flex items-center gap-2 flex-wrap pt-3 border-t border-slate-800">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 transition-all text-white text-xs font-black rounded-2xl px-4 py-2.5 shadow-lg shadow-emerald-950/40"
            >
              <MessageCircle size={16} className="fill-white" />
              <span>Message on WhatsApp</span>
            </a>
          ) : (
            <button
              disabled
              className="text-xs text-slate-500 bg-slate-800/50 rounded-2xl px-4 py-2.5 cursor-not-allowed"
            >
              No WhatsApp
            </button>
          )}

          {/* Quick Copy Pitch */}
          {lead.sales_pitch && (
            <button
              onClick={handleCopyPitch}
              title="Copy WhatsApp Pitch"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 hover:text-white text-xs font-semibold rounded-2xl px-3 py-2.5 border border-slate-700 transition-all"
            >
              {copiedPitch ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span className="hidden xs:inline">Copy Pitch</span>
                </>
              )}
            </button>
          )}

          {/* Share Lead */}
          <button
            onClick={handleShareLead}
            title="Share Lead"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 hover:text-white text-xs font-medium rounded-2xl px-3 py-2.5 border border-slate-700 transition-all"
          >
            {shared ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
          </button>

          {/* Expand Details Toggle */}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span className="font-semibold">{expanded ? 'Close' : 'Details'}</span>
          </button>
        </div>
      </div>

      {/* ── Expanded CRM Details ── */}
      {expanded && (
        <div className="border-t border-slate-800 bg-slate-950/60 p-4 sm:p-5 space-y-4 text-sm animate-fadeIn">
          {/* AI Identified Problems */}
          {lead.problems_identified && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
              <h4 className="flex items-center gap-1.5 font-bold text-amber-400 mb-1.5 text-xs uppercase tracking-wider">
                <AlertTriangle size={13} /> AI Digital Pain Points Identified
              </h4>
              <p className="text-slate-300 whitespace-pre-line leading-relaxed text-xs">
                {lead.problems_identified}
              </p>
            </section>
          )}

          {/* Custom WhatsApp Pitch for Shri Apps and Web */}
          {lead.sales_pitch && (
            <section className="bg-slate-900 border border-sky-900/40 rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="flex items-center gap-1.5 font-bold text-sky-400 text-xs uppercase tracking-wider">
                  <Megaphone size={13} /> WhatsApp Pitch (Shri Apps & Web)
                </h4>
                <button
                  onClick={handleCopyPitch}
                  className="text-xs text-slate-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                >
                  {copiedPitch ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedPitch ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-slate-200 whitespace-pre-line leading-relaxed text-xs bg-slate-950/80 rounded-xl p-3 border border-slate-800 select-all font-mono">
                {lead.sales_pitch}
              </p>
            </section>
          )}

          {/* CRM Status Quick Selector */}
          <section>
            <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-bold">
              Update Pipeline Stage
            </h4>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`text-xs rounded-xl px-3.5 py-2 border transition-all font-bold capitalize active:scale-95 ${
                    lead.status === s
                      ? 'bg-sky-600 border-sky-400 text-white shadow-lg shadow-sky-950/50'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Follow-up Notes */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                Follow-up Notes & Interactions
              </h4>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-xs font-semibold"
                >
                  <Pencil size={12} />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record client response, scheduled call, or pricing discussed..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-xs text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl py-2 disabled:opacity-50"
                  >
                    {savingNotes ? 'Saving…' : 'Save Notes'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false)
                      setNotes(lead.notes ?? '')
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs font-semibold rounded-xl py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-300 text-xs whitespace-pre-line bg-slate-900/90 rounded-2xl p-3 border border-slate-800/80 min-h-[2.5rem]">
                {lead.notes || <span className="italic text-slate-500">No notes recorded yet. Tap edit to log client interactions.</span>}
              </p>
            )}
          </section>

          {/* Delete Action */}
          <div className="pt-2 flex justify-between items-center border-t border-slate-800">
            <span className="text-[11px] text-slate-500">
              Discovered for: {lead.source_query || 'Google Maps'}
            </span>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 text-xs hover:bg-rose-950/40 px-2.5 py-1.5 rounded-xl transition-colors font-medium"
            >
              <Trash2 size={13} />
              <span>Delete Lead</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
