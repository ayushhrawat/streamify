# Fix Clock Skew Issue - Complete Guide

## Problem
Your system clock is set to **July 2025** instead of **December 2024**, causing JWT authentication to fail.

## Step 1: Fix System Clock (CRITICAL)

### Method 1: Automatic Sync (Recommended)
1. Right-click on the **clock** in Windows system tray
2. Select **"Adjust date/time"**
3. Turn **OFF** "Set time automatically"
4. Turn **ON** "Set time automatically" 
5. Wait 10-15 seconds for sync

### Method 2: Manual Fix
1. Right-click clock → "Adjust date/time"
2. Turn OFF "Set time automatically"
3. Click "Change" under manual settings
4. Set date to **December 2024** (NOT July 2025)
5. Set correct time
6. Click "Change"
7. Turn ON "Set time automatically"

### Method 3: Command Line (Run as Administrator)
```cmd
w32tm /resync
net stop w32time
net start w32time
w32tm /resync
```

## Step 2: Clear All Authentication Data

### Clear Browser Data:
1. Open browser settings
2. Clear **all cookies and site data** for localhost:3000
3. Clear **all cached data**
4. Close browser completely

### Clear Clerk Session:
```javascript
// Run this in browser console on localhost:3000
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
```

## Step 3: Restart Development Server

```powershell
# Stop Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Navigate to project
cd c:\Users\rawat\Desktop\Project\Streamify

# Clear Next.js cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Start fresh
npm run dev
```

## Step 4: Verification

After fixing:
1. Check system clock shows **December 2024**
2. Open **new incognito window**
3. Go to localhost:3000
4. Should load without infinite loading

## Why This Happens

JWT tokens have an "issued at" (iat) claim that cannot be in the future. When your system clock is ahead of real time, tokens appear to be issued in the future, causing authentication to fail.

## If Still Having Issues

1. Restart your computer after fixing the clock
2. Try different browser
3. Check if antivirus is interfering
4. Temporarily disable Windows Defender real-time protection