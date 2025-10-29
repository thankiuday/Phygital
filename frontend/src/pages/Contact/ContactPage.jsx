/**
 * Phygital Zone - Contact Page
 * Let's Start a Conversation
 * Connect with us and bring your vision to life
 */

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Sparkles,
  Heart,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../utils/api'

const ContactPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm()

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true)
      
      // Submit to backend API
      const response = await api.post('/contact/submit', data)
      
      if (response.data.status === 'success') {
        toast.success(response.data.message || 'Thank you for contacting us! We\'ll get back to you soon.')
        reset()
      } else {
        throw new Error(response.data.message || 'Failed to send message')
      }
    } catch (error) {
      console.error('Contact form error:', error)
      toast.error(error.response?.data?.message || 'Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email Us',
      details: ['phygital.zone@gmail.com'],
      description: 'Send us an email anytime',
      gradient: 'from-neon-blue to-neon-cyan'
    },
    {
      icon: MapPin,
      title: 'Our Location',
      details: ['South Carolina, United States'],
      description: 'MetaDigi Labs LLC',
      gradient: 'from-neon-purple to-neon-pink'
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: ['Monday - Friday: 9AM - 6PM EST', 'Saturday: 10AM - 4PM EST'],
      description: 'We\'re here to help',
      gradient: 'from-neon-green to-neon-cyan'
    }
  ]

  const reasons = [
    {
      icon: MessageCircle,
      title: 'Quick Responses',
      description: 'We typically respond within 24 hours',
      color: 'neon-blue'
    },
    {
      icon: Heart,
      title: 'Personal Touch',
      description: 'Real humans, real conversations',
      color: 'neon-pink'
    },
    {
      icon: Zap,
      title: 'Solutions-Focused',
      description: 'We\'re here to make things happen',
      color: 'neon-green'
    }
  ]

  const faqs = [
    {
      question: 'How do I get started with Phygital?',
      answer: 'Simply sign up for a free account, upload your design, and follow our 5-step process to create your first phygital experience.'
    },
    {
      question: 'What file formats do you support?',
      answer: 'We support JPG/JPEG images (max 20MB) and MP4 videos (max 50MB) for the best quality and compatibility.'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes! We offer a completely free tier that allows you to create and manage multiple projects with full access to all features.'
    },
    {
      question: 'How does the AR technology work?',
      answer: 'Our platform uses advanced computer vision to detect QR codes and overlay digital content in real-time through your device\'s camera.'
    },
    {
      question: 'Can I track analytics for my projects?',
      answer: 'Absolutely! Our analytics dashboard provides detailed insights into scans, video views, and user engagement with your content.'
    },
    {
      question: 'Do you offer customer support?',
      answer: 'Yes, we provide 24/7 customer support via email and live chat. Our team is always ready to help you succeed.'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 via-neon-purple/10 to-neon-pink/10 animate-gradient"></div>
          <div className="absolute top-20 -left-20 md:left-20 w-64 h-64 md:w-96 md:h-96 bg-neon-blue/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 -right-20 md:right-20 w-64 h-64 md:w-96 md:h-96 bg-neon-purple/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="mb-6 inline-block">
            <span className="px-4 py-2 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 rounded-full text-neon-blue text-sm font-medium backdrop-blur-sm">
              Get in Touch
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-100 mb-6 leading-tight">
            Let's Start a <br className="hidden sm:block" />
            <span className="text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">Conversation</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Have questions? Ideas? Feedback? We're here to listen and help you bring your <span className="text-neon-blue font-semibold">phygital vision</span> to life.
          </p>

          {/* Quick Reasons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-12">
            {reasons.map((reason, index) => {
              const Icon = reason.icon
              return (
                <div key={index} className="flex flex-col items-center gap-2 p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50">
                  <Icon className={`w-6 h-6 text-${reason.color}`} />
                  <h3 className="text-sm font-semibold text-slate-100">{reason.title}</h3>
                  <p className="text-xs text-slate-400">{reason.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Floating Elements */}
        <div className="hidden md:block absolute bottom-10 left-10 animate-float opacity-20">
          <MessageCircle className="w-24 h-24 text-neon-blue" />
        </div>
        <div className="hidden md:block absolute top-10 right-10 animate-float opacity-20" style={{ animationDelay: '1s' }}>
          <Sparkles className="w-20 h-20 text-neon-purple" />
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="relative group">
                <div className="card-elevated p-8 sm:p-10 rounded-3xl border border-slate-600/50 hover:border-neon-blue/50 transition-all duration-500 overflow-hidden">
                  {/* Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 via-neon-purple/5 to-neon-pink/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="mb-8">
                      <div className="inline-flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 rounded-xl">
                          <Send className="w-6 h-6 text-neon-blue" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
                          Send us a Message
                        </h2>
                      </div>
                      <p className="text-slate-300">
                        Fill out the form below and we'll get back to you <span className="text-neon-blue font-semibold">within 24 hours</span>.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="label">
                      First Name
                    </label>
                    <input
                      {...register('firstName', { required: 'First name is required' })}
                      type="text"
                      className={`input w-full ${errors.firstName ? 'input-error' : ''}`}
                      placeholder="Enter your first name"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-neon-red flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="label">
                      Last Name
                    </label>
                    <input
                      {...register('lastName', { required: 'Last name is required' })}
                      type="text"
                      className={`input w-full ${errors.lastName ? 'input-error' : ''}`}
                      placeholder="Enter your last name"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-neon-red flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="label">
                    Email Address
                  </label>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    type="email"
                    className={`input w-full ${errors.email ? 'input-error' : ''}`}
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-neon-red flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="subject" className="label">
                    Subject
                  </label>
                  <input
                    {...register('subject', { required: 'Subject is required' })}
                    type="text"
                    className={`input w-full ${errors.subject ? 'input-error' : ''}`}
                    placeholder="What's this about?"
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-neon-red flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.subject.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="message" className="label">
                    Message
                  </label>
                  <textarea
                    {...register('message', { 
                      required: 'Message is required',
                      minLength: {
                        value: 10,
                        message: 'Message must be at least 10 characters'
                      }
                    })}
                    rows={6}
                    className={`input w-full resize-none ${errors.message ? 'input-error' : ''}`}
                    placeholder="Tell us how we can help you..."
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-neon-red flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.message.message}
                    </p>
                  )}
                </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="group w-full px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-semibold text-lg shadow-glow-blue hover:shadow-glow-purple transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            Send Message
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              {/* Contact Info Cards */}
              <div className="space-y-4">
                {contactInfo.map((info, index) => {
                  const Icon = info.icon
                  return (
                    <div key={index} className="group relative p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-neon-blue/50 transition-all duration-500 hover:scale-105">
                      <div className={`absolute inset-0 bg-gradient-to-br ${info.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`}></div>
                      
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="flex-shrink-0 p-3 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl group-hover:shadow-glow transition-all duration-300">
                          <Icon className="w-6 h-6 text-neon-blue group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-100 mb-2">
                            {info.title}
                          </h4>
                          {info.details.map((detail, idx) => (
                            <p key={idx} className="text-sm text-slate-300 mb-1">
                              {detail}
                            </p>
                          ))}
                          <p className="text-xs text-slate-400 mt-2">
                            {info.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* FAQ Section */}
              <div className="p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-5 h-5 text-neon-green" />
                  <h3 className="text-lg font-semibold text-slate-100">
                    Quick Answers
                  </h3>
                </div>
                <div className="space-y-4">
                  {faqs.slice(0, 3).map((faq, index) => (
                    <div key={index} className="border-b border-slate-700/50 pb-3 last:border-b-0 last:pb-0">
                      <h4 className="font-medium text-slate-100 mb-2 text-sm">
                        {faq.question}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-400">
                    Need more help? <span className="text-neon-blue font-semibold cursor-pointer hover:underline">View all FAQs</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 sm:py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 via-neon-purple/20 to-neon-pink/20 animate-gradient"></div>
        <div className="absolute top-10 -left-20 md:left-10 w-64 h-64 md:w-96 md:h-96 bg-neon-blue/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 -right-20 md:right-10 w-64 h-64 md:w-96 md:h-96 bg-neon-purple/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 rounded-full backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-neon-blue animate-pulse" />
              <span className="text-neon-blue font-semibold">We're Here to Help</span>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-100 mb-6">
            Ready to Bring Your <br className="hidden sm:block" />
            <span className="text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
              Vision to Life?
            </span>
          </h2>
          
          <p className="text-lg sm:text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Whether you have a question, need support, or want to explore what's possible — we're just a message away.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="mailto:phygital.zone@gmail.com"
              className="group px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-semibold text-lg shadow-glow-blue hover:shadow-glow-purple transition-all duration-300 flex items-center gap-2"
            >
              <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Email Us Directly
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ContactPage
