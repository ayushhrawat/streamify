import { useState, useCallback } from 'react';
import { useConversationStore } from '@/store/chat-store';
import { useSupabase } from '@/providers/supabase-provider';
import { useConversationUpdates } from './use-conversation-updates';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export const useAIAssistant = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { selectedConversation } = useConversationStore();
  const { currentUser } = useSupabase();
  const { triggerUpdate } = useConversationUpdates();

  const askAI = useCallback(async (question: string) => {
    if (!selectedConversation || !question.trim() || !currentUser) {
      toast.error("Missing requirements to ask AI");
      return false;
    }

    setIsGenerating(true);
    
    // Create a loading message ID for tracking
    const loadingMessageId = `loading-${Date.now()}`;
    
    try {
      console.log('🤖 Asking AI:', question);

      // First, show a loading message on the AI side
      const loadingMessage = {
        conversation_id: selectedConversation.id || selectedConversation._id,
        sender: 'ai-assistant',
        content: '🤖 Generating response...',
        message_type: 'text' as const
      };

      // Save loading message to database
      const { data: loadingMsg, error: loadingError } = await supabase
        .from('messages')
        .insert(loadingMessage)
        .select()
        .single();

      if (loadingError) {
        console.error('Failed to save loading message:', loadingError);
      } else {
        console.log('✅ Loading message saved:', loadingMsg.id);
        // Trigger update to show loading message
        triggerUpdate();
      }

      // Call the AI API
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id || selectedConversation._id,
          messageContent: question.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AI API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('🤖 AI response received:', result);

      // Delete the loading message if it was created
      if (loadingMsg) {
        try {
          await supabase
            .from('messages')
            .delete()
            .eq('id', loadingMsg.id);
          console.log('✅ Loading message deleted');
        } catch (deleteError) {
          console.warn('Failed to delete loading message:', deleteError);
        }
      }

      if (result.success && result.message) {
        toast.success("AI responded!");
        
        // Trigger update to show the AI response
        setTimeout(() => {
          triggerUpdate();
        }, 500);
        
        return true;
      } else {
        throw new Error('Invalid AI response format');
      }

    } catch (error) {
      console.error('❌ AI error:', error);
      
      // Delete loading message and show error
      if (loadingMessageId) {
        try {
          // Try to find and delete the loading message
          const { data: loadingMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', selectedConversation.id || selectedConversation._id)
            .eq('sender', 'ai-assistant')
            .eq('content', '🤖 Generating response...')
            .order('created_at', { ascending: false })
            .limit(1);

          if (loadingMessages && loadingMessages.length > 0) {
            await supabase
              .from('messages')
              .delete()
              .eq('id', loadingMessages[0].id);
          }

          // Save error message instead
          await supabase
            .from('messages')
            .insert({
              conversation_id: selectedConversation.id || selectedConversation._id,
              sender: 'ai-assistant',
              content: "Sorry, I'm having trouble generating a response right now. Please try again.",
              message_type: 'text'
            });

        } catch (cleanupError) {
          console.warn('Failed to cleanup loading message:', cleanupError);
        }
      }
      
      toast.error("Failed to get AI response");
      return false;
    } finally {
      setIsGenerating(false);
      
      // Trigger conversation update to ensure UI is refreshed
      setTimeout(() => {
        triggerUpdate();
      }, 500);
    }
  }, [selectedConversation, currentUser, triggerUpdate]);

  return {
    askAI,
    isGenerating
  };
};