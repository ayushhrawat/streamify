"use client";

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

const ClockCheck = () => {
  const [clockSkew, setClockSkew] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkClockSkew = async () => {
      try {
        // Get server time from a reliable source
        const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
        const data = await response.json();
        const serverTime = new Date(data.utc_datetime).getTime();
        const clientTime = new Date().getTime();
        
        const skew = Math.abs(clientTime - serverTime);
        setClockSkew(skew);
        
        // Show warning if skew is more than 5 minutes (300,000 ms)
        if (skew > 300000) {
          setShowWarning(true);
        }
      } catch (error) {
        console.warn('Could not check clock skew:', error);
      }
    };

    checkClockSkew();
  }, []);

  if (!showWarning) return null;

  const skewMinutes = clockSkew ? Math.round(clockSkew / 60000) : 0;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Clock Synchronization Issue
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>
                Your system clock is off by approximately {skewMinutes} minutes. 
                This may cause authentication issues.
              </p>
            </div>
            <div className="mt-3">
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowWarning(false)}
                  className="text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded hover:bg-yellow-200 dark:hover:bg-yellow-700"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open('ms-settings:dateandtime', '_blank');
                    }
                  }}
                  className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                >
                  Fix Clock
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockCheck;