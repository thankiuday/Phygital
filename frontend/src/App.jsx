/**
 * Main App Component
 * Handles routing and layout for the entire application
 * Includes protected routes and public routes
 */

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import LoadingSpinner from './components/UI/LoadingSpinner'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import GameUploadPage from './pages/Upload/GameUploadPage'
import QRCodePage from './pages/QRCode/QRCodePage'
import QRScanPage from './pages/QRScan/QRScanPage'
import ARExperiencePage from './pages/ARExperience/ARExperiencePage'
import AnalyticsPage from './pages/Analytics/AnalyticsPage'
import ProfilePage from './pages/Profile/ProfilePage'
import UserPage from './pages/User/UserPage'
import HistoryPage from './pages/History/HistoryPage'
import ScanPage from './pages/ScanPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  const { isLoading } = useAuth()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="App">
      <Routes>
        {/* Public Routes - Project-specific QR scan routes added */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="user/:username" element={<UserPage />} />
          <Route path="scan/:userId" element={<QRScanPage />} />
          <Route path="scan/project/:projectId" element={<QRScanPage />} />
          <Route path="scan/:id" element={<ScanPage />} />
          <Route path="ar/:userId" element={<ARExperiencePage />} />
          <Route path="ar/project/:projectId" element={<ARExperiencePage />} />
        </Route>

        {/* Protected Routes */}
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
        <Route path="upload" element={
          <ProtectedRoute>
            <GameUploadPage />
          </ProtectedRoute>
        } />
          <Route path="qrcode" element={
            <ProtectedRoute>
              <QRCodePage />
            </ProtectedRoute>
          } />
          <Route path="analytics" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="history" element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App
