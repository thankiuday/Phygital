/**
 * Pricing Page
 * Beautiful pricing page with three tiers and feature comparison
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Check, 
  X, 
  Sparkles,
  Zap,
  Crown,
  ArrowRight,
  Mail,
  Phone
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const PricingPage = () => {
  const { isAuthenticated } = useAuth()
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' or 'yearly'

  const plans = [
    {
      id: 'free',
      name: 'QR (Free)',
      tagline: 'Perfect for personal use',
      monthlyPrice: 0,
      yearlyPrice: 0,
      highlightColor: 'neon-blue',
      gradient: 'from-neon-blue to-neon-cyan',
      features: [
        'Dynamic QR codes',
        'Unlimited QR codes',
        'Unlimited scans',
        'Dynamic update',
        'Basic analytics'
      ],
      limitations: [
        'No video/AR hosting',
        'No AR features',
        'No custom branding',
        'No bulk creation',
        'No API access'
      ],
      cta: 'Get Started',
      ctaLink: isAuthenticated ? '/projects' : '/register',
      popular: false
    },
    {
      id: 'phygital',
      name: 'Phygital QR',
      tagline: 'Best for SMBs & AR & video storytelling',
      monthlyPrice: 14.99,
      yearlyPrice: 149,
      highlightColor: 'neon-purple',
      gradient: 'from-neon-purple to-neon-pink',
      features: [
        'Everything in Free',
        'Video/AR hosting (10 videos)',
        'Advanced analytics',
        'Custom branding',
        'Limited bulk creation'
      ],
      limitations: [
        'No AR Navigation',
        'No AR Search',
        'No AR Object scan',
        'No API integration',
        'No team access'
      ],
      cta: 'Start Free Trial',
      ctaLink: isAuthenticated ? '/projects' : '/register',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Phygital Enterprise',
      tagline: 'For enterprises & agencies',
      monthlyPrice: null,
      yearlyPrice: null,
      highlightColor: 'neon-pink',
      gradient: 'from-neon-pink to-neon-orange',
      features: [
        'Everything in Phygital QR',
        'Unlimited video/AR hosting',
        'AR Navigation',
        'AR Search',
        'AR Object scan (No QR needed)',
        'API integration',
        'Multi-user/team access',
        'Assign QR to customer email',
        'Exportable analytics reports',
        'Full white-label branding',
        'Bulk creation',
        'Priority support'
      ],
      limitations: [],
      cta: 'Contact Sales',
      ctaLink: '/contact',
      popular: false
    }
  ]

  const features = [
    { name: 'Price (monthly)', free: '$0', phygital: '$14.99', enterprise: 'Ask for Quote' },
    { name: 'Price (yearly)', free: '$0', phygital: '$149', enterprise: 'Ask for Quote' },
    { name: 'QR type', free: 'Dynamic', phygital: 'Dynamic', enterprise: 'Dynamic' },
    { name: 'No. of QR codes', free: 'Unlimited', phygital: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'No. of scans', free: 'Unlimited', phygital: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'Dynamic update', free: true, phygital: true, enterprise: true },
    { name: 'Video / AR hosting', free: false, phygital: 'Yes (10 videos)', enterprise: 'Unlimited' },
    { name: 'AR Navigation', free: false, phygital: false, enterprise: true },
    { name: 'AR Search', free: false, phygital: false, enterprise: true },
    { name: 'AR Object scan to redirect (No QR, your object is your QR)', free: false, phygital: false, enterprise: true },
    { name: 'Analytics', free: 'Basic', phygital: 'Advanced', enterprise: 'Advanced + exportable reports' },
    { name: 'Custom branding', free: false, phygital: true, enterprise: 'Full white-label' },
    { name: 'Bulk creation', free: false, phygital: 'Limited', enterprise: true },
    { name: 'API integration', free: false, phygital: false, enterprise: true },
    { name: 'Multi-user / team access', free: false, phygital: false, enterprise: 'Yes (team & client accounts)' },
    { name: 'Assign QR codes to customer email', free: false, phygital: false, enterprise: true },
    { name: 'Earn commission credit on customer upgrades', free: false, phygital: false, enterprise: false },
    { name: 'Best for', free: 'Personal use', phygital: 'SMBs (AR & video storytelling)', enterprise: 'Enterprises' }
  ]

  const getFeatureDisplay = (value) => {
    if (value === true) return <Check className="w-5 h-5 text-neon-green" />
    if (value === false) return <X className="w-5 h-5 text-slate-500" />
    return <span className="text-slate-300 text-sm">{value}</span>
  }

  const calculateYearlySavings = (monthlyPrice) => {
    if (!monthlyPrice) return null
    const yearlyFromMonthly = monthlyPrice * 12
    const savings = yearlyFromMonthly - 149
    const percentage = Math.round((savings / yearlyFromMonthly) * 100)
    return { amount: savings, percentage }
  }

  const savings = calculateYearlySavings(14.99)

  return (
    <div className="min-h-screen bg-dark-mesh">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 -top-48 -left-48 bg-neon-purple/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-neon-blue/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute w-96 h-96 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neon-pink/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32 relative z-10">
          <div className="text-center animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-slate-100 mb-6">
              Simple, Transparent
              <br />
              <span className="text-gradient animate-gradient bg-size-200">
                Pricing
              </span>
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 max-w-3xl mx-auto mb-12">
              Choose the perfect plan for your needs. Start free and upgrade as you grow.
            </p>

            {/* Billing Toggle - Only show for Phygital QR plan */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-slate-100' : 'text-slate-400'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                  billingCycle === 'yearly' ? 'bg-gradient-to-r from-neon-purple to-neon-pink' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-slate-100' : 'text-slate-400'}`}>
                Yearly
              </span>
              {billingCycle === 'yearly' && savings && (
                <span className="px-3 py-1 bg-gradient-to-r from-neon-green/20 to-neon-cyan/20 border border-neon-green/30 rounded-full text-sm font-semibold text-neon-green">
                  Save {savings.percentage}%
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="py-16 sm:py-24 relative -mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`card-glass p-6 sm:p-8 rounded-2xl border transition-all duration-300 hover:scale-105 relative animate-fade-in-up ${
                  plan.popular
                    ? plan.highlightColor === 'neon-purple'
                      ? 'border-neon-purple/50 shadow-glow-purple'
                      : plan.highlightColor === 'neon-blue'
                      ? 'border-neon-blue/50 shadow-glow-blue'
                      : 'border-neon-pink/50 shadow-glow-pink'
                    : 'border-slate-700/50 hover:border-slate-600/50'
                }`}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-neon-purple to-neon-pink text-white text-xs font-bold rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Icon */}
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${plan.gradient} p-0.5 mb-6`}>
                  <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                    {plan.id === 'free' && <Zap className="w-8 h-8 text-white" />}
                    {plan.id === 'phygital' && <Sparkles className="w-8 h-8 text-white" />}
                    {plan.id === 'enterprise' && <Crown className="w-8 h-8 text-white" />}
                  </div>
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                  {plan.name}
                </h3>
                <p className="text-slate-400 text-sm mb-6">{plan.tagline}</p>

                {/* Price */}
                <div className="mb-6">
                  {plan.monthlyPrice !== null ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-bold text-gradient">
                          ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                        </span>
                        {billingCycle === 'yearly' && plan.monthlyPrice > 0 && (
                          <span className="text-slate-400 text-sm line-through">
                            ${(plan.monthlyPrice * 12).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        {billingCycle === 'monthly' ? 'per month' : 'per year'}
                      </p>
                    </>
                  ) : (
                    <div className="text-3xl sm:text-4xl font-bold text-gradient">
                      Ask for Quote
                    </div>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-neon-green flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, idx) => (
                    <li key={`lim-${idx}`} className="flex items-start gap-3 opacity-60">
                      <X className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-400 text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link
                  to={plan.ctaLink}
                  className={`block w-full text-center font-semibold rounded-xl px-6 py-3 transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-neon-purple via-neon-pink to-neon-pink text-white hover:shadow-glow-lg hover:scale-105'
                      : plan.id === 'enterprise'
                      ? 'bg-slate-800/50 text-slate-200 border border-slate-600/50 hover:bg-slate-700 hover:border-neon-pink/50 hover:text-neon-pink'
                      : 'bg-slate-800/50 text-slate-200 border border-slate-600/50 hover:bg-slate-700 hover:border-neon-blue/50 hover:text-neon-blue'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 inline-block ml-2" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 sm:py-24 bg-slate-900/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              Compare <span className="text-gradient">Features</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
              See how our plans stack up against each other
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Feature</th>
                  <th className="text-center py-4 px-6 text-slate-300 font-semibold">QR (Free)</th>
                  <th className="text-center py-4 px-6 text-slate-300 font-semibold">Phygital QR</th>
                  <th className="text-center py-4 px-6 text-slate-300 font-semibold">Phygital Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr
                    key={index}
                    className={`border-b border-slate-800/50 ${
                      index % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-900/20'
                    } hover:bg-slate-800/40 transition-colors`}
                  >
                    <td className="py-4 px-6 text-slate-300 font-medium">{feature.name}</td>
                    <td className="py-4 px-6 text-center">{getFeatureDisplay(feature.free)}</td>
                    <td className="py-4 px-6 text-center">{getFeatureDisplay(feature.phygital)}</td>
                    <td className="py-4 px-6 text-center">{getFeatureDisplay(feature.enterprise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden space-y-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card-glass p-4 rounded-xl border border-slate-700/50"
              >
                <h4 className="text-slate-100 font-semibold mb-4">{feature.name}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-2">Free</p>
                    <div className="flex justify-center">{getFeatureDisplay(feature.free)}</div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-2">Phygital</p>
                    <div className="flex justify-center">{getFeatureDisplay(feature.phygital)}</div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-2">Enterprise</p>
                    <div className="flex justify-center">{getFeatureDisplay(feature.enterprise)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="card-glass p-8 sm:p-12 rounded-2xl border border-slate-700/50">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
              Still have questions?
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Our team is here to help you choose the right plan for your needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="btn-primary inline-flex items-center justify-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Us
              </Link>
              <a
                href="tel:+17049667158"
                className="btn-secondary inline-flex items-center justify-center"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PricingPage

