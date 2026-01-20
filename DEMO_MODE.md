# Demo Mode

The WhatsApp Clone is currently running in **Demo Mode** with sample data.

## What's Working in Demo Mode:
- ✅ User interface and navigation
- ✅ Theme switching (light/dark mode)
- ✅ Sample conversations display
- ✅ Mock user authentication
- ✅ Basic chat interface

## What's Not Working:
- ❌ Real-time messaging
- ❌ User registration/authentication with Clerk
- ❌ Database persistence
- ❌ File uploads
- ❌ Video calls

## To Enable Full Functionality:

### 1. Start Convex Development Server
```bash
npx convex dev
```

### 2. Configure Clerk JWT Template
1. Go to your Clerk Dashboard
2. Navigate to JWT Templates
3. Create a new template for Convex
4. Add the required claims

### 3. Set Up Webhooks
Configure Clerk webhooks to sync user data with Convex.

### 4. Environment Variables
Ensure all environment variables in `.env.local` are properly configured:
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_APP_DOMAIN`
- `CLERK_WEBHOOK_SECRET`

## Current Demo Features:
- Sample conversation with "John Doe"
- Mock user data
- UI components and styling
- Theme switching
- Responsive design

The app will automatically switch to full functionality once the backend services are properly configured and running.