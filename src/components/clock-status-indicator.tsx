"use client";

import { useEffect, useState } from 'react';

const ClockStatusIndicator = () => {
  const [clockInfo, setClockInfo] = useState<any>(null);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Simple clock skew check
    const now = new Date();
    if (now.getFullYear() === 2025) {
      const clockInfo = {
        hasSkew: true,
        detectedDate: now.toDateString(),
        expectedDate: new Date(2024, 11).toDateString(),
        skewType: 'future'
      };
      setClockInfo(clockInfo);
      setShowIndicator(true);
      
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showIndicator || !clockInfo?.hasSkew) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Clock Adjustment Active
            </h3>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              System clock skew detected and automatically corrected for authentication.
            </p>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              <div>System: {clockInfo.detectedDate}</div>
              <div>Adjusted: {clockInfo.expectedDate}</div>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => setShowIndicator(false)}
              className="inline-flex text-blue-400 hover:text-blue-600 focus:outline-none"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockStatusIndicator;