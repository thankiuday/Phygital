/**
 * Analytics Page Wrapper with Error Boundary
 * Catches any errors during render and displays them
 */

import React from 'react'
import AnalyticsPage from './AnalyticsPage'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ AnalyticsPage Error:', error)
    console.error('❌ Error Info:', errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-100 mb-4">Error Loading Analytics Page</h1>
              <p className="text-slate-300 mb-2">{this.state.error?.message || 'An error occurred'}</p>
              <details className="text-left mt-4 p-4 bg-slate-800 rounded-lg text-sm text-slate-400">
                <summary className="cursor-pointer text-slate-300 mb-2">Error Details</summary>
                <pre className="whitespace-pre-wrap mt-2">
                  {this.state.error?.stack}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
              <button 
                onClick={() => window.location.reload()} 
                className="btn-primary mt-4"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const AnalyticsPageWrapper = () => {
  console.log('🟢 AnalyticsPageWrapper rendering...')
  
  try {
    return (
      <ErrorBoundary>
        <AnalyticsPage />
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('❌ Error in AnalyticsPageWrapper:', error)
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-100 mb-4">Error Loading Analytics Page</h1>
            <p className="text-slate-300 mb-4">{error.message || 'An error occurred'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default AnalyticsPageWrapper

