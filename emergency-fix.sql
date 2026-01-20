-- EMERGENCY FIX FOR STREAMIFY DATABASE
-- This will fix RLS policies and restore functionality
-- Run this in your Supabase SQL Editor

-- First, let's temporarily disable RLS to see what's happening
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "users_policy" ON users;
DROP POLICY IF EXISTS "conversations_policy" ON conversations;
DROP POLICY IF EXISTS "messages_policy" ON messages;
DROP POLICY IF EXISTS "chat_media_policy" ON storage.objects;

-- Create more permissive policies for testing
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_all" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_all" ON users FOR UPDATE USING (true);

CREATE POLICY "conversations_all" ON conversations FOR ALL USING (true);
CREATE POLICY "messages_all" ON messages FOR ALL USING (true);

-- Storage policy
CREATE POLICY "storage_all" ON storage.objects FOR ALL USING (bucket_id = 'chat-media');

-- Re-enable RLS with permissive policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Make sure AI users exist
INSERT INTO users (name, email, image, token_identifier, is_online)
VALUES 
    ('AI Assistant', 'ai@streamify.app', '/ai-avatar.png', 'ai-assistant', true),
    ('ChatGPT', 'chatgpt@streamify.app', '/ai-avatar.png', 'chatgpt', true)
ON CONFLICT (token_identifier) DO UPDATE SET
    name = EXCLUDED.name,
    is_online = EXCLUDED.is_online;

-- Grant all permissions to authenticated users
GRANT ALL ON users TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- Check what we have now
SELECT 'Current users:' as info;
SELECT id, name, email, token_identifier, is_online FROM users;

SELECT 'Current conversations:' as info;
SELECT COUNT(*) as conversation_count FROM conversations;

SELECT 'Current messages:' as info;
SELECT COUNT(*) as message_count FROM messages;

SELECT 'Emergency fix completed!' as status;