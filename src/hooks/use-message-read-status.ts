import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'
import { useSendSocketMessage } from './use-socket-messages'
import { useConversationUpdates } from './use-conversation-updates'
import { triggerReadReceiptListeners } from './use-read-receipts'
import { io, Socket } from 'socket.io-client'

// Global socket for instant read receipts
let instantReadSocket: Socket | null = null

const initializeInstantReadSocket = (userId: string) => {
  if (instantReadSocket?.connected) {
    return instantReadSocket
  }

  console.log('🔵 Initializing Instant Read Socket for user:', userId)
  
  instantReadSocket = io('http://localhost:3001', {
    transports: ['websocket', 'polling'],
    timeout: 3000,
    forceNew: false
  })

  instantReadSocket.on('connect', () => {
    console.log('✅ Instant Read Socket connected:', instantReadSocket?.id)
    instantReadSocket?.emit('user-online', userId)
  })

  return instantReadSocket
}

export const useMessageReadStatus = () => {
  const [loading, setLoading] = useState(false)
  const { currentUser } = useSupabase()

  // Mark messages as read when user opens a conversation
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!currentUser || !conversationId) return

    setLoading(true)
    try {
      // Initialize socket if not already done
      if (!instantReadSocket?.connected) {
        initializeInstantReadSocket(currentUser.id)
      }

      const { data, error } = await supabase
        .rpc('mark_messages_as_read', {
          conversation_id_param: conversationId,
          user_token: currentUser.token_identifier
        })

      if (error) throw error

      console.log(`✅ Marked ${data} messages as read in conversation ${conversationId}`)
      
      // Send INSTANT read receipt via Socket.IO
      if (data > 0 && instantReadSocket?.connected) {
        instantReadSocket.emit('messages-read', {
          conversationId,
          userId: currentUser.id,
          userName: currentUser.name,
          timestamp: new Date().toISOString()
        })
        console.log('🔵 INSTANT read receipt sent for', data, 'messages')
      }
      
      // Also trigger local listeners for immediate UI updates
      if (data > 0) {
        triggerReadReceiptListeners({
          conversationId,
          userId: currentUser.id,
          userName: currentUser.name
        })
      }
      
      return data
    } catch (error) {
      console.error('Error marking messages as read:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  // Get unread count for a specific conversation
  const getConversationUnreadCount = useCallback(async (conversationId: string) => {
    if (!currentUser || !conversationId) return 0

    try {
      const { data, error } = await supabase
        .rpc('get_conversation_unread_count', {
          conversation_id_param: conversationId,
          user_token: currentUser.token_identifier
        })

      if (error) throw error

      return data || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }, [currentUser])

  return {
    markMessagesAsRead,
    getConversationUnreadCount,
    loading
  }
}

// Hook to automatically mark messages as read when viewing a conversation
export const useAutoMarkAsRead = (conversationId: string | null) => {
  const { markMessagesAsRead } = useMessageReadStatus()
  const { triggerUpdate } = useConversationUpdates()
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false)

  useEffect(() => {
    if (!conversationId) {
      setHasMarkedAsRead(false)
      return
    }

    // Mark messages as read when conversation is opened
    const markAsRead = async () => {
      try {
        const markedCount = await markMessagesAsRead(conversationId)
        setHasMarkedAsRead(true)
        
        // If messages were marked as read, trigger conversation list update
        if (markedCount > 0) {
          console.log(`✅ Marked ${markedCount} messages as read, triggering conversation update`)
          triggerUpdate()
        }
      } catch (error) {
        console.error('Failed to mark messages as read:', error)
      }
    }

    // Mark messages as read when conversation is opened
    const timeout = setTimeout(markAsRead, 500) // Small delay to ensure conversation is fully loaded

    return () => {
      clearTimeout(timeout)
    }
  }, [conversationId, markMessagesAsRead, triggerUpdate])

  // Reset when conversation changes
  useEffect(() => {
    setHasMarkedAsRead(false)
  }, [conversationId])

  return { hasMarkedAsRead }
}