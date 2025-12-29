/**
 * Admin Contacts Page
 * Manage contact form submissions
 */

import React, { useState, useEffect } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import {
  Mail,
  Search,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Archive,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

const ContactsPage = () => {
  const { adminApi } = useAdmin()
  const [contacts, setContacts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })

  useEffect(() => {
    fetchContacts()
  }, [pagination.page, statusFilter])

  const fetchContacts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter && { status: statusFilter })
      })
      const data = await adminApi('get', `/contacts?${params}`)
      setContacts(data.data.contacts)
      setPagination(prev => ({ ...prev, ...data.data.pagination }))
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
      setError('Failed to load contacts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdate = async (contactId, status) => {
    try {
      await adminApi('put', `/contacts/${contactId}/status`, { status })
      toast.success('Contact status updated')
      fetchContacts()
      if (selectedContact?._id === contactId) {
        setSelectedContact(null)
      }
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      new: 'bg-blue-900/30 text-neon-blue border-blue-600/30',
      read: 'bg-yellow-900/30 text-neon-yellow border-yellow-600/30',
      responded: 'bg-green-900/30 text-neon-green border-green-600/30',
      archived: 'bg-slate-700/30 text-slate-400 border-slate-600/30'
    }
    return badges[status] || badges.new
  }

  if (isLoading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Contact Messages</h1>
          <p className="text-slate-300">Manage contact form submissions</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
          className="input"
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="responded">Responded</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Contacts List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contacts List */}
        <div className="lg:col-span-2 card">
          {error ? (
            <div className="flex items-center space-x-3 text-neon-red">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-300">No contacts found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div
                    key={contact._id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedContact?._id === contact._id
                        ? 'border-neon-blue bg-neon-blue/10'
                        : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-100 mb-1">{contact.subject}</h3>
                        <p className="text-sm text-slate-400 line-clamp-2">{contact.message}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(contact.status)}`}>
                        {contact.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{contact.firstName} {contact.lastName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>{contact.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(contact.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700/50">
                  <p className="text-sm text-slate-300">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} contacts
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="p-2 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800/50"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-slate-300">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                      className="p-2 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800/50"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Contact Details */}
        <div className="card">
          {selectedContact ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-100 mb-2">{selectedContact.subject}</h2>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-3 py-1 rounded text-sm font-medium border ${getStatusBadge(selectedContact.status)}`}>
                    {selectedContact.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">From</p>
                  <p className="text-slate-100">{selectedContact.firstName} {selectedContact.lastName}</p>
                  <p className="text-sm text-slate-400">{selectedContact.email}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Message</p>
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedContact.message}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Received</p>
                  <p className="text-slate-300">
                    {new Date(selectedContact.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700/50 space-y-2">
                <button
                  onClick={() => handleStatusUpdate(selectedContact._id, 'read')}
                  disabled={selectedContact.status === 'read'}
                  className="w-full btn-secondary text-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2 inline" />
                  Mark as Read
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedContact._id, 'responded')}
                  disabled={selectedContact.status === 'responded'}
                  className="w-full btn-secondary text-sm"
                >
                  <MessageSquare className="h-4 w-4 mr-2 inline" />
                  Mark as Responded
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedContact._id, 'archived')}
                  disabled={selectedContact.status === 'archived'}
                  className="w-full btn-secondary text-sm"
                >
                  <Archive className="h-4 w-4 mr-2 inline" />
                  Archive
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-300">Select a contact to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ContactsPage























