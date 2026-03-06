/**
 * Admin Referral Codes Page
 * Generate and manage one-time referral codes that unlock Phygital plans.
 */

import React, { useState, useEffect } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import { KeyRound, Copy, RefreshCcw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const ReferralCodesPage = () => {
  const { adminApi } = useAdmin()
  const [codes, setCodes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [plan, setPlan] = useState('phygital')
  const [usageLimit, setUsageLimit] = useState(1)
  const [note, setNote] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })

  useEffect(() => {
    fetchCodes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page])

  const fetchCodes = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })
      const data = await adminApi('get', `/referral-codes?${params.toString()}`)
      setCodes(data.data.referralCodes || [])
      setPagination(prev => ({ ...prev, ...(data.data.pagination || {}) }))
    } catch (err) {
      console.error('Failed to fetch referral codes:', err)
      setError('Failed to load referral codes')
      setCodes([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCode = async (e) => {
    e.preventDefault()
    if (!usageLimit || usageLimit < 1) {
      toast.error('Usage limit must be at least 1')
      return
    }
    setIsCreating(true)
    try {
      const payload = {
        plan,
        usageLimit,
        note: note.trim() || undefined
      }
      const data = await adminApi('post', '/referral-codes', payload)
      const created = data.data?.referral
      if (created) {
        toast.success('Referral code generated')
        // Prepend to list for instant feedback
        setCodes(prev => [created, ...prev])
      } else {
        await fetchCodes()
      }
      setNote('')
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create referral code'
      toast.error(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Code copied to clipboard')
    } catch (err) {
      console.error('Clipboard error:', err)
      toast.error('Failed to copy code')
    }
  }

  const formatDateTime = (value) => {
    if (!value) return '-'
    try {
      return new Date(value).toLocaleString()
    } catch {
      return value
    }
  }

  const formatStatus = (code) => {
    if (!code.isActive || code.usedCount >= code.usageLimit) {
      return 'Used'
    }
    if (code.usedCount > 0) {
      return 'Partially used'
    }
    return 'Unused'
  }

  if (isLoading && codes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1">Referral Codes</h1>
        <p className="text-sm sm:text-base text-slate-300">
          Generate one-time codes that unlock Phygital QR access for selected users.
        </p>
      </div>

      {/* Create code form */}
      <div className="card">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-neon-purple/15 border border-neon-purple/40">
            <KeyRound className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Generate new referral code</h2>
            <p className="text-sm text-slate-400">
              Share the generated code with a user. When they redeem it, their account will be upgraded and the code can be used only up to its usage limit.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateCode} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Plan
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="input w-full text-sm"
            >
              <option value="phygital">Phygital (unlock everything)</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Usage limit
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={usageLimit}
              onChange={(e) => setUsageLimit(Number(e.target.value))}
              className="input w-full text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Note (optional, max 200 chars)
            </label>
            <input
              type="text"
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="E.g. Demo for client A, event batch, etc."
              className="input w-full text-sm"
            />
          </div>
          <div className="md:col-span-4 flex flex-wrap gap-3 mt-1">
            <button
              type="submit"
              disabled={isCreating}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              {isCreating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Generate Code</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={fetchCodes}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Refresh list</span>
            </button>
          </div>
        </form>
      </div>

      {/* Codes list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Existing codes</h2>
          {error && (
            <div className="flex items-center gap-2 text-neon-red text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {codes.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No referral codes yet. Generate one above to get started.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-slate-300">
                    <th className="py-2 px-3">Code</th>
                    <th className="py-2 px-3">Plan</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Usage</th>
                    <th className="py-2 px-3">Created</th>
                    <th className="py-2 px-3">Used By</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr
                      key={code._id}
                      className="border-b border-slate-800/70 hover:bg-slate-800/60"
                    >
                      <td className="py-2 px-3 font-mono text-slate-50">
                        {code.code}
                      </td>
                      <td className="py-2 px-3 text-slate-200 capitalize">
                        {code.plan || 'phygital'}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            !code.isActive || code.usedCount >= code.usageLimit
                              ? 'bg-slate-700 text-slate-300'
                              : code.usedCount > 0
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-neon-green/15 text-neon-green'
                          }`}
                        >
                          {formatStatus(code)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {code.usedCount || 0} / {code.usageLimit}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {formatDateTime(code.createdAt)}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {code.usedBy ? code.usedBy.email || code.usedBy.username || code.usedBy : '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopy(code.code)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {codes.map((code) => (
                <div
                  key={code._id}
                  className="p-4 rounded-lg border border-slate-700/60 bg-slate-900/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm text-slate-50">
                      {code.code}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(code.code)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="capitalize">{code.plan || 'phygital'}</span>
                    <span>
                      {code.usedCount || 0} / {code.usageLimit} uses
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{formatStatus(code)}</span>
                    <span>{formatDateTime(code.createdAt)}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Used by:{' '}
                    {code.usedBy ? code.usedBy.email || code.usedBy.username || code.usedBy : '-'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ReferralCodesPage

