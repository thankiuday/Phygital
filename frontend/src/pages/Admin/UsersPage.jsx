/**
 * Admin Users Management Page
 * View and manage all users
 */

import React, { useState, useEffect } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Mail,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

const UsersPage = () => {
  const { adminApi } = useAdmin()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, searchTerm, statusFilter])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      })
      const data = await adminApi('get', `/users?${params}`)
      setUsers(data.data.users)
      setPagination(prev => ({ ...prev, ...data.data.pagination }))
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await adminApi('put', `/users/${userId}/status`, { isActive: !currentStatus })
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      fetchUsers()
    } catch (err) {
      toast.error('Failed to update user status')
    }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      await adminApi('delete', `/users/${userId}`)
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user')
    }
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1 sm:mb-2">Users Management</h1>
        <p className="text-sm sm:text-base text-slate-300">View and manage all platform users</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="input pl-9 sm:pl-10 w-full text-sm sm:text-base"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="input text-sm sm:text-base"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table - Desktop / Mobile Cards */}
      <div className="card">
        {error ? (
          <div className="flex items-center space-x-3 text-neon-red">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm sm:text-base">{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300">No users found</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-3"
                >
                  {/* User Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="p-2 bg-neon-blue/20 rounded-lg flex-shrink-0">
                        <Users className="h-4 w-4 text-neon-blue" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-100 truncate">{user.username}</p>
                        <div className="flex items-center space-x-1 text-xs text-slate-400 mt-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                    </div>
                    {user.email !== 'admin@phygital.zone' && (
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="p-2 text-neon-red hover:bg-red-900/20 rounded-lg transition-all flex-shrink-0"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* User Details */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/50">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Projects</p>
                      <p className="text-sm font-medium text-slate-100">{user.projects?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Joined</p>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <p className="text-sm text-slate-300">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-xs text-slate-400">Account Status</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleStatusToggle(user._id, user.isActive)}
                        disabled={user.email === 'admin@phygital.zone'}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          user.isActive 
                            ? 'bg-neon-green' 
                            : 'bg-slate-600'
                        } ${user.email === 'admin@phygital.zone' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            user.isActive ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-medium ${
                        user.isActive ? 'text-neon-green' : 'text-slate-400'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Projects</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Joined</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-neon-blue/20 rounded-lg">
                            <Users className="h-4 w-4 text-neon-blue" />
                          </div>
                          <span className="font-medium text-slate-100">{user.username}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2 text-slate-300">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        {user.projects?.length || 0}
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleStatusToggle(user._id, user.isActive)}
                            disabled={user.email === 'admin@phygital.zone'}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                              user.isActive 
                                ? 'bg-neon-green focus:ring-neon-green' 
                                : 'bg-slate-600 focus:ring-slate-500'
                            } ${user.email === 'admin@phygital.zone' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={user.email === 'admin@phygital.zone' ? 'Admin account cannot be deactivated' : user.isActive ? 'Click to deactivate' : 'Click to activate'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                user.isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-sm font-medium ${
                            user.isActive ? 'text-neon-green' : 'text-slate-400'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          {user.email !== 'admin@phygital.zone' && (
                            <button
                              onClick={() => handleDelete(user._id)}
                              className="p-2 text-neon-red hover:bg-red-900/20 rounded-lg transition-all"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-6 pt-4 border-t border-slate-700/50">
                <p className="text-xs sm:text-sm text-slate-300 text-center sm:text-left">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="p-2 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800/50"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <span className="text-xs sm:text-sm text-slate-300">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="p-2 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800/50"
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default UsersPage

