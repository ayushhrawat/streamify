-- MINIMAL SUPABASE SETUP FOR STREAMIFY
-- Simple, basic setup without complex functions
-- Run this entire script in your Supabase SQL Editor

-- Clean up existing data
DROP TABLE IF EXISTS message_deletions CASCADE;
DROP TABLE IF EXISTS message_read_status CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS get_user_conversations(TEXT);
DROP FUNCTION IF EXISTS mark_messages_as_read(UUID, TEXT);
DROP FUNCTION IF EXISTS get_conversation_unread_count(UUID, TEXT);
DROP FUNCTION IF EXISTS insert_message(UUID, TEXT, TEXT, TEXT);

-- =====================================================
-- 1. CREATE BASIC TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    image TEXT,
    token_identifier TEXT UNIQUE NOT NULL,
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participants TEXT[] NOT NULL,
    is_group BOOLEAN DEFAULT false,
    group_name TEXT,
    group_image TEXT,
    admin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE BASIC INDEXES
-- =====================================================

CREATE INDEX idx_users_token ON users(token_identifier);
CREATE INDEX idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- =====================================================
-- 3. CREATE STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE SIMPLE RLS POLICIES
-- =====================================================

-- Users policies - allow all operations for authenticated users
CREATE POLICY "users_policy" ON users FOR ALL USING (true);

-- Conversations policies - users can access conversations they're part of
CREATE POLICY "conversations_policy" ON conversations 
FOR ALL USING (auth.uid()::text = ANY(participants));

-- Messages policies - users can access messages in their conversations
CREATE POLICY "messages_policy" ON messages 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = messages.conversation_id 
        AND auth.uid()::text = ANY(conversations.participants)
    )
);

-- =====================================================
-- 6. STORAGE POLICIES
-- =====================================================

CREATE POLICY "chat_media_policy" ON storage.objects 
FOR ALL USING (bucket_id = 'chat-media');

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON users TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- =====================================================
-- 8. INSERT AI USERS
-- =====================================================

INSERT INTO users (name, email, image, token_identifier, is_online)
VALUES 
    ('AI Assistant', 'ai@streamify.app', '/ai-avatar.png', 'ai-assistant', true),
    ('ChatGPT', 'chatgpt@streamify.app', '/ai-avatar.png', 'chatgpt', true)
ON CONFLICT (token_identifier) DO UPDATE SET
    name = EXCLUDED.name,
    is_online = EXCLUDED.is_online;

-- =====================================================
-- 9. ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT 'Minimal Supabase setup completed!' as status;

-- Show created tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'conversations', 'messages')
ORDER BY table_name;