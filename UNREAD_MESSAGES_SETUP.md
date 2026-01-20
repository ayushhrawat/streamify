# Unread Messages Feature Setup

## Database Schema Update Required

To enable the unread message counter feature, you need to update your Supabase database schema.

### Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to your project
   - Go to the SQL Editor

2. **Run the new schema**
   - Copy the contents of `supabase/schema_with_unread.sql`
   - Paste and execute it in the SQL Editor
   - This will add the `message_read_status` table and update the functions

3. **Features Added:**
   - ✅ Unread message counter in conversation list
   - ✅ Visual indicators for conversations with unread messages
   - ✅ Automatic marking of messages as read when viewing conversation
   - ✅ Real-time updates via Socket.IO
   - ✅ Bold text for conversations with unread messages
   - ✅ Green badge showing unread count

## How it Works:

1. **Message Tracking**: When messages are sent, they're stored in the `messages` table
2. **Read Status**: When a user views a conversation, messages are marked as read in `message_read_status` table
3. **Unread Count**: The `get_user_conversations` function calculates unread messages for each conversation
4. **Real-time Updates**: Socket.IO broadcasts read receipts to update other users' views
5. **Visual Feedback**: Conversations with unread messages show:
   - Green badge with count
   - Bold conversation name
   - Bold last message text
   - Subtle background highlight

## Testing:

1. Open two browser windows/tabs with different user accounts
2. Send messages from one account to another
3. You should see:
   - Unread counter appears immediately on the receiving account
   - Counter disappears when conversation is opened
   - Real-time updates without page refresh

## Files Modified:

- `supabase/schema_with_unread.sql` - New database schema
- `src/lib/supabase.ts` - Added unread_count to Conversation interface
- `src/hooks/use-message-read-status.ts` - New hook for read status management
- `src/components/home/conversation.tsx` - Added unread counter display
- `src/components/home/message-container.tsx` - Auto-mark messages as read
- `server.js` - Added read receipt Socket.IO events
- `src/hooks/use-socket-messages.ts` - Added read receipt functionality