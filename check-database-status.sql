-- Check current database status
-- Run this in your Supabase SQL Editor to see what we have

-- Check if tables exist and their data
SELECT 'Users table:' as info;
SELECT COUNT(*) as user_count FROM users;
SELECT * FROM users LIMIT 5;

SELECT 'Conversations table:' as info;
SELECT COUNT(*) as conversation_count FROM conversations;
SELECT * FROM conversations LIMIT 5;

SELECT 'Messages table:' as info;
SELECT COUNT(*) as message_count FROM messages;
SELECT * FROM messages LIMIT 5;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'conversations', 'messages');

-- Check if storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'chat-media';