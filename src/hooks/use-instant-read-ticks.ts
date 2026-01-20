"use client";
import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSupabase } from '@/providers/supabase-provider'

// Global socket for instant read ticks
let instantTickSocket: Socket | null = null
const readTickListeners = new Map<string, Set<(data: any) => void>>()

// Initialize instant read tick socket
const initializeInstantTickSocket = (userId: string) => {
  if (instantTickSocket?.connected) {
    return instantTickSocket
  }

  console.log('⚡ Initializing INSTANT Read Tick Socket for user:', userId)
  
  instantTickSocket = io('http://localhost:3001', {
    transports: ['websocket'],
    timeout: 100, // Ultra-fast timeout
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 200,
    upgrade: true,
    rememberUpgrade: true
  })

  instantTickSocket.on('connect', () => {
    console.log('⚡ INSTANT Read Tick Socket connected:', instantTickSocket?.id)
    instantTickSocket?.emit('user-online', userId)
  })

  // Listen for ALL read receipt events for instant updates
  const readReceiptEvents = [
    'messages-read-receipt',
    'instant-read-receipt', 
    'message-read-receipt',
    'conversation-read-receipt',
    'read-receipt-confirmed'
  ]

  readReceiptEvents.forEach(eventName => {
    instantTickSocket?.on(eventName, (data) => {
      console.log(`🔵 INSTANT ${eventName}:`, data)
      const listeners = readTickListeners.get(data.conversationId)
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(data)
          } catch (error) {
            console.error(`Error in ${eventName} listener:`, error)
          }
        })
      }
    })
  })

  return instantTickSocket
}

// Hook for instant read ticks with immediate visual feedback
export const useInstantReadTicks = (conversationId: string | null) => {
  const [readTicks, setReadTicks] = useState<Map<string, boolean>>(new Map())
  const [instantTicks, setInstantTicks] = useState<Map<string, boolean>>(new Map())
  const { currentUser } = useSupabase()
  const tickUpdateRef = useRef<number>(0)

  // Initialize socket
  useEffect(() => {
    if (!currentUser) return
    initializeInstantTickSocket(currentUser.id)
  }, [currentUser])

  // Join conversation for instant read tick updates
  useEffect(() => {
    if (!conversationId || !currentUser || !instantTickSocket?.connected) return

    console.log('🔵 Joining conversation for instant read ticks:', conversationId)
    instantTickSocket.emit('join-conversation', {
      conversationId: conversationId,
      userId: currentUser.id
    })

    return () => {
      if (instantTickSocket?.connected) {
        instantTickSocket.emit('leave-conversation', {
          conversationId: conversationId,
          userId: currentUser.id
        })
      }
    }
  }, [conversationId, currentUser])

  // Listen for instant read tick updates
  useEffect(() => {
    if (!conversationId) return

    const listener = (data: any) => {
      console.log('🔵 Processing INSTANT read tick:', data)
      
      // IMMEDIATELY update read ticks for all messages
      setReadTicks(prev => {
        const updated = new Map(prev)
        // Mark all messages as read instantly
        prev.forEach((_, messageId) => {
          updated.set(messageId, true)
        })
        return updated
      })

      // Also update instant ticks for immediate visual feedback
      setInstantTicks(prev => {
        const updated = new Map(prev)
        prev.forEach((_, messageId) => {
          updated.set(messageId, true)
        })
        return updated
      })

      // Force re-render
      tickUpdateRef.current = Date.now()
    }

    if (!readTickListeners.has(conversationId)) {
      readTickListeners.set(conversationId, new Set())
    }
    readTickListeners.get(conversationId)!.add(listener)

    return () => {
      readTickListeners.get(conversationId)?.delete(listener)
    }
  }, [conversationId])

  // Send instant read tick - only when receiver actually reads messages
  const sendInstantReadTick = useCallback(async (conversationId: string) => {
    if (!currentUser || !instantTickSocket?.connected) return

    try {
      // Send socket event to notify other participants that messages were read
      instantTickSocket.emit('messages-read', {
        conversationId,
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: new Date().toISOString()
      })
      console.log('🔵 Read receipt sent via Socket.IO (receiver read messages)')

      return true
    } catch (error) {
      console.error('Error sending read receipt:', error)
      return false
    }
  }, [currentUser])

  // Check if message has read tick (instant check)
  const hasReadTick = useCallback((messageId: string, senderId: string) => {
    if (!currentUser || senderId !== currentUser.id) return false
    return readTicks.get(messageId) || instantTicks.get(messageId) || false
  }, [readTicks, instantTicks, currentUser])

  // Add message to tracking
  const trackMessage = useCallback((messageId: string, senderId: string) => {
    if (!currentUser || senderId !== currentUser.id) return
    
    setReadTicks(prev => {
      if (!prev.has(messageId)) {
        const updated = new Map(prev)
        updated.set(messageId, false)
        return updated
      }
      return prev
    })
  }, [currentUser])

  return {
    hasReadTick,
    sendInstantReadTick,
    trackMessage,
    updateTimestamp: tickUpdateRef.current
  }
}

// Cleanup function
export const cleanupInstantTickSocket = () => {
  if (instantTickSocket) {
    instantTickSocket.disconnect()
    instantTickSocket = null
  }
  readTickListeners.clear()
}