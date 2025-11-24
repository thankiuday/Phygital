/**
 * Certification Page Component
 * Displays the user certification and agreement content
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, FileText } from 'lucide-react'

const CertificationPage = () => {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-48 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -left-48 w-96 h-96 bg-neon-pink/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-neon-purple transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Registration</span>
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-pink blur-xl opacity-50"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-neon-purple via-neon-pink to-neon-blue rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-2">
                User Certification & Agreement
              </h1>
              <p className="text-slate-400 text-sm sm:text-base">
                Required to create an account on phygital.zone
              </p>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 sm:p-10 shadow-2xl">
          {/* Introduction */}
          <div className="mb-8 p-6 bg-slate-900/50 border border-slate-700/50 rounded-xl">
            <div className="flex items-start gap-4">
              <FileText className="w-6 h-6 text-neon-blue flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-3">
                  I certify and agree to all of the following (required to create an account):
                </h2>
                <p className="text-slate-300 leading-relaxed">
                  By checking this box and using phygital.zone (the "Service"), I represent, warrant, and certify under penalty of perjury as follows:
                </p>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* Section 1 */}
            <div className="border-l-4 border-neon-purple pl-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <span className="text-neon-purple">1.</span>
                <span>Legality of All Content</span>
              </h3>
              <p className="text-slate-300 leading-relaxed">
                All content I upload, post, submit, share, or otherwise make available ("User Content") complies with all applicable U.S. federal, state, and local laws, and does not violate any law in any jurisdiction where it is uploaded, stored, accessed, or viewed.
              </p>
            </div>

            {/* Section 2 */}
            <div className="border-l-4 border-neon-pink pl-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <span className="text-neon-pink">2.</span>
                <span>Prohibited Illegal or Harmful Content</span>
              </h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                My User Content does NOT contain, depict, promote, or facilitate any of the following:
              </p>
              <ul className="space-y-2 text-slate-300 ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Child sexual abuse material (CSAM) or any sexualized depiction of minors (18 U.S.C. §§ 2251–2260A)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Obscene material as defined under Miller v. California and 18 U.S.C. § 1461</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Non-consensual intimate images ("revenge porn") (18 U.S.C. § 2261A and state laws)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Terrorism, violent extremism, or material supporting or facilitating terrorism (18 U.S.C. §§ 2339A–2339B)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Credible threats, stalking, harassment, or cyberstalking (18 U.S.C. §§ 875, 2261A)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Fraud, phishing, scams, impersonation, or identity theft</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Illegal drugs, controlled substances, or unlicensed pharmaceuticals</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Illegal weapons, explosives, or prohibited dangerous items</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Human trafficking, exploitation, or coerced content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Defamation, libel, or knowingly false statements about any person or entity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Content violating U.S. export controls (EAR/ITAR) or OFAC sanctions</span>
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="border-l-4 border-neon-blue pl-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <span className="text-neon-blue">3.</span>
                <span>Intellectual Property & Third-Party Rights</span>
              </h3>
              <p className="text-slate-300 leading-relaxed">
                I confirm that I own or have all necessary rights, permissions, and licenses to upload my User Content and to grant phygital.zone the rights described in the Terms of Service. My content does not infringe any copyright, trademark, patent, trade secret, privacy right, publicity right, or other third-party right.
              </p>
            </div>

            {/* Section 4 */}
            <div className="border-l-4 border-neon-cyan pl-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <span className="text-neon-cyan">4.</span>
                <span>No Deceptive or Misleading Content</span>
              </h3>
              <p className="text-slate-300 leading-relaxed">
                My User Content is not false, deceptive, misleading, or fraudulent. It does not violate the Computer Fraud and Abuse Act, the CAN-SPAM Act, the FTC Act, or any state consumer-protection laws.
              </p>
            </div>

            {/* Section 5 */}
            <div className="border-l-4 border-neon-purple pl-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <span className="text-neon-purple">5.</span>
                <span>Age and Legal Capacity</span>
              </h3>
              <p className="text-slate-300 leading-relaxed">
                I am at least 18 years old (or the legal age of majority in my jurisdiction) and have full legal capacity to enter into this agreement.
              </p>
            </div>

            {/* Section 6 */}
            <div className="border-l-4 border-neon-pink pl-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <span className="text-neon-pink">6.</span>
                <span>Phygital.zone's Right to Remove Content & Terminate Accounts</span>
              </h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                I acknowledge that phygital.zone may, at its sole and absolute discretion and without prior notice or liability:
              </p>
              <ul className="space-y-2 text-slate-300 ml-6 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Remove, delete, block, or disable any User Content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Suspend or permanently terminate my account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Preserve or disclose my User Content and account information to:</span>
                </li>
              </ul>
              <ul className="space-y-2 text-slate-300 ml-12 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-slate-500 mt-1">◦</span>
                  <span>law enforcement,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-500 mt-1">◦</span>
                  <span>the National Center for Missing & Exploited Children (NCMEC), or</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-500 mt-1">◦</span>
                  <span>other third parties as required or permitted by law</span>
                </li>
              </ul>
              <p className="text-slate-300 leading-relaxed">
                I waive all rights to advance notice, explanation, appeal, or compensation relating to such actions.
              </p>
            </div>

            {/* Section 7 */}
            <div className="border-l-4 border-neon-blue pl-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <span className="text-neon-blue">7.</span>
                <span>Consequences of Violation</span>
              </h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                I understand that uploading illegal or prohibited content may result in:
              </p>
              <ul className="space-y-2 text-slate-300 ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Immediate account termination</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Permanent banning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Civil liability</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Criminal prosecution</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-cyan mt-1">•</span>
                  <span>Mandatory reporting to law enforcement and NCMEC (18 U.S.C. § 2258A)</span>
                </li>
              </ul>
            </div>

            {/* Final Statement */}
            <div className="mt-10 p-6 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 rounded-xl">
              <p className="text-slate-300 leading-relaxed mb-4">
                This certification is made under penalty of perjury under the laws of the United States and the State of Delaware (or my state of residence or incorporation). I understand that knowingly false statements may violate 18 U.S.C. § 1001 and other federal and state laws.
              </p>
              <p className="text-slate-300 leading-relaxed">
                I have read and agree to the phygital.zone Terms of Service and Community Guidelines.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-10 pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-semibold rounded-xl shadow-lg hover:shadow-neon-purple/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Registration
            </Link>
            <div className="text-sm text-slate-400">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CertificationPage

