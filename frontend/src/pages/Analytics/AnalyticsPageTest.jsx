/**
 * Test Analytics Page - Minimal version to test routing
 */

import React from 'react'

const AnalyticsPageTest = () => {
  console.log('🔴 TEST: AnalyticsPageTest component rendering...')
  
  return (
    <div style={{ padding: '20px', background: '#1e1e1e', color: 'white', minHeight: '100vh' }}>
      <h1>Analytics Page Test</h1>
      <p>If you see this, routing is working!</p>
    </div>
  )
}

export default AnalyticsPageTest

