/**
 * Main React Application Entry Point
 * Sets up the React app with routing, authentication, and global providers
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './index.css'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// Register Service Worker for PWA functionality (optional)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      // Create a minimal inline service worker if external file not available
      const swCode = `
        const CACHE_NAME = 'phygital-v1';
        
        self.addEventListener('install', (event) => {
          console.log('Service Worker installing');
          self.skipWaiting();
        });
        
        self.addEventListener('activate', (event) => {
          console.log('Service Worker activating');
          event.waitUntil(self.clients.claim());
        });
        
        self.addEventListener('fetch', (event) => {
          // Simple cache-first strategy for static assets
          if (event.request.destination === 'script' || event.request.destination === 'style') {
            event.respondWith(
              caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((fetchResponse) => {
                  const responseClone = fetchResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                  });
                  return fetchResponse;
                });
              })
            );
          }
        });
      `;
      
      // Try external service worker first
      let registration;
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('✅ External Service Worker registered:', registration.scope);
      } catch (swError) {
        // Fallback to inline service worker
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
        console.log('✅ Inline Service Worker registered:', registration.scope);
        URL.revokeObjectURL(swUrl);
      }
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Service Worker updated');
            }
          });
        }
      });
      
    } catch (error) {
      console.log('ℹ️ Service Worker not available, app works fine without PWA features');
    }
  });
}

// Only use StrictMode in development
const AppWrapper = import.meta.env.DEV ? (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
) : (
  <QueryClientProvider client={queryClient}>
    <HashRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </HashRouter>
  </QueryClientProvider>
);

ReactDOM.createRoot(document.getElementById('root')).render(AppWrapper)
