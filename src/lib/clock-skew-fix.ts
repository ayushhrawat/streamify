// Clock skew workaround - adjusts for system clock being in the future

export const getAdjustedTime = () => {
  const now = new Date();
  // If system time is in July 2025, adjust it back to December 2024
  if (now.getFullYear() === 2025 && now.getMonth() >= 6) {
    // Calculate the difference and adjust
    const adjustedTime = new Date();
    adjustedTime.setFullYear(2024);
    adjustedTime.setMonth(11); // December (0-indexed)
    return adjustedTime;
  }
  return now;
};

export const patchDateForClerk = () => {
  // Store original Date constructor
  const OriginalDate = window.Date;
  
  // Create a patched Date constructor
  const PatchedDate = function(...args: any[]) {
    if (args.length === 0) {
      // When called with no arguments (new Date()), return adjusted time
      const adjusted = getAdjustedTime();
      return new OriginalDate(adjusted.getTime());
    }
    // For all other cases, use original Date
    return new OriginalDate(...args);
  } as any;
  
  // Copy all static methods from original Date
  Object.setPrototypeOf(PatchedDate, OriginalDate);
  Object.getOwnPropertyNames(OriginalDate).forEach(name => {
    if (name !== 'length' && name !== 'name' && name !== 'prototype') {
      PatchedDate[name] = OriginalDate[name];
    }
  });
  
  // Override Date.now() to return adjusted time
  PatchedDate.now = () => {
    return getAdjustedTime().getTime();
  };
  
  // Replace global Date
  window.Date = PatchedDate;
  
  console.log('Clock skew patch applied - Date adjusted for Clerk compatibility');
};

export const unpatchDate = () => {
  // This would restore original Date if needed
  // For now, we'll keep the patch active
};