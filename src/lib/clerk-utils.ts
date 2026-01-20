import { useAuth } from "@clerk/nextjs";

export const clearClerkSession = () => {
  if (typeof window !== 'undefined') {
    // Clear all Clerk-related cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      const trimmedName = name.trim();
      
      if (trimmedName.startsWith('__clerk') || 
          trimmedName.startsWith('__session') ||
          trimmedName.startsWith('clerk-db-jwt')) {
        // Clear for current domain
        document.cookie = `${trimmedName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        // Clear for parent domain
        document.cookie = `${trimmedName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        // Clear for all subdomains
        const domain = window.location.hostname.split('.').slice(-2).join('.');
        document.cookie = `${trimmedName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${domain}`;
      }
    });
    
    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('clerk') || key.includes('__clerk')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('clerk') || key.includes('__clerk')) {
        sessionStorage.removeItem(key);
      }
    });
  }
};

export const handleClerkError = (error: any) => {
  console.error('Clerk error:', error);
  
  // Check if it's a JWT/clock skew related error
  if (error?.message?.includes('token-iat-in-the-future') ||
      error?.message?.includes('infinite redirect loop') ||
      error?.message?.includes('JWT') ||
      error?.reason === 'token-iat-in-the-future') {
    
    console.warn('Clock skew or JWT error detected, clearing session...');
    clearClerkSession();
    
    // Show user-friendly message
    if (typeof window !== 'undefined') {
      const shouldReload = window.confirm(
        'There seems to be an authentication issue, likely due to system clock synchronization. ' +
        'Would you like to clear your session and reload the page?'
      );
      
      if (shouldReload) {
        window.location.reload();
      }
    }
    
    return true; // Indicates error was handled
  }
  
  return false; // Error not handled
};

export const useClerkErrorHandler = () => {
  const { signOut } = useAuth();
  
  const handleError = async (error: any) => {
    const wasHandled = handleClerkError(error);
    
    if (!wasHandled) {
      // For other errors, try signing out and back in
      try {
        await signOut();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      } catch (signOutError) {
        console.error('Error during sign out:', signOutError);
        clearClerkSession();
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    }
  };
  
  return { handleError };
};