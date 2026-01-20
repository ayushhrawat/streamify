-- FRESH SUPABASE SETUP FOR STREAMIFY
-- This will drop existing tables and create everything from scratch
-- Run this entire script in your Supabase SQL Editor

-- =====================================================
-- 1. DROP EXISTING TABLES (IF ANY)
-- =====================================================

-- Disable RLS first
ALTER TABLE IF EXISTS message_deletions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS message_read_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "conversations_select_policy" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON conversations;
DROP POLICY IF EXISTS "conversations_delete_policy" ON conversations;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;
DROP POLICY IF EXISTS "message_read_status_select_policy" ON message_read_status;
DROP POLICY IF EXISTS "message_read_status_insert_policy" ON message_read_status;
DROP POLICY IF EXISTS "message_read_status_update_policy" ON message_read_status;
DROP POLICY IF EXISTS "message_deletions_select_policy" ON message_deletions;
DROP POLICY IF EXISTS "message_deletions_insert_policy" ON message_deletions;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_conversations(TEXT);
DROP FUNCTION IF EXISTS mark_messages_as_read(UUID, TEXT);
DROP FUNCTION IF EXISTS get_conversation_unread_count(UUID, TEXT);
DROP FUNCTION IF EXISTS insert_message(UUID, TEXT, TEXT, TEXT);

-- Drop existing tables in correct order (child tables first)
DROP TABLE IF EXISTS message_deletions CASCADE;
DROP TABLE IF EXISTS message_read_status CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- 2. CREATE TABLES FROM SCRATCH
-- =====================================================

-- Users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    image TEXT,
    token_identifier TEXT UNIQUE NOT NULL,
    is_online BOOLEAN DEFAULT false,
    pinned_conversations TEXT[],
    blocked_users TEXT[],
    muted_conversations TEXT[],
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
    last_message_content TEXT,
    last_message_created_at TIMESTAMP WITH TIME ZONE,
    last_message_sender TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message read status table
CREATE TABLE message_read_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    last_read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Message deletions table
CREATE TABLE message_deletions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    deleted_by TEXT NOT NULL,
    deleted_for_everyone BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

CREATE INDEX idx_users_token_identifier ON users(token_identifier);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_sender ON messages(sender);
CREATE INDEX idx_message_read_status_conversation_id ON message_read_status(conversation_id);
CREATE INDEX idx_message_read_status_user_id ON message_read_status(user_id);

-- =====================================================
-- 4. CREATE STORAGE BUCKET
-- =====================================================

-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. CREATE FUNCTIONS
-- =====================================================

-- Function to get user conversations
CREATE OR REPLACE FUNCTION get_user_conversations(user_token TEXT)
RETURNS TABLE(
    id UUID,
    participants TEXT[],
    is_group BOOLEAN,
    group_name TEXT,
    group_image TEXT,
    admin TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    other_user_name TEXT,
    other_user_image TEXT,
    other_user_email TEXT,
    other_user_is_online BOOLEAN,
    last_message_content TEXT,
    last_message_created_at TIMESTAMP WITH TIME ZONE,
    last_message_sender TEXT,
    unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.participants,
        c.is_group,
        c.group_name,
        c.group_image,
        c.admin,
        c.created_at,
        c.updated_at,
        CASE 
            WHEN c.is_group THEN NULL
            ELSE (
                SELECT u.name 
                FROM users u 
                WHERE u.token_identifier = ANY(c.participants) 
                AND u.token_identifier != user_token 
                LIMIT 1
            )
        END as other_user_name,
        CASE 
            WHEN c.is_group THEN NULL
            ELSE (
                SELECT u.image 
                FROM users u 
                WHERE u.token_identifier = ANY(c.participants) 
                AND u.token_identifier != user_token 
                LIMIT 1
            )
        END as other_user_image,
        CASE 
            WHEN c.is_group THEN NULL
            ELSE (
                SELECT u.email 
                FROM users u 
                WHERE u.token_identifier = ANY(c.participants) 
                AND u.token_identifier != user_token 
                LIMIT 1
            )
        END as other_user_email,
        CASE 
            WHEN c.is_group THEN NULL
            ELSE (
                SELECT u.is_online 
                FROM users u 
                WHERE u.token_identifier = ANY(c.participants) 
                AND u.token_identifier != user_token 
                LIMIT 1
            )
        END as other_user_is_online,
        c.last_message_content,
        c.last_message_created_at,
        c.last_message_sender,
        COALESCE((
            SELECT COUNT(*)
            FROM messages m
            LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = user_token
            WHERE m.conversation_id = c.id 
            AND m.sender != user_token
            AND mrs.read_at IS NULL
        ), 0) as unread_count
    FROM conversations c
    WHERE user_token = ANY(c.participants)
    ORDER BY COALESCE(c.last_message_created_at, c.created_at) DESC;
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    conversation_id_param UUID,
    user_token TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    INSERT INTO message_read_status (message_id, conversation_id, user_id, read_at, last_read_at)
    SELECT 
        m.id,
        m.conversation_id,
        user_token,
        NOW(),
        NOW()
    FROM messages m
    LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = user_token
    WHERE m.conversation_id = conversation_id_param
    AND m.sender != user_token
    AND mrs.read_at IS NULL
    ON CONFLICT (message_id, user_id) 
    DO UPDATE SET 
        read_at = NOW(),
        last_read_at = NOW();
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_conversation_unread_count(
    conversation_id_param UUID,
    user_token TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM messages m
    LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = user_token
    WHERE m.conversation_id = conversation_id_param 
    AND m.sender != user_token
    AND mrs.read_at IS NULL;
    
    RETURN COALESCE(unread_count, 0);
END;
$$;

-- Function to insert message
CREATE OR REPLACE FUNCTION insert_message(
    p_conversation_id UUID,
    p_sender TEXT,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text'
)
RETURNS TABLE(
    id UUID,
    conversation_id UUID,
    sender TEXT,
    content TEXT,
    message_type TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO messages (conversation_id, sender, content, message_type)
    VALUES (p_conversation_id, p_sender, p_content, p_message_type)
    RETURNING 
        messages.id,
        messages.conversation_id,
        messages.sender,
        messages.content,
        messages.message_type,
        messages.created_at,
        messages.updated_at;
END;
$$;

-- =====================================================
-- 6. INSERT AI USERS
-- =====================================================

INSERT INTO users (id, name, email, image, token_identifier, is_online, created_at, updated_at)
VALUES 
    ('ai-assistant', 'AI Assistant', 'ai-assistant@streamify.app', '/ai-avatar.png', 'ai-assistant', true, NOW(), NOW()),
    ('ai-artist', 'AI Artist', 'ai-artist@streamify.app', '/ai-avatar.png', 'ai-artist', true, NOW(), NOW()),
    ('chatgpt', 'ChatGPT', 'chatgpt@streamify.app', '/ai-avatar.png', 'chatgpt', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    image = EXCLUDED.image,
    is_online = EXCLUDED.is_online,
    updated_at = NOW();

-- =====================================================
-- 7. ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_deletions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (true);

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = token_identifier);

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (auth.uid()::text = token_identifier);

-- Conversations policies
CREATE POLICY "conversations_select_policy" ON conversations
    FOR SELECT USING (auth.uid()::text = ANY(participants));

CREATE POLICY "conversations_insert_policy" ON conversations
    FOR INSERT WITH CHECK (auth.uid()::text = ANY(participants));

CREATE POLICY "conversations_update_policy" ON conversations
    FOR UPDATE USING (auth.uid()::text = ANY(participants));

CREATE POLICY "conversations_delete_policy" ON conversations
    FOR DELETE USING (auth.uid()::text = ANY(participants));

-- Messages policies
CREATE POLICY "messages_select_policy" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND auth.uid()::text = ANY(conversations.participants)
        )
    );

CREATE POLICY "messages_insert_policy" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND auth.uid()::text = ANY(conversations.participants)
        )
    );

-- Message read status policies
CREATE POLICY "message_read_status_select_policy" ON message_read_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = message_read_status.conversation_id 
            AND auth.uid()::text = ANY(conversations.participants)
        )
    );

CREATE POLICY "message_read_status_insert_policy" ON message_read_status
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = message_read_status.conversation_id 
            AND auth.uid()::text = ANY(conversations.participants)
        )
    );

-- Storage policies
CREATE POLICY "chat_media_upload_policy" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

CREATE POLICY "chat_media_select_policy" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON users TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_read_status TO authenticated;
GRANT ALL ON message_deletions TO authenticated;

-- =====================================================
-- 9. VERIFY SETUP
-- =====================================================

SELECT 'Fresh Supabase setup completed successfully!' as status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'conversations', 'messages', 'message_read_status', 'message_deletions')
ORDER BY table_name, ordinal_position;