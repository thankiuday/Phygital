/**
 * Main App Component
 * Handles routing and layout for the entire application
 * Includes protected routes and public routes
 */

import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import AdminProtectedRoute from './components/Admin/AdminProtectedRoute'
import AdminLayout from './components/Admin/AdminLayout'
import LoadingSpinner from './components/UI/LoadingSpinner'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import OAuthCallback from './pages/Auth/OAuthCallback'
import DashboardPage from './pages/Dashboard/DashboardPage'
import GameUploadPage from './pages/Upload/GameUploadPage'
import QRCodePage from './pages/QRCode/QRCodePage'
import QRScanPage from './pages/QRScan/QRScanPage'
import ARExperiencePage from './pages/ARExperience/ARExperiencePage'
import ARExperience3DPage from './pages/ARExperience/ARExperience3DPage'
import QRLinksARVideoExperiencePage from './pages/ARExperience/QRLinksARVideoExperiencePage'
import AnalyticsPage from './pages/Analytics/AnalyticsPageWrapper'
import CampaignAnalyticsPage from './pages/Analytics/CampaignAnalyticsPage'
import TemplatesPage from './pages/Templates/TemplatesPage'
import ProfilePage from './pages/Profile/ProfilePage'
import UserPage from './pages/User/UserPage'
import HistoryPage from './pages/History/HistoryPage'
import ProjectsPage from './pages/Projects/ProjectsPage' // New combined page
import QRLinkPage from './pages/Phygitalized/QRLinkPage'
import QRLinksPage from './pages/Phygitalized/QRLinksPage'
import QRLinksVideoPage from './pages/Phygitalized/QRLinksVideoPage'
import QRLinksPDFVideoPage from './pages/Phygitalized/QRLinksPDFVideoPage'
import QRLinksARVideoPage from './pages/Phygitalized/QRLinksARVideoPage'
import LandingPage from './pages/Phygitalized/LandingPage'
import QRRedirectPage from './pages/Phygitalized/QRRedirectPage'
import AboutPage from './pages/About/AboutPage'
import ContactPage from './pages/Contact/ContactPage'
import AIVideoPage from './pages/AIVideo/AIVideoPage'
import ScanPage from './pages/ScanPage'
import ComingSoonPage from './pages/ComingSoon/ComingSoonPage'
import NotFoundPage from './pages/NotFoundPage'
import MaintenancePage from './pages/Maintenance/MaintenancePage'
import CertificationPage from './pages/Legal/CertificationPage'

// Admin Pages
import AdminLoginPage from './pages/Admin/AdminLoginPage'
import AdminDashboard from './pages/Admin/AdminDashboard'
import UsersPage from './pages/Admin/UsersPage'
import AdminProjectsPage from './pages/Admin/ProjectsPage'
import AdminAnalyticsPage from './pages/Admin/AdminAnalyticsPage'
import ContactsPage from './pages/Admin/ContactsPage'
import SettingsPage from './pages/Admin/SettingsPage'

// Maintenance mode check
import { isMaintenanceModeEnabled } from './config/maintenance'

function App() {
  const { isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  // Check if maintenance mode is enabled
  const maintenanceMode = isMaintenanceModeEnabled()
  
  // Allow admin routes even during maintenance
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('#/admin')

  // Show maintenance page if enabled (but allow admin routes)
  if (maintenanceMode && !isAdminRoute) {
    return <MaintenancePage />
  }

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
          <Route path="auth/callback" element={<OAuthCallback />} />
          <Route path="forgot-password" element={<ComingSoonPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="ai-video" element={<AIVideoPage />} />
          <Route path="pricing" element={<ComingSoonPage />} />
          <Route path="blog" element={<ComingSoonPage />} />
          <Route path="careers" element={<ComingSoonPage />} />
          <Route path="certification" element={<CertificationPage />} />
          <Route path="terms" element={<ComingSoonPage />} />
          <Route path="privacy" element={<ComingSoonPage />} />
          <Route path="docs" element={<ComingSoonPage />} />
          <Route path="help" element={<ComingSoonPage />} />
          <Route path="user/:username" element={<UserPage />} />
          <Route path="phygitalized/links/:pageId" element={<LandingPage />} />
          <Route path="phygitalized/video/:pageId" element={<LandingPage />} />
          <Route path="phygitalized/pdf-video/:pageId" element={<LandingPage />} />
          <Route path="phygitalized/redirect/:projectId" element={<QRRedirectPage />} />
          <Route path="ar-experience/:pageId" element={<LandingPage />} />
          <Route path="scan/:userId" element={<QRScanPage />} />
          <Route path="scan/project/:projectId" element={<QRScanPage />} />
          <Route path="scan/:id" element={<ScanPage />} />
          {/* New URL structure: /ar/user/{userId}/project/{projectId} */}
          <Route path="ar/user/:userId/project/:projectId" element={<ARExperiencePage />} />
          {/* QR Links AR Video Experience - Full-screen camera */}
          <Route path="ar/qr-links-ar-video/user/:userId/project/:projectId" element={<QRLinksARVideoExperiencePage />} />
          {/* Legacy routes for backward compatibility */}
          <Route path="ar/:userId" element={<ARExperiencePage />} />
          <Route path="ar/project/:projectId" element={<ARExperiencePage />} />
          {/* 3D AR Experience with vertical video standee and popup animation */}
          <Route path="ar-3d/user/:userId/project/:projectId" element={<ARExperience3DPage />} />
          <Route path="ar-3d/:userId/:projectId" element={<ARExperience3DPage />} />
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
          <Route path="analytics/campaign/:projectId" element={
            <ProtectedRoute>
              <CampaignAnalyticsPage />
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
          <Route path="projects" element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          } />
          <Route path="templates" element={
            <ProtectedRoute>
              <TemplatesPage />
            </ProtectedRoute>
          } />
          <Route path="phygitalized/qr-link" element={
            <ProtectedRoute>
              <QRLinkPage />
            </ProtectedRoute>
          } />
          <Route path="phygitalized/qr-links" element={
            <ProtectedRoute>
              <QRLinksPage />
            </ProtectedRoute>
          } />
          <Route path="phygitalized/qr-links-video" element={
            <ProtectedRoute>
              <QRLinksVideoPage />
            </ProtectedRoute>
          } />
          <Route path="phygitalized/qr-links-pdf-video" element={
            <ProtectedRoute>
              <QRLinksPDFVideoPage />
            </ProtectedRoute>
          } />
          <Route path="phygitalized/qr-links-ar-video" element={
            <ProtectedRoute>
              <QRLinksARVideoPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="login" element={<AdminLoginPage />} />
          <Route path="dashboard" element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } />
          <Route path="users" element={
            <AdminProtectedRoute>
              <UsersPage />
            </AdminProtectedRoute>
          } />
          <Route path="projects" element={
            <AdminProtectedRoute>
              <AdminProjectsPage />
            </AdminProtectedRoute>
          } />
          <Route path="analytics" element={
            <AdminProtectedRoute>
              <AdminAnalyticsPage />
            </AdminProtectedRoute>
          } />
          <Route path="contacts" element={
            <AdminProtectedRoute>
              <ContactsPage />
            </AdminProtectedRoute>
          } />
          <Route path="settings" element={
            <AdminProtectedRoute>
              <SettingsPage />
            </AdminProtectedRoute>
          } />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App
