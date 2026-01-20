"use client";

import { useEffect, useState } from 'react';

const LoadingFallback = () => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Show fallback after 10 seconds of loading
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  if (!showFallback) return null;

  const handleReload = () => {
    window.location.reload();
  };

  const handleClearData = () => {
    // Clear all browser data
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
      <div className="text-center max-w-md mx-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Taking longer than expected...
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          The application is taking a while to load. This might be due to a system clock issue.
        </p>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-6">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            <strong>Clock Issue?</strong> Check if your system date is set to 2025. 
            It should be December 2024.
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={handleClearData}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Clear Data & Reload
          </button>
          
          <button
            onClick={handleReload}
            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Just Reload
          </button>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          If this persists, please fix your system clock first.
        </p>
      </div>
    </div>
  );
};

export default LoadingFallback;