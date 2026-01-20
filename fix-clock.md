# Fix System Clock Issue

Your system clock is currently set to **July 2025**, which is causing JWT authentication errors with Clerk.

## Quick Fix Steps:

### Method 1: Automatic (Recommended)
1. **Right-click on the clock** in your Windows system tray (bottom-right corner)
2. Select **"Adjust date/time"**
3. Turn **OFF** "Set time automatically"
4. Turn **ON** "Set time automatically" again
5. Wait a few seconds for Windows to sync with internet time servers

### Method 2: Manual
1. **Right-click on the clock** in your Windows system tray
2. Select **"Adjust date/time"**
3. Turn **OFF** "Set time automatically"
4. Click **"Change"** under "Set the date and time manually"
5. Set the correct date (should be around **December 2024**)
6. Set the correct time
7. Click **"Change"**
8. Turn **ON** "Set time automatically"

### Method 3: Command Line (Run as Administrator)
```cmd
w32tm /resync
```

## After Fixing:
1. **Close your browser completely**
2. **Restart the development server** (`npm run dev`)
3. **Open the application** in a new browser window

## Why This Happens:
JWT tokens have an "issued at" (iat) claim that must not be in the future. When your system clock is ahead of the actual time, the tokens appear to be issued in the future, causing authentication to fail.

## Verification:
After fixing, your system should show the current date as approximately **December 2024**, not July 2025.