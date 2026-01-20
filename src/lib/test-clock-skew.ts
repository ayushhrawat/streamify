// Simple clock skew utilities without circular dependencies

export const testClockSkew = () => {
  console.log('=== Simple Clock Check ===');
  const now = new Date();
  console.log('Current system time:', now.toString());
  console.log('Year:', now.getFullYear());
  console.log('=== End Clock Check ===');
};

export const fixClockSkew = () => {
  console.log('=== Manual Clock Skew Fix ===');
  
  // Clear all authentication data
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear cookies
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
  });
  
  console.log('Authentication data cleared');
  console.log('Please fix your system clock and then reload the page');
  console.log('Windows: Right-click clock → "Adjust date/time" → Toggle "Set time automatically"');
  
  const shouldReload = confirm('Authentication data cleared. Reload page now?');
  if (shouldReload) {
    window.location.reload();
  }
};

// Make utilities available in browser console
if (typeof window !== 'undefined') {
  (window as any).testClockSkew = testClockSkew;
  (window as any).fixClockSkew = fixClockSkew;
}