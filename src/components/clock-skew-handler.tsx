"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

const ClockSkewHandler = () => {
  const [showError, setShowError] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [clockInfo, setClockInfo] = useState<any>(null);
  const { signOut } = useAuth();

  useEffect(() => {
    // Simple clock skew check on component mount
    const now = new Date();
    if (now.getFullYear() === 2025) {
      const clockInfo = {
        hasSkew: true,
        detectedDate: now.toDateString(),
        expectedDate: new Date(2024, 11).toDateString(),
        skewType: 'future'
      };
      setClockInfo(clockInfo);
      setShowError(true);
    }

    // Check for clock skew errors in console
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('token-iat-in-the-future') || 
          message.includes('Clock skew detected')) {
        const now = new Date();
        const clockInfo = {
          hasSkew: true,
          detectedDate: now.toDateString(),
          expectedDate: new Date(2024, 11).toDateString(),
          skewType: 'future'
        };
        setClockInfo(clockInfo);
        setShowError(true);
      }
      originalConsoleError.apply(console, args);
    };

    // Listen for authentication errors
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('token-iat-in-the-future') ||
          event.message?.includes('Clock skew')) {
        const now = new Date();
        const clockInfo = {
          hasSkew: true,
          detectedDate: now.toDateString(),
          expectedDate: new Date(2024, 11).toDateString(),
          skewType: 'future'
        };
        setClockInfo(clockInfo);
        setShowError(true);
      }
    };

    window.addEventListener('error', handleError);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('error', handleError);
    };
  }, []);

  const handleClearSession = async () => {
    setIsFixing(true);
    try {
      // Clear all Clerk data
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
      });

      // Sign out from Clerk
      await signOut();
      
      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('Error clearing session:', error);
      window.location.reload();
    }
  };

  if (!showError) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            System Clock Issue Detected
          </h3>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Your system clock appears to be set incorrectly{clockInfo ? ` (showing ${clockInfo.detectedDate})` : ''}. 
            This is preventing authentication from working properly.
          </p>
          
          {clockInfo && (
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div><strong>Detected:</strong> {clockInfo.detectedDate}</div>
              <div><strong>Expected:</strong> {clockInfo.expectedDate}</div>
              <div><strong>Issue:</strong> Clock is {clockInfo.skewType === 'future' ? 'ahead' : 'behind'}</div>
            </div>
          )}
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Quick Fix:</strong> Right-click your Windows clock → "Adjust date/time" → 
              Turn off then on "Set time automatically"
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleClearSession}
              disabled={isFixing}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isFixing ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Clearing Session...
                </div>
              ) : (
                'Clear Session & Reload'
              )}
            </button>
            
            <button
              onClick={() => setShowError(false)}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Dismiss (Temporary)
            </button>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            This will clear your authentication session and reload the page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClockSkewHandler;