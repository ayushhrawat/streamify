import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'
import { io, Socket } from 'socket.io-client'

// Global socket instance for read receipts
let readReceiptSocket: Socket | null = null
const readReceiptListeners = new Set<(data: any) => void>()

// Initialize socket for instant read receipts
const initializeReadReceiptSocket = (userId: string) => {
  if (readReceiptSocket?.connected) {
    return readReceiptSocket
  }

  console.log('🔵 Initializing Read Receipt Socket for user:', userId)
  
  readReceiptSocket = io('http://localhost:3001', {
    transports: ['websocket', 'polling'],
    timeout: 5000,
    forceNew: false
  })

  readReceiptSocket.on('connect', () => {
    console.log('✅ Read Receipt Socket connected:', readReceiptSocket?.id)
    readReceiptSocket?.emit('user-online', userId)
  })

  // Listen for instant read receipts
  readReceiptSocket.on('messages-read-receipt', (data) => {
    console.log('🔵 INSTANT read receipt received:', data)
    readReceiptListeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error('Error in read receipt listener:', error)
      }
    })
  })

  readReceiptSocket.on('instant-read-receipt', (data) => {
    console.log('🔵 INSTANT global read receipt received:', data)
    readReceiptListeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error('Error in global read receipt listener:', error)
      }
    })
  })

  readReceiptSocket.on('message-read-receipt', (data) => {
    console.log('🔵 Individual message read receipt:', data)
    readReceiptListeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error('Error in message read receipt listener:', error)
      }
    })
  })

  return readReceiptSocket
}

export const useReadReceipts = (conversationId: string | null) => {
  const [messageReadStatus, setMessageReadStatus] = useState<Map<string, boolean>>(new Map())
  const { currentUser } = useSupabase()

  // Check if a specific message is read
  const isMessageRead = useCallback((messageId: string, senderId: string) => {
    if (!currentUser || senderId !== currentUser.id) return false
    return messageReadStatus.get(messageId) || false
  }, [messageReadStatus, currentUser])

  // Fetch read status for messages sent by current user - OPTIMIZED
  const fetchReadStatus = useCallback(async () => {
    if (!conversationId || !currentUser) return

    try {
      // Get messages sent by current user with read status in one query
      const { data: messagesWithReadStatus, error } = await supabase
        .from('messages')
        .select(`
          id,
          message_read_status!inner(user_id)
        `)
        .eq('conversation_id', conversationId)
        .eq('sender', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const readStatusMap = new Map<string, boolean>()

      // Process messages with read status
      const processedMessages = new Set<string>()
      
      messagesWithReadStatus?.forEach(message => {
        if (!processedMessages.has(message.id)) {
          // Check if anyone other than sender has read it
          const hasBeenRead = message.message_read_status.some((rs: any) => rs.user_id !== currentUser.id)
          readStatusMap.set(message.id, hasBeenRead)
          processedMessages.add(message.id)
        }
      })

      // Get all messages sent by current user to mark unread ones
      const { data: allMessages, error: allError } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('sender', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!allError && allMessages) {
        allMessages.forEach(msg => {
          if (!readStatusMap.has(msg.id)) {
            readStatusMap.set(msg.id, false)
          }
        })
      }

      setMessageReadStatus(readStatusMap)
      console.log('🔵 Read status updated for', readStatusMap.size, 'messages')
    } catch (error) {
      console.error('Error fetching read status:', error)
    }
  }, [conversationId, currentUser])

  // Send INSTANT read receipt when messages are read
  const sendReadReceipt = useCallback(async (conversationId: string) => {
    if (!currentUser) return

    try {
      // Mark messages as read in database
      const { data, error } = await supabase
        .rpc('mark_messages_as_read', {
          conversation_id_param: conversationId,
          user_token: currentUser.token_identifier
        })

      if (error) throw error

      console.log(`✅ Marked ${data} messages as read and sending INSTANT receipt`)
      
      // Send INSTANT read receipt via Socket.IO
      if (readReceiptSocket?.connected && data > 0) {
        readReceiptSocket.emit('messages-read', {
          conversationId,
          userId: currentUser.id,
          userName: currentUser.name,
          timestamp: new Date().toISOString()
        })
        console.log('🔵 INSTANT read receipt sent via Socket.IO')
      }

      return data
    } catch (error) {
      console.error('Error sending read receipt:', error)
      throw error
    }
  }, [currentUser])

  // Initialize socket when user is available
  useEffect(() => {
    if (!currentUser) return

    initializeReadReceiptSocket(currentUser.id)
  }, [currentUser])

  // Listen for INSTANT read receipts from other users
  useEffect(() => {
    if (!conversationId) return

    const readReceiptListener = (data: any) => {
      if (data.conversationId === conversationId) {
        console.log('🔵 INSTANT read receipt from:', data.readByName || data.userName)
        
        // INSTANTLY update read status for all messages sent by current user
        setMessageReadStatus(prev => {
          const updated = new Map(prev)
          // Mark all messages as read since someone read the conversation
          prev.forEach((_, messageId) => {
            updated.set(messageId, true)
          })
          return updated
        })
        
        // Also refresh from database for accuracy
        setTimeout(fetchReadStatus, 100)
      }
    }

    readReceiptListeners.add(readReceiptListener)
    
    return () => {
      readReceiptListeners.delete(readReceiptListener)
    }
  }, [conversationId, fetchReadStatus])

  // Initial fetch
  useEffect(() => {
    fetchReadStatus()
  }, [fetchReadStatus])

  // Join conversation room for instant updates
  useEffect(() => {
    if (!conversationId || !currentUser || !readReceiptSocket?.connected) return

    readReceiptSocket.emit('join-conversation', {
      conversationId: conversationId,
      userId: currentUser.id
    })

    return () => {
      if (readReceiptSocket?.connected) {
        readReceiptSocket.emit('leave-conversation', {
          conversationId: conversationId,
          userId: currentUser.id
        })
      }
    }
  }, [conversationId, currentUser])

  return {
    isMessageRead,
    sendReadReceipt,
    refreshReadStatus: fetchReadStatus
  }
}

// Export function to trigger read receipt listeners (for Socket.IO integration)
export const triggerReadReceiptListeners = (data: any) => {
  readReceiptListeners.forEach(listener => {
    try {
      listener(data)
    } catch (error) {
      console.error('Error in read receipt listener:', error)
    }
  })
}