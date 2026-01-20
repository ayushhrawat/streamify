import { useState } from 'react';
import { useConversationStore } from '@/store/chat-store';
import { useSupabase } from '@/providers/supabase-provider';
import { useConversationUpdates } from './use-conversation-updates';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export const useImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { selectedConversation } = useConversationStore();
  const { currentUser } = useSupabase();
  const { triggerUpdate } = useConversationUpdates();

  const generateImage = async (prompt: string) => {
    if (!selectedConversation || !prompt.trim() || !currentUser) {
      toast.error("Missing requirements to generate image");
      return false;
    }
    
    setIsGenerating(true);
    let loadingMessageId: string | null = null;
    
    try {
      console.log('🎨 Generating image:', prompt);
      
      // Show loading message immediately
      const { data: loadingMsg, error: loadingError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id || selectedConversation._id,
          sender: 'ai-artist',
          content: '🎨 Generating image...',
          message_type: 'text'
        })
        .select('id')
        .single();

      if (!loadingError && loadingMsg) {
        loadingMessageId = loadingMsg.id;
        console.log('✅ Loading message created:', loadingMessageId);
        triggerUpdate(); // Show loading message immediately
      }

      // Call the image generation API
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id || selectedConversation._id,
          prompt: prompt.trim(),
          senderName: currentUser.name || 'User'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Image generation error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('🎨 Image generated successfully');

      // Clean up loading message
      if (loadingMessageId) {
        await supabase
          .from('messages')
          .delete()
          .eq('id', loadingMessageId);
        console.log('✅ Loading message cleaned up');
      }

      if (result.success) {
        toast.success("Image generated successfully!");
        triggerUpdate(); // Show the generated image
        return true;
      } else {
        throw new Error('Invalid image generation response');
      }

    } catch (error) {
      console.error('❌ Image generation error:', error);
      
      // Clean up loading message and show error
      if (loadingMessageId) {
        try {
          await supabase
            .from('messages')
            .update({
              content: "Sorry, I couldn't generate the image right now. Please try again with a different prompt.",
              sender: 'ai-artist'
            })
            .eq('id', loadingMessageId);
        } catch (updateError) {
          console.warn('Failed to update loading message with error:', updateError);
        }
      }
      
      toast.error("Failed to generate image");
      return false;
    } finally {
      setIsGenerating(false);
      triggerUpdate(); // Final update
    }
  };

  return {
    generateImage,
    isGenerating
  };
};