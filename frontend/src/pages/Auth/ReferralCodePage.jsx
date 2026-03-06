import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authAPI } from '../../utils/api'
import { Sparkles, QrCode, CheckCircle2, ArrowRight } from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'

const ReferralCodePage = () => {
  const { isAuthenticated, refreshUserData } = useAuth()
  const navigate = useNavigate()
  const [hasCodeFlow, setHasCodeFlow] = useState(false)
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSkip = () => {
    navigate('/dashboard', { replace: true })
  }

  const handleSubmitCode = async (e) => {
    e.preventDefault()
    if (!code.trim()) {
      setError('Please enter your referral code')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await authAPI.redeemReferralCode(code.trim())
      await refreshUserData()
      navigate('/phygital-qr', { replace: true })
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid or already used referral code'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative w-full max-w-md">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-neon-purple/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-neon-blue/20 rounded-full blur-3xl" />

        <div className="relative bg-slate-900/70 border border-slate-700/60 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neon-blue uppercase tracking-wide">
                Unlock Phygital QR
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-50">
                Do you have a referral code?
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-300 mb-6">
            Use a referral code from the Phygital team to instantly unlock all Phygital QR features
            on your account. If you don&apos;t have a code, you can continue with the free Dynamic QR plan.
          </p>

          {!hasCodeFlow ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setHasCodeFlow(true)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/70 border border-neon-purple/60 text-slate-50 hover:bg-slate-800 hover:border-neon-purple transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-neon-purple/20">
                    <Sparkles className="w-5 h-5 text-neon-purple" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Yes, I have a referral code</p>
                    <p className="text-xs text-slate-300">
                      Enter your code to unlock full Phygital access
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-200" />
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-slate-200 hover:bg-slate-800/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800/80">
                    <CheckCircle2 className="w-5 h-5 text-neon-green" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">No, continue without a code</p>
                    <p className="text-xs text-slate-400">
                      Start with Dynamic QR (Free Forever). You can upgrade later.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitCode} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Referral Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter your referral code"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-blue/60 focus:border-neon-blue"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-xs text-red-200">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-sm font-medium text-slate-200 hover:bg-slate-800/60 transition-all"
                >
                  Skip for now
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 transition-all"
                >
                  {isSubmitting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      Apply Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReferralCodePage

