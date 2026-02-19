/**
 * BusinessCardListPage
 * Dashboard showing user's digital business cards.
 * Click a card to expand its advanced analytics panel inline.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, Edit, Trash2, ExternalLink, Copy, Check, Loader2,
  Eye, CreditCard, BarChart3, Users, MousePointerClick, Download,
  QrCode, Globe2, Smartphone, Monitor, Tablet, X, ChevronDown, ChevronUp,
  Clock, TrendingUp, MapPin, Share2, Link2, ArrowUpRight
} from 'lucide-react'
import api from '../../utils/api'

// ─── Mini bar chart component ──────────────────────────────
function MiniBar({ data, maxHeight = 80, color = '#8B5CF6', label }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      {label && <p className="text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wider">{label}</p>}
      <div className="flex items-end gap-[2px]" style={{ height: maxHeight }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 group relative">
            <div
              className="w-full rounded-t transition-all duration-200 hover:opacity-80"
              style={{
                height: Math.max((d.value / max) * maxHeight, 2),
                backgroundColor: color,
                opacity: 0.7 + (d.value / max) * 0.3
              }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <div className="bg-slate-800 text-[10px] text-slate-200 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                {d.label}: {d.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Donut chart component ─────────────────────────────────
function MiniDonut({ segments, size = 90 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.filter(s => s.value > 0).map((seg, i) => {
          const pct = seg.value / total
          const dash = circumference * pct
          const gap = circumference - dash
          const currentOffset = offset
          offset += dash
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={seg.color} strokeWidth={6}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              className="transition-all duration-500"
            />
          )
        })}
      </svg>
      <span className="absolute text-sm font-bold text-slate-200">{total}</span>
    </div>
  )
}

// ─── Stat card component ──────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'text-neon-purple', bgColor = 'bg-neon-purple/10' }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${bgColor}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-100 leading-tight">{value?.toLocaleString?.() || value || '0'}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Breakdown list component ─────────────────────────────
function BreakdownList({ items, label, icon: Icon, maxItems = 8 }) {
  if (!items?.length) return null
  const total = items.reduce((s, i) => s + i.count, 0) || 1
  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
      <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        {label}
      </h4>
      <div className="space-y-1.5">
        {items.slice(0, maxItems).map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-slate-300 truncate">{item.name || item.domain || item.country || item.city || 'Unknown'}</span>
              <span className="text-slate-400 ml-2 shrink-0">{item.count} ({Math.round(item.count / total * 100)}%)</span>
            </div>
            <div className="w-full bg-slate-700/40 rounded-full h-1">
              <div className="h-1 rounded-full bg-neon-purple/60 transition-all" style={{ width: `${(item.count / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Analytics Panel ──────────────────────────────────────
function AnalyticsPanel({ cardId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/business-cards/${cardId}/analytics?period=${period}`)
      setData(res.data?.data || null)
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [cardId, period])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neon-purple" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm">
        No analytics data available yet.
      </div>
    )
  }

  const { summary, timeline, devices, browsers, operatingSystems, sources, topReferrers, topCountries, topCities, contactTargets, socialTargets, hourlyHeatmap, weeklyDistribution } = data

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const timelineData = (timeline || []).map(t => ({ label: t.date?.slice(5), value: t.views }))
  const hourData = (hourlyHeatmap || []).map((v, i) => ({ label: `${i}:00`, value: v }))
  const weekData = (weeklyDistribution || []).map((v, i) => ({ label: dayNames[i], value: v }))

  const deviceSegments = [
    { label: 'Mobile', value: devices?.mobile || 0, color: '#8B5CF6' },
    { label: 'Desktop', value: devices?.desktop || 0, color: '#06B6D4' },
    { label: 'Tablet', value: devices?.tablet || 0, color: '#F59E0B' },
  ].filter(s => s.value > 0)

  const sourceSegments = [
    { label: 'QR Scan', value: sources?.qr || 0, color: '#10B981' },
    { label: 'Direct', value: sources?.direct || 0, color: '#8B5CF6' },
    { label: 'Social', value: sources?.social || 0, color: '#EC4899' },
    { label: 'Link', value: sources?.link || 0, color: '#06B6D4' },
  ].filter(s => s.value > 0)

  return (
    <div className="border-t border-slate-700/40 bg-slate-850/50">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-neon-purple" /> Advanced Analytics
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(Number(e.target.value))}
            className="bg-slate-700/60 border border-slate-600/50 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-neon-purple/50"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={Eye} label="Total Views" value={summary.totalViews} sub={`${summary.periodViews} in period`} color="text-blue-400" bgColor="bg-blue-500/10" />
          <StatCard icon={Users} label="Unique Visitors" value={summary.uniqueVisitors} sub={`${summary.periodUnique} in period`} color="text-green-400" bgColor="bg-green-500/10" />
          <StatCard icon={QrCode} label="QR Scans" value={summary.qrScans} color="text-emerald-400" bgColor="bg-emerald-500/10" />
          <StatCard icon={Globe2} label="Direct Visits" value={summary.directVisits} color="text-cyan-400" bgColor="bg-cyan-500/10" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={MousePointerClick} label="Contact Clicks" value={summary.contactClicks} sub={`${summary.periodContactClicks} in period`} color="text-purple-400" bgColor="bg-purple-500/10" />
          <StatCard icon={Share2} label="Social Clicks" value={summary.socialClicks} sub={`${summary.periodSocialClicks} in period`} color="text-pink-400" bgColor="bg-pink-500/10" />
          <StatCard icon={Download} label="vCard Downloads" value={summary.vcardDownloads} sub={`${summary.periodVcardDownloads} in period`} color="text-amber-400" bgColor="bg-amber-500/10" />
          <StatCard icon={Link2} label="Link Clicks" value={summary.linkClicks} sub={`${summary.periodLinkClicks} in period`} color="text-teal-400" bgColor="bg-teal-500/10" />
        </div>

        {/* Views timeline */}
        {timelineData.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              Views Over Time
            </h4>
            <MiniBar data={timelineData} maxHeight={60} color="#8B5CF6" />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <span>{timelineData[0]?.label}</span>
              <span>{timelineData[timelineData.length - 1]?.label}</span>
            </div>
          </div>
        )}

        {/* Devices & Sources donut row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {deviceSegments.length > 0 && (
            <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                Device Breakdown
              </h4>
              <div className="flex items-center gap-4">
                <MiniDonut segments={deviceSegments} size={80} />
                <div className="space-y-1">
                  {deviceSegments.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-300">{s.label}</span>
                      <span className="text-slate-500 ml-auto">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sourceSegments.length > 0 && (
            <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-slate-400" />
                Traffic Sources
              </h4>
              <div className="flex items-center gap-4">
                <MiniDonut segments={sourceSegments} size={80} />
                <div className="space-y-1">
                  {sourceSegments.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-300">{s.label}</span>
                      <span className="text-slate-500 ml-auto">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hourly & Weekly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hourData.some(d => d.value > 0) && (
            <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Hourly Activity
              </h4>
              <MiniBar data={hourData} maxHeight={50} color="#06B6D4" />
            </div>
          )}
          {weekData.some(d => d.value > 0) && (
            <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                Day of Week
              </h4>
              <MiniBar data={weekData} maxHeight={50} color="#EC4899" />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                {dayNames.map(d => <span key={d}>{d}</span>)}
              </div>
            </div>
          )}
        </div>

        {/* Location, Browsers, OS, Referrers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topCountries?.length > 0 && (
            <BreakdownList items={topCountries.map(c => ({ name: c.country, count: c.count }))} label="Top Countries" icon={MapPin} />
          )}
          {topCities?.length > 0 && (
            <BreakdownList items={topCities.map(c => ({ name: c.city, count: c.count }))} label="Top Cities" icon={MapPin} />
          )}
          {browsers?.length > 0 && (
            <BreakdownList items={browsers.map(b => ({ name: b.name, count: b.count }))} label="Browsers" icon={Globe2} />
          )}
          {operatingSystems?.length > 0 && (
            <BreakdownList items={operatingSystems.map(o => ({ name: o.name, count: o.count }))} label="Operating Systems" icon={Monitor} />
          )}
          {topReferrers?.length > 0 && (
            <BreakdownList items={topReferrers} label="Top Referrers" icon={ArrowUpRight} />
          )}
          {contactTargets?.length > 0 && (
            <BreakdownList items={contactTargets.map(c => ({ name: c.name, count: c.count }))} label="Contact Actions" icon={MousePointerClick} />
          )}
          {socialTargets?.length > 0 && (
            <BreakdownList items={socialTargets.map(s => ({ name: s.name, count: s.count }))} label="Social Clicks" icon={Share2} />
          )}
        </div>

        {/* Last viewed */}
        {summary.lastViewedAt && (
          <p className="text-[10px] text-slate-500 text-center">
            Last viewed: {new Date(summary.lastViewedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  MAIN LIST PAGE
// ═══════════════════════════════════════════════════════════
export default function BusinessCardListPage() {
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [expandedCardId, setExpandedCardId] = useState(null)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/business-cards')
      setCards(res.data?.data?.cards || [])
    } catch {
      toast.error('Failed to load business cards')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCards() }, [fetchCards])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this card?')) return
    setDeletingId(id)
    try {
      await api.delete(`/business-cards/${id}`)
      setCards(prev => prev.filter(c => c._id !== id))
      if (expandedCardId === id) setExpandedCardId(null)
      toast.success('Card deleted')
    } catch {
      toast.error('Failed to delete card')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCopy = (slug) => {
    const url = `${window.location.origin}/#/card/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(slug)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleAnalytics = (id) => {
    setExpandedCardId(prev => prev === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gradient">
              <CreditCard className="w-5 h-5 shrink-0" />
              <span className="truncate">Digital Business Cards</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 hidden sm:block">Create and manage your digital business cards</p>
          </div>
          <button
            onClick={() => navigate('/business-cards/create')}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white hover:shadow-glow-lg transition-all duration-300 hover:scale-105 active:scale-95 text-xs sm:text-sm font-medium shrink-0"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New</span> Card
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur-sm animate-pulse">
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="flex-1 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-700 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-2/3" />
                      <div className="h-3 bg-slate-700/60 rounded w-1/3" />
                    </div>
                    <div className="h-5 w-16 bg-slate-700 rounded-full shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 md:py-0 shrink-0">
                    <div className="h-3 bg-slate-700/50 rounded w-12" />
                    <div className="h-3 bg-slate-700/50 rounded w-12" />
                    <div className="h-3 bg-slate-700/50 rounded w-12" />
                  </div>
                  <div className="flex items-center gap-1.5 px-4 pb-3 md:pb-0 md:pr-4 shrink-0">
                    <div className="h-7 bg-slate-700/40 rounded-lg w-20" />
                    <div className="h-7 bg-slate-700/40 rounded-lg w-14" />
                    <div className="h-7 bg-slate-700/40 rounded-lg w-8" />
                    <div className="h-7 bg-slate-700/40 rounded-lg w-8 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-300 mb-2">No business cards yet</h2>
            <p className="text-sm text-slate-500 mb-6">Create your first digital business card to get started.</p>
            <button
              onClick={() => navigate('/business-cards/create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white hover:shadow-glow-lg transition-all duration-300 hover:scale-105 active:scale-95 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Create Card
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map(card => (
              <div key={card._id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center">
                  {/* Card preview */}
                  <div className="flex-1 p-4 flex items-center gap-3 min-w-0">
                    {card.profile?.photo ? (
                      <img src={card.profile.photo} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-neon-purple/30 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate text-slate-100">{card.profile?.name || 'Untitled Card'}</h3>
                      {card.profile?.title && <p className="text-xs text-slate-400 truncate">{card.profile.title}</p>}
                      {card.profile?.company && <p className="text-[10px] text-slate-500 truncate">{card.profile.company}</p>}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${card.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                      {card.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  {/* Quick stats */}
                  <div className="flex items-center gap-3 px-3 sm:px-4 py-2 md:py-0 text-xs text-slate-400 shrink-0">
                    <span className="flex items-center gap-1" title="Total views"><Eye className="w-3.5 h-3.5" /> {card.analytics?.totalViews || 0}</span>
                    <span className="flex items-center gap-1" title="Unique visitors"><Users className="w-3.5 h-3.5" /> {card.analytics?.uniqueVisitors || 0}</span>
                    <span className="flex items-center gap-1" title="Total clicks"><MousePointerClick className="w-3.5 h-3.5" /> {(card.analytics?.contactClicks || 0) + (card.analytics?.socialClicks || 0) + (card.analytics?.linkClicks || 0)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 px-3 sm:px-4 pb-3 md:pb-0 md:pr-4 shrink-0">
                    <button
                      onClick={() => toggleAnalytics(card._id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        expandedCardId === card._id
                          ? 'bg-neon-purple/30 text-neon-purple ring-1 ring-neon-purple/30'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-neon-purple'
                      }`}
                      title="View Analytics"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Analytics</span>
                      {expandedCardId === card._id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button onClick={() => navigate(`/business-cards/edit/${card._id}`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 text-xs font-medium transition">
                      <Edit className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    {card.isPublished && card.slug && (
                      <>
                        <a href={`/#/card/${card.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 text-xs font-medium transition">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </a>
                        <button onClick={() => handleCopy(card.slug)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 text-xs font-medium transition" title="Copy link">
                          {copiedId === card.slug ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDelete(card._id)} disabled={deletingId === card._id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20 text-xs font-medium transition disabled:opacity-50" title="Delete">
                      {deletingId === card._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded analytics panel */}
                {expandedCardId === card._id && (
                  <AnalyticsPanel cardId={card._id} onClose={() => setExpandedCardId(null)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
