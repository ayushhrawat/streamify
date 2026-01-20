# 🚀 Streamify - Complete Setup Instructions

## 📋 Prerequisites

1. **Supabase Project**: Make sure you have a Supabase project created
2. **Clerk Account**: Ensure your Clerk authentication is set up
3. **Environment Variables**: Verify your `.env.local` file has all required variables

## 🗄️ Database Setup

### Step 1: Clean Your Supabase Database

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. **IMPORTANT**: Delete all existing SQL queries/functions in the SQL editor
4. Copy and paste the entire contents of `clean-supabase-setup.sql`
5. Click **Run** to execute the script

This will:
- ✅ Drop all existing tables and functions
- ✅ Create fresh, error-free tables
- ✅ Set up proper indexes for performance
- ✅ Create RLS policies for security
- ✅ Set up storage bucket for media files
- ✅ Insert AI users for chat functionality
- ✅ Enable real-time subscriptions

### Step 2: Verify Database Setup

After running the SQL script, you should see:
```
Clean Supabase setup completed successfully!
```

And a table showing all created tables:
- `conversations`
- `message_deletions`
- `message_read_status`
- `messages`
- `users`

## 🔧 Environment Variables

Verify your `.env.local` file contains:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://qtnhiwhtgnewwlplpebo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# Video Calls
ZEGO_APP_ID=your_zego_app_id
ZEGO_SERVER_SECRET=your_zego_server_secret

# AI Features
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

## 🔐 Authentication Integration

The project uses **Clerk + Supabase** integration:

1. **Clerk** handles user authentication
2. **Supabase Provider** (`src/providers/supabase-provider.tsx`) automatically:
   - Creates/updates users in Supabase when they sign in via Clerk
   - Manages online/offline status
   - Handles user profile synchronization

## 📁 Project Structure

```
src/
├── lib/
│   └── supabase.ts          # Supabase client and types
├── providers/
│   └── supabase-provider.tsx # Clerk + Supabase integration
├── hooks/
│   ├── use-conversations.ts  # Conversation management
│   ├── use-messages.ts      # Message handling
│   └── use-socket-messages.ts # Real-time messaging
└── components/
    └── debug/
        └── database-test.tsx # Database connection testing
```

## 🧪 Testing the Setup

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test database connection**:
   - Navigate to any page with the database test component
   - Click "Run Tests" to verify all connections work

3. **Test authentication**:
   - Sign in with Clerk
   - Check if user appears in Supabase `users` table
   - Verify online status updates

## 🔄 Real-time Features

The setup includes:

- ✅ **Real-time messaging** via Supabase subscriptions
- ✅ **Socket.IO integration** for instant delivery
- ✅ **Read receipts** and message status
- ✅ **Online/offline status** tracking
- ✅ **Typing indicators**
- ✅ **File uploads** to Supabase Storage

## 🛠️ Key Functions Created

1. **`get_user_conversations(user_token)`**: Fetches user conversations with unread counts
2. **`mark_messages_as_read(conversation_id, user_token)`**: Marks messages as read
3. **`get_conversation_unread_count(conversation_id, user_token)`**: Gets unread message count
4. **`insert_message(...)`**: Inserts new messages (bypasses RLS issues)

## 🚨 Troubleshooting

### Common Issues:

1. **"set-returning functions are not allowed in WHERE"**
   - ✅ Fixed in the new SQL setup using CTEs and proper JOINs

2. **RLS Policy Errors**
   - ✅ Simplified policies that work with Clerk authentication

3. **Real-time Not Working**
   - Check if tables are added to `supabase_realtime` publication
   - Verify RLS policies allow SELECT operations

4. **User Not Created**
   - Check Clerk integration in `supabase-provider.tsx`
   - Verify environment variables are correct

### Debug Steps:

1. **Check Supabase Connection**:
   ```typescript
   // Test in browser console
   console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
   ```

2. **Check User Creation**:
   - Sign in via Clerk
   - Check Supabase `users` table for new entry

3. **Test RPC Functions**:
   - Use the database test component
   - Check browser console for detailed error messages

## 🎯 Next Steps

After setup is complete:

1. **Test messaging functionality**
2. **Verify file uploads work**
3. **Test video calling features**
4. **Check AI integration**

## 📞 Support

If you encounter any issues:

1. Check the browser console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Supabase RLS policies are properly configured
4. Test database functions in Supabase SQL editor

---

**✅ Your Streamify messaging app should now be fully functional with a clean, error-free database setup!**