-- Test conversation creation
-- Run this to create a test conversation and message

-- Create a test conversation between you and AI Assistant
INSERT INTO conversations (participants, is_group, group_name, admin)
VALUES 
    (ARRAY['user_2yoVaUAF6rNC1Vlw5uaYNzjk2fk', 'ai-assistant'], false, NULL, NULL)
RETURNING id, participants, is_group, created_at;

-- Get the conversation ID (you'll need to replace this with the actual ID from above)
-- Then create a test message
-- INSERT INTO messages (conversation_id, sender, content, message_type)
-- VALUES 
--     ('REPLACE_WITH_CONVERSATION_ID', 'ai-assistant', 'Hello! Welcome to Streamify! 🎉', 'text');

-- Check what we created
SELECT 'Test conversation created!' as status;
SELECT * FROM conversations WHERE 'user_2yoVaUAF6rNC1Vlw5uaYNzjk2fk' = ANY(participants);
SELECT * FROM messages WHERE conversation_id IN (
    SELECT id FROM conversations WHERE 'user_2yoVaUAF6rNC1Vlw5uaYNzjk2fk' = ANY(participants)
);