# 🚀 Simple Streamify Setup

## 📋 Quick Setup (Minimal & Working)

### Step 1: Clean Database Setup

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. **Delete all existing queries/functions**
4. Copy and paste the entire contents of `minimal-supabase-setup.sql`
5. Click **Run**

This creates:
- ✅ 3 simple tables: `users`, `conversations`, `messages`
- ✅ Basic indexes for performance
- ✅ Simple RLS policies
- ✅ Storage bucket for media
- ✅ AI users for chat

### Step 2: Use Simple Hooks

Replace complex hooks with simple ones:

#### For Conversations:
```typescript
// Instead of use-conversations.ts, use:
import { useSimpleConversations } from '@/hooks/use-simple-conversations'

const { conversations, loading, error } = useSimpleConversations()
```

#### For Messages:
```typescript
// Instead of use-messages.ts, use:
import { useSimpleMessages, useSendSimpleMessage } from '@/hooks/use-simple-messages'

const { messages, loading } = useSimpleMessages(conversationId)
const { sendMessage } = useSendSimpleMessage()
```

### Step 3: Update Your Components

Replace the complex conversation hook import:

```typescript
// OLD (complex):
import { useConversations } from '@/hooks/use-conversations'

// NEW (simple):
import { useSimpleConversations } from '@/hooks/use-simple-conversations'
```

## 🔧 What This Setup Does

### ✅ **Includes:**
- Basic user management
- Simple conversations
- Real-time messaging
- File uploads (images/videos)
- AI user integration
- Online/offline status

### ❌ **Excludes (for simplicity):**
- Complex unread message counting
- Advanced read receipts
- Complex RPC functions
- Message deletion tracking
- Advanced typing indicators

## 🚀 Benefits

1. **No Complex SQL Functions** - Uses simple SELECT/INSERT queries
2. **No Set-Returning Function Errors** - Avoids problematic SQL patterns
3. **Easy to Debug** - Simple, straightforward code
4. **Fast Setup** - Minimal configuration required
5. **Real-time Still Works** - Supabase subscriptions for live updates

## 📁 Files Created

- `minimal-supabase-setup.sql` - Simple database schema
- `src/hooks/use-simple-conversations.ts` - Basic conversation management
- `src/hooks/use-simple-messages.ts` - Simple message handling

## 🔄 Migration Steps

If you want to switch to this simple setup:

1. **Run the minimal SQL setup**
2. **Update your imports** in components that use conversations:
   ```typescript
   // Change this:
   import { useConversations } from '@/hooks/use-conversations'
   
   // To this:
   import { useSimpleConversations } from '@/hooks/use-simple-conversations'
   ```

3. **Update your imports** in components that use messages:
   ```typescript
   // Change this:
   import { useMessages } from '@/hooks/use-messages'
   
   // To this:
   import { useSimpleMessages } from '@/hooks/use-simple-messages'
   ```

## 🧪 Testing

After setup:
1. Start your app: `npm run dev`
2. Sign in with Clerk
3. Try sending messages
4. Check real-time updates work

## 📞 Support

This simple setup should work without errors. If you encounter issues:
1. Check browser console for errors
2. Verify Supabase connection
3. Ensure environment variables are set

---

**✅ This minimal setup gives you a working chat app without complex SQL functions!**