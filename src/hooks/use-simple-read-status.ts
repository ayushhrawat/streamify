"use client";
import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSupabase } from '@/providers/supabase-provider'
import { supabase } from '@/lib/supabase'

// Global socket for read status
let readStatusSocket: Socket | null = null
const readStatusListeners = new Map<string, Set<(data: any) => void>>()

// Initialize socket
const initializeReadStatusSocket = (userId: string) => {
  if (readStatusSocket?.connected) {
    return readStatusSocket
  }

  console.log('🔵 Initializing Read Status Socket for user:', userId)
  
  readStatusSocket = io('http://localhost:3001', {
    transports: ['websocket'],
    timeout: 2000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  })

  readStatusSocket.on('connect', () => {
    console.log('✅ Read Status Socket connected:', readStatusSocket?.id)
    readStatusSocket?.emit('user-online', userId)
  })

  // Listen for read receipts
  readStatusSocket.on('messages-read-receipt', (data) => {
    console.log('🔵 Read receipt received:', data)
    const listeners = readStatusListeners.get(data.conversationId)
    if (listeners) {
      listeners.forEach(listener => listener(data))
    }
  })

  readStatusSocket.on('instant-read-receipt', (data) => {
    console.log('🔵 Global read receipt received:', data)
    const listeners = readStatusListeners.get(data.conversationId)
    if (listeners) {
      listeners.forEach(listener => listener(data))
    }
  })

  return readStatusSocket
}

export const useSimpleReadStatus = (conversationId: string | null) => {
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set())
  const { currentUser } = useSupabase()

  // Initialize socket
  useEffect(() => {
    if (!currentUser) return
    initializeReadStatusSocket(currentUser.id)
  }, [currentUser])

  // Join conversation
  useEffect(() => {
    if (!conversationId || !currentUser || !readStatusSocket?.connected) return

    console.log('🔵 Joining conversation for read status:', conversationId)
    readStatusSocket.emit('join-conversation', {
      conversationId: conversationId,
      userId: currentUser.id
    })

    return () => {
      if (readStatusSocket?.connected) {
        readStatusSocket.emit('leave-conversation', {
          conversationId: conversationId,
          userId: currentUser.id
        })
      }
    }
  }, [conversationId, currentUser])

  // Listen for read receipts
  useEffect(() => {
    if (!conversationId) return

    const listener = (data: any) => {
      console.log('🔵 Processing read receipt for conversation:', data.conversationId)
      if (data.conversationId === conversationId) {
        // Mark all messages in this conversation as read
        setReadMessages(prev => {
          const updated = new Set(prev)
          // This is a simplified approach - in a real app you'd get specific message IDs
          // For now, we'll use a timestamp-based approach
          const readTimestamp = new Date(data.timestamp).getTime()
          updated.add(`read-${conversationId}-${readTimestamp}`)
          console.log('🔵 Updated read status for conversation:', conversationId)
          return updated
        })
      }
    }

    if (!readStatusListeners.has(conversationId)) {
      readStatusListeners.set(conversationId, new Set())
    }
    readStatusListeners.get(conversationId)!.add(listener)

    return () => {
      readStatusListeners.get(conversationId)?.delete(listener)
    }
  }, [conversationId])

  // Send read receipt when user opens conversation
  const sendReadReceipt = useCallback(async (conversationId: string) => {
    if (!currentUser || !readStatusSocket?.connected) return

    try {
      console.log('🔵 Sending read receipt for conversation:', conversationId)
      
      // Mark messages as read in database
      const { data, error } = await supabase
        .rpc('mark_messages_as_read', {
          conversation_id_param: conversationId,
          user_token: currentUser.token_identifier
        })

      if (error) {
        console.error('Database error:', error)
        return
      }

      console.log('🔵 Marked', data, 'messages as read in database')

      // Send socket event to notify other participants
      if (data > 0) {
        readStatusSocket.emit('messages-read', {
          conversationId,
          userId: currentUser.id,
          userName: currentUser.name,
          timestamp: new Date().toISOString()
        })
        console.log('🔵 Read receipt sent via socket')
      }

      return data
    } catch (error) {
      console.error('Error sending read receipt:', error)
    }
  }, [currentUser])

  // Check if messages in conversation are read
  const isConversationRead = useCallback((conversationId: string) => {
    // Simple check - if we have any read marker for this conversation
    for (const readKey of readMessages) {
      if (readKey.includes(`read-${conversationId}-`)) {
        return true
      }
    }
    return false
  }, [readMessages])

  return {
    sendReadReceipt,
    isConversationRead,
    readMessages: readMessages.size
  }
}

// Cleanup
export const cleanupReadStatusSocket = () => {
  if (readStatusSocket) {
    readStatusSocket.disconnect()
    readStatusSocket = null
  }
  readStatusListeners.clear()
}