"use client";

import { useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { useSocket } from '@/providers/socket-provider';

export const useMessageDeletion = () => {
  const [loading, setLoading] = useState(false);
  const { supabase, currentUser } = useSupabase();
  
  // Make socket optional to avoid dependency issues
  let socket = null;
  try {
    const socketContext = useSocket();
    socket = socketContext.socket;
  } catch (error) {
    console.warn('Socket provider not available, message deletion will work without real-time updates');
  }

  const deleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    if (!currentUser || !supabase) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    try {
      if (deleteForEveryone) {
        // Delete the message completely from the database
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId)
          .eq('sender', currentUser.id); // Only allow deletion of own messages

        if (error) throw error;

        // Emit socket event to notify all participants (if socket is available)
        if (socket) {
          socket.emit('message_deleted', {
            messageId,
            deleteForEveryone: true
          });
        }
      } else {
        // Mark message as deleted for current user only
        const { error } = await supabase
          .from('message_deletions')
          .insert({
            message_id: messageId,
            user_id: currentUser.id,
            deleted_at: new Date().toISOString()
          });

        if (error) throw error;

        // Emit socket event to update UI for current user (if socket is available)
        if (socket) {
          socket.emit('message_deleted', {
            messageId,
            deleteForEveryone: false,
            userId: currentUser.id
          });
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteMessage,
    loading
  };
};