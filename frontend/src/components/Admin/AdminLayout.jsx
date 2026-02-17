/**
 * Admin Layout Component
 * Layout wrapper for admin pages with sidebar navigation
 */

import React, { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../contexts/AdminContext'
import Logo from '../UI/Logo'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BarChart3,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  History
} from 'lucide-react'

const AdminLayout = () => {
  const { admin, logout, isAuthenticated } = useAdmin()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Campaigns', href: '/admin/projects', icon: FolderKanban },
    { name: 'Create Phygital QR', href: '/admin/phygital/create', icon: Sparkles },
    { name: 'Phygital History', href: '/admin/phygital/history', icon: History },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Contacts', href: '/admin/contacts', icon: Mail },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="min-h-screen bg-dark-mesh flex">
      {/* Sidebar - Only show when admin is authenticated */}
      {isAuthenticated && (
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}>
        <div className="flex flex-col h-full">
          {/* Logo and Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-700/50">
            <Link to="/admin/dashboard" className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
              <Logo size="sm" showText={false} linkTo={null} showGlow={false} className="flex-shrink-0" />
              <span className="text-base sm:text-xl font-bold text-gradient truncate">Phygital Admin</span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-200 flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${active
                      ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30 shadow-glow-blue'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Admin Info and Logout */}
          <div className="p-4 border-t border-slate-700/50 space-y-4">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-300">Logged in as</p>
              <p className="text-sm font-medium text-slate-100 truncate">
                {admin?.email || 'Admin'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200 border border-transparent hover:border-red-900/30"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
      )}

      {/* Overlay for mobile - Only show when sidebar is open and admin is authenticated */}
      {isAuthenticated && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top Bar - Only show when admin is authenticated */}
        {isAuthenticated && (
          <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-30">
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-slate-200"
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate flex-1 text-center sm:text-left sm:ml-0 ml-4">
                {navigation.find(item => isActive(item.href))?.name || 'Admin Panel'}
              </h2>
              <div className="w-10" /> {/* Spacer for mobile */}
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout

