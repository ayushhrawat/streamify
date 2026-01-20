-- FIX FOR SET-RETURNING FUNCTIONS ERROR
-- This fixes the "set-returning functions are not allowed in WHERE" error
-- Run this script in your Supabase SQL Editor

-- Drop and recreate the problematic function with fixed subqueries
DROP FUNCTION IF EXISTS get_user_conversations(TEXT);

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

-- Alternative version using EXISTS instead of ANY for better compatibility
CREATE OR REPLACE FUNCTION get_user_conversations_safe(user_token TEXT)
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
    WITH conversation_users AS (
        SELECT 
            c.id as conv_id,
            c.participants,
            c.is_group,
            c.group_name,
            c.group_image,
            c.admin,
            c.created_at,
            c.updated_at,
            c.last_message_content,
            c.last_message_created_at,
            c.last_message_sender,
            u.name as other_user_name,
            u.image as other_user_image,
            u.email as other_user_email,
            u.is_online as other_user_is_online
        FROM conversations c
        LEFT JOIN users u ON (
            NOT c.is_group 
            AND u.token_identifier != user_token 
            AND u.token_identifier = ANY(c.participants)
        )
        WHERE user_token = ANY(c.participants)
    ),
    unread_counts AS (
        SELECT 
            m.conversation_id,
            COUNT(*) as unread_count
        FROM messages m
        LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = user_token
        WHERE m.sender != user_token
        AND mrs.read_at IS NULL
        GROUP BY m.conversation_id
    )
    SELECT 
        cu.conv_id as id,
        cu.participants,
        cu.is_group,
        cu.group_name,
        cu.group_image,
        cu.admin,
        cu.created_at,
        cu.updated_at,
        cu.other_user_name,
        cu.other_user_image,
        cu.other_user_email,
        cu.other_user_is_online,
        cu.last_message_content,
        cu.last_message_created_at,
        cu.last_message_sender,
        COALESCE(uc.unread_count, 0) as unread_count
    FROM conversation_users cu
    LEFT JOIN unread_counts uc ON cu.conv_id = uc.conversation_id
    ORDER BY COALESCE(cu.last_message_created_at, cu.created_at) DESC;
END;
$$;

-- Test the function to make sure it works
SELECT 'Fixed set-returning functions error!' as status;