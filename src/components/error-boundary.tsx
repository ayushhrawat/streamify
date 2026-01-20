"use client";

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console for debugging
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Check if it's a database-related error
      const isDatabaseError = this.state.error?.message?.includes('database') || 
                             this.state.error?.stack?.includes('supabase');
      
      if (isDatabaseError) {
        return this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg max-w-md">
              <h2 className="text-lg font-semibold mb-2">🔧 Database Connection Issue</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                The app is running in demo mode with sample data.
              </p>
              <p className="text-xs text-gray-500">
                To enable full functionality, please check the setup instructions.
              </p>
              <button 
                onClick={() => this.setState({ hasError: false })}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Continue with Demo
              </button>
            </div>
          </div>
        );
      }
    }

    return this.props.children;
  }
}