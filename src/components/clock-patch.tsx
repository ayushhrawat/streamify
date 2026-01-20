"use client";

import { useEffect } from 'react';

const ClockPatch = () => {
  useEffect(() => {
    // Temporarily disabled to prevent circular dependency
    console.log('Clock patch disabled to prevent errors');
  }, []);

  return null; // This component doesn't render anything
};

export default ClockPatch;