import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

interface MessageReadInfo {
  messageId: string
  isRead: boolean
  readBy: string[]
}

export const useMessageReadTracking = (conversationId: string | null) => {
  const [messageReadStatus, setMessageReadStatus] = useState<Map<string, MessageReadInfo>>(new Map())
  const { currentUser } = useSupabase()

  // Check if a specific message is read by other participants
  const isMessageRead = useCallback((messageId: string, senderId: string) => {
    if (!currentUser || senderId !== currentUser.id) return false
    
    const readInfo = messageReadStatus.get(messageId)
    return readInfo?.isRead || false
  }, [messageReadStatus, currentUser])

  // Fetch read status for messages in the conversation
  const fetchMessageReadStatus = useCallback(async () => {
    if (!conversationId || !currentUser) return

    try {
      // Get all messages in the conversation
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, sender')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      // Get read status for each message
      const readStatusMap = new Map<string, MessageReadInfo>()

      for (const message of messages || []) {
        // Only check read status for messages sent by current user
        if (message.sender === currentUser.id) {
          const { data: readStatus, error: readError } = await supabase
            .from('message_read_status')
            .select('user_id')
            .eq('message_id', message.id)

          if (!readError && readStatus) {
            const readBy = readStatus.map(rs => rs.user_id)
            readStatusMap.set(message.id, {
              messageId: message.id,
              isRead: readBy.length > 0,
              readBy: readBy
            })
          } else {
            readStatusMap.set(message.id, {
              messageId: message.id,
              isRead: false,
              readBy: []
            })
          }
        }
      }

      setMessageReadStatus(readStatusMap)
    } catch (error) {
      console.error('Error fetching message read status:', error)
    }
  }, [conversationId, currentUser])

  // Listen for read receipt updates via Socket.IO
  useEffect(() => {
    if (!conversationId) return

    // This would be handled by Socket.IO events
    // For now, we'll poll periodically
    const interval = setInterval(fetchMessageReadStatus, 10000)

    return () => clearInterval(interval)
  }, [conversationId, fetchMessageReadStatus])

  // Initial fetch
  useEffect(() => {
    fetchMessageReadStatus()
  }, [fetchMessageReadStatus])

  return {
    isMessageRead,
    messageReadStatus,
    refreshReadStatus: fetchMessageReadStatus
  }
}