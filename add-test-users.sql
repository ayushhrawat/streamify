-- Add test users for conversation creation
-- Run this in your Supabase SQL Editor

INSERT INTO users (name, email, image, token_identifier, is_online)
VALUES 
    ('John Doe', 'john.doe@example.com', '/placeholder.png', 'user_john_doe_123', true),
    ('Jane Smith', 'jane.smith@example.com', '/placeholder.png', 'user_jane_smith_456', false),
    ('Mike Johnson', 'mike.johnson@example.com', '/placeholder.png', 'user_mike_johnson_789', true),
    ('Sarah Wilson', 'sarah.wilson@example.com', '/placeholder.png', 'user_sarah_wilson_101', false),
    ('David Brown', 'david.brown@example.com', '/placeholder.png', 'user_david_brown_202', true)
ON CONFLICT (token_identifier) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_online = EXCLUDED.is_online;

-- Check what users we have now
SELECT 'Test users added!' as status;
SELECT id, name, email, token_identifier, is_online FROM users ORDER BY name;