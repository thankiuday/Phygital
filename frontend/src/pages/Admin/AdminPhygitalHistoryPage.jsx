/**
 * Admin Phygital History Page
 * List of admin-created Phygital QR drafts (granted) with target user and date
 */

import React, { useState, useEffect } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import toast from 'react-hot-toast'
import { Gift, User, Calendar, Search } from 'lucide-react'

const AdminPhygitalHistoryPage = () => {
  const { adminApi } = useAdmin()
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('granted')
  const [searchUserId, setSearchUserId] = useState('')

  useEffect(() => {
    fetchDrafts()
  }, [filter, searchUserId])

  const fetchDrafts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ ...(filter && { status: filter }), ...(searchUserId && { targetUserId: searchUserId }) })
      const data = await adminApi('get', `/phygital/drafts?${params}`)
      setDrafts(data?.data?.drafts || [])
    } catch (err) {
      toast.error('Failed to load history')
      setDrafts([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Phygital QR History</h1>
        <p className="text-slate-400 text-sm mt-1">Campaigns you created and granted to users</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200"
        >
          <option value="granted">Granted</option>
          <option value="draft">Drafts</option>
          <option value="">All</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by user ID..."
            value={searchUserId}
            onChange={(e) => setSearchUserId(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No records. Create and grant a Phygital QR from Create Phygital QR.</div>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-800/80 text-slate-300 text-sm">
              <tr>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Target User</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Granted</th>
                <th className="px-4 py-3 font-medium">Project ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {drafts.map((d) => (
                <tr key={d._id} className="bg-slate-800/30 hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-200 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {d.targetUserId?.username || d.targetUserId?.email || (typeof d.targetUserId === 'object' && d.targetUserId?._id) || d.targetUserId || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{d.status || '-'}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {d.grantedAt ? new Date(d.grantedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm font-mono">{d.grantedProjectId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminPhygitalHistoryPage
