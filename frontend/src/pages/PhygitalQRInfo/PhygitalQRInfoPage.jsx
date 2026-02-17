/**
 * Phygital QR Info Page
 * Shown when Phygital QR is locked: contact admin + explanation of Phygital QR vs Dynamic QR
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { Lock, Mail, Sparkles, QrCode, ArrowRight, CheckCircle } from 'lucide-react'

const PhygitalQRInfoPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Contact Admin CTA */}
        <div className="bg-amber-900/30 border border-amber-600/50 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl flex-shrink-0">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-100 mb-2">
                Phygital QR is currently locked
              </h1>
              <p className="text-slate-300 mb-4">
                To get access to Phygital QR campaigns, please contact the admin. We'll enable the feature for your account and guide you through setup.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold hover:opacity-90 transition-opacity"
              >
                <Mail className="w-4 h-4" />
                Contact Admin
              </Link>
            </div>
          </div>
        </div>

        {/* What is Phygital QR */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            What is Phygital QR?
          </h2>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-slate-300 space-y-3">
            <p>
              <strong className="text-slate-100">Phygital QR</strong> combines a physical design (e.g. poster, packaging, sticker) with a QR code that opens an <strong className="text-slate-100">augmented reality (AR) experience</strong> on the user's phone.
            </p>
            <p>
              When someone scans the QR code, they see your design on screen and can point their camera at the same design in the real world to trigger video, 3D, or interactive content overlaid in AR. It bridges physical and digital in one campaign.
            </p>
          </div>
        </section>

        {/* How it differs from Dynamic QR */}
        <section>
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-neon-blue" />
            How is Phygital QR different from Dynamic QR?
          </h2>
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="font-semibold text-slate-100 mb-2">Dynamic QR (free)</h3>
              <ul className="text-slate-400 text-sm space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Scans open a <strong className="text-slate-300">landing page</strong> (links, video, PDFs) in the browser.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>No camera or AR; experience is on a single web page.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Works with any QR code; no need to print a specific design.</span>
                </li>
              </ul>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-slate-500 rotate-90 sm:rotate-0" />
            </div>
            <div className="bg-slate-800/50 border border-amber-600/30 rounded-xl p-5">
              <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Phygital QR
              </h3>
              <ul className="text-slate-400 text-sm space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Scans open an <strong className="text-slate-300">AR experience</strong>: user points the camera at your printed design to see overlays (video, 3D, etc.).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Requires a <strong className="text-slate-300">design file</strong> (poster, pack, sticker) and QR position so the app can recognize the trigger image.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Best for events, product packaging, and campaigns where the physical item is part of the experience.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <div className="mt-8 text-center">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-medium"
          >
            <Mail className="w-4 h-4" />
            Contact admin to get access
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PhygitalQRInfoPage
