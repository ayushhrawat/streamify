"use client";

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ClerkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a Clerk JWT/clock skew error
    if (error.message.includes('token-iat-in-the-future') || 
        error.message.includes('infinite redirect loop') ||
        error.message.includes('JWT')) {
      console.warn('Clerk authentication error detected:', error.message);
      return { hasError: true, error };
    }
    
    // For other errors, don't catch them
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Clerk Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    // Clear Clerk session data and reload
    if (typeof window !== 'undefined') {
      // Clear Clerk cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        if (name.trim().startsWith('__clerk') || name.trim().startsWith('__session')) {
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
      });
      
      // Clear localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('clerk')) {
          localStorage.removeItem(key);
        }
      });
      
      // Reload the page
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                Authentication Error
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                There's an issue with your authentication session. This is likely due to a system clock synchronization problem.
              </p>
              <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Quick Fix:</strong> Please check your system date and time settings. 
                  Your system clock appears to be set incorrectly (showing 2025).
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Clear Session & Retry
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This will clear your authentication session and reload the page.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ClerkErrorBoundary;