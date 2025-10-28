/**
 * Contact Us Page Component
 * Contact form and company information
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
  AlertCircle
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
      details: ['info@metadigilabs.com'],
      description: 'Send us an email anytime'
    },
    {
      icon: MapPin,
      title: 'Our Location',
      details: ['South Carolina, United States'],
      description: 'MetaDigi Labs LLC'
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: ['Monday - Friday: 9AM - 6PM EST', 'Saturday: 10AM - 4PM EST'],
      description: 'We\'re here to help'
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
    <div className="min-h-screen bg-dark-mesh">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              Contact <span className="text-gradient-fire">Us</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl">
              Have questions? Need help? We're here to assist you on your phygital journey. 
              Reach out to us anytime!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="card-elevated">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-100 mb-2">
                  Send us a Message
                </h2>
                <p className="text-slate-300">
                  Fill out the form below and we'll get back to you within 24 hours.
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
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <div className="card-elevated">
              <h3 className="text-xl font-semibold text-slate-100 mb-4">
                Get in Touch
              </h3>
              <div className="space-y-4">
                {contactInfo.map((info, index) => {
                  const Icon = info.icon
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-neon-blue/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-neon-blue" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-100 mb-1">
                          {info.title}
                        </h4>
                        {info.details.map((detail, idx) => (
                          <p key={idx} className="text-sm text-slate-300">
                            {detail}
                          </p>
                        ))}
                        <p className="text-xs text-slate-400 mt-1">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="card-elevated">
              <h3 className="text-xl font-semibold text-slate-100 mb-4">
                Frequently Asked Questions
              </h3>
              <div className="space-y-4">
                {faqs.slice(0, 3).map((faq, index) => (
                  <div key={index} className="border-b border-slate-700/50 pb-3 last:border-b-0">
                    <h4 className="font-medium text-slate-100 mb-1 text-sm">
                      {faq.question}
                    </h4>
                    <p className="text-xs text-slate-300">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-400">
                  Have more questions? <span className="text-neon-blue">View all FAQs</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactPage
