"use client";
import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSupabase } from '@/providers/supabase-provider'
import { supabase } from '@/lib/supabase'

// Global socket instance for instant real-time updates
let instantSocket: Socket | null = null
const readReceiptListeners = new Map<string, Set<(data: any) => void>>()
const typingListeners = new Map<string, Set<(data: any) => void>>()

// Initialize instant socket connection
const initializeInstantSocket = (userId: string) => {
  if (instantSocket?.connected) {
    return instantSocket
  }

  console.log('⚡ Initializing INSTANT Socket for user:', userId)
  
  instantSocket = io('http://localhost:3001', {
    transports: ['websocket'],
    timeout: 500,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    upgrade: true,
    rememberUpgrade: true
  })

  instantSocket.on('connect', () => {
    console.log('⚡ INSTANT Socket connected:', instantSocket?.id)
    instantSocket?.emit('user-online', userId)
  })

  instantSocket.on('disconnect', () => {
    console.log('⚡ INSTANT Socket disconnected')
  })

  // INSTANT READ RECEIPT LISTENERS - Multiple event handlers for reliability
  instantSocket.on('messages-read-receipt', (data) => {
    console.log('🔵 INSTANT read receipt received:', data)
    const listeners = readReceiptListeners.get(data.conversationId)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('Error in read receipt listener:', error)
        }
      })
    }
  })

  instantSocket.on('instant-read-receipt', (data) => {
    console.log('🔵 GLOBAL read receipt received:', data)
    const listeners = readReceiptListeners.get(data.conversationId)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('Error in global read receipt listener:', error)
        }
      })
    }
  })

  // Additional read receipt event handlers for better coverage
  instantSocket.on('message-read-receipt', (data) => {
    console.log('🔵 MESSAGE read receipt received:', data)
    const listeners = readReceiptListeners.get(data.conversationId)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('Error in message read receipt listener:', error)
        }
      })
    }
  })

  instantSocket.on('conversation-read-receipt', (data) => {
    console.log('🔵 CONVERSATION read receipt received:', data)
    const listeners = readReceiptListeners.get(data.conversationId)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('Error in conversation read receipt listener:', error)
        }
      })
    }
  })

  // Listen for immediate confirmation from server
  instantSocket.on('read-receipt-confirmed', (data) => {
    console.log('🔵 READ RECEIPT CONFIRMED:', data)
    const listeners = readReceiptListeners.get(data.conversationId)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('Error in read receipt confirmation listener:', error)
        }
      })
    }
  })

  // INSTANT TYPING LISTENERS
  instantSocket.on('user-typing', (data) => {
    console.log('⌨️ INSTANT typing received:', data.userName, 'in', data.conversationId)
    const listeners = typingListeners.get(data.conversationId)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener({ type: 'typing-start', ...data })
        } catch (error) {
          console.error('Error in typing listener:', error)
        }
      })
    }
  })

  instantSocket.on('user-stopped-typing', (data) => {
    console.log('⌨️ INSTANT stopped typing received:', data.userId, 'in', data.conversationId)
    const listeners = typingListeners.get(data.conversationId)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener({ type: 'typing-stop', ...data })
        } catch (error) {
          console.error('Error in stopped typing listener:', error)
        }
      })
    }
  })

  return instantSocket
}

// Hook for INSTANT read receipts
export const useInstantReadReceipts = (conversationId: string | null) => {
  const [messageReadStatus, setMessageReadStatus] = useState<Map<string, boolean>>(new Map())
  const [instantReadStatus, setInstantReadStatus] = useState<Map<string, boolean>>(new Map())
  const { currentUser } = useSupabase()
  const lastUpdateRef = useRef<number>(0)
  const readReceiptTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize socket
  useEffect(() => {
    if (!currentUser) return
    initializeInstantSocket(currentUser.id)
  }, [currentUser])

  // Join conversation for instant updates
  useEffect(() => {
    if (!conversationId || !currentUser || !instantSocket?.connected) return

    console.log('🔵 Joining conversation for read receipts:', conversationId)
    instantSocket.emit('join-conversation', {
      conversationId: conversationId,
      userId: currentUser.id
    })

    return () => {
      if (instantSocket?.connected) {
        instantSocket.emit('leave-conversation', {
          conversationId: conversationId,
          userId: currentUser.id
        })
      }
    }
  }, [conversationId, currentUser])

  // Fetch initial read status
  const fetchReadStatus = useCallback(async () => {
    if (!conversationId || !currentUser) return

    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          message_read_status(user_id)
        `)
        .eq('conversation_id', conversationId)
        .eq('sender', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const readStatusMap = new Map<string, boolean>()
      
      messages?.forEach(message => {
        const hasBeenRead = message.message_read_status?.some((rs: any) => rs.user_id !== currentUser.id) || false
        readStatusMap.set(message.id, hasBeenRead)
      })

      setMessageReadStatus(readStatusMap)
      console.log('🔵 Initial read status loaded for', readStatusMap.size, 'messages')
    } catch (error) {
      console.error('Error fetching read status:', error)
    }
  }, [conversationId, currentUser])

  // Listen for INSTANT read receipts with multiple event handlers
  useEffect(() => {
    if (!conversationId) return

    const listener = (data: any) => {
      console.log('🔵 Processing INSTANT read receipt:', data)
      
      // INSTANTLY mark ALL messages as read with immediate state update
      setMessageReadStatus(prev => {
        const updated = new Map(prev)
        // Mark all messages from current user as read immediately
        if (data.conversationId === conversationId) {
          prev.forEach((_, messageId) => {
            updated.set(messageId, true)
          })
          console.log('🔵 INSTANTLY updated', updated.size, 'messages to read')
        }
        return updated
      })

      // Force immediate re-render by updating timestamp
      lastUpdateRef.current = Date.now()
    }

    // Listen to multiple read receipt events for better coverage
    const globalListener = (data: any) => {
      console.log('🔵 Processing GLOBAL read receipt:', data)
      if (data.conversationId === conversationId) {
        listener(data)
      }
    }

    if (!readReceiptListeners.has(conversationId)) {
      readReceiptListeners.set(conversationId, new Set())
    }
    readReceiptListeners.get(conversationId)!.add(listener)
    readReceiptListeners.get(conversationId)!.add(globalListener)

    return () => {
      readReceiptListeners.get(conversationId)?.delete(listener)
      readReceiptListeners.get(conversationId)?.delete(globalListener)
    }
  }, [conversationId])

  // Initial fetch
  useEffect(() => {
    fetchReadStatus()
  }, [fetchReadStatus])

  // Send read receipt when receiver actually reads messages
  const sendInstantReadReceipt = useCallback(async (conversationId: string) => {
    if (!currentUser || !instantSocket?.connected) return

    try {
      // Mark in database first
      const { data, error } = await supabase
        .rpc('mark_messages_as_read', {
          conversation_id_param: conversationId,
          user_token: currentUser.token_identifier
        })

      if (error) throw error

      // Send Socket.IO event to notify other participants
      if (data > 0) {
        instantSocket.emit('messages-read', {
          conversationId,
          userId: currentUser.id,
          userName: currentUser.name,
          timestamp: new Date().toISOString()
        })
        console.log('🔵 Read receipt sent via Socket.IO for', data, 'messages')
      }

      return data
    } catch (error) {
      console.error('Error sending read receipt:', error)
      throw error
    }
  }, [currentUser])

  const isMessageRead = useCallback((messageId: string, senderId: string) => {
    if (!currentUser || senderId !== currentUser.id) return false
    return messageReadStatus.get(messageId) || false
  }, [messageReadStatus, currentUser])

  return {
    isMessageRead,
    sendInstantReadReceipt,
    refreshReadStatus: fetchReadStatus
  }
}

// Hook for INSTANT typing indicators
export const useInstantTyping = (conversationId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const { currentUser } = useSupabase()
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Initialize socket
  useEffect(() => {
    if (!currentUser) return
    initializeInstantSocket(currentUser.id)
  }, [currentUser])

  // Join conversation for typing updates
  useEffect(() => {
    if (!conversationId || !currentUser || !instantSocket?.connected) return

    console.log('⌨️ Joining conversation for typing:', conversationId)
    instantSocket.emit('join-conversation', {
      conversationId: conversationId,
      userId: currentUser.id
    })

    return () => {
      if (instantSocket?.connected) {
        instantSocket.emit('leave-conversation', {
          conversationId: conversationId,
          userId: currentUser.id
        })
      }
    }
  }, [conversationId, currentUser])

  // Listen for INSTANT typing indicators
  useEffect(() => {
    if (!conversationId) return

    const listener = (data: any) => {
      if (data.type === 'typing-start') {
        console.log('⌨️ INSTANT typing start:', data.userName)
        setTypingUsers(prev => {
          if (!prev.includes(data.userName)) {
            return [...prev, data.userName]
          }
          return prev
        })

        // Clear existing timeout for this user
        const existingTimeout = typingTimeoutRef.current.get(data.userName)
        if (existingTimeout) {
          clearTimeout(existingTimeout)
        }

        // Set new timeout to remove user after 3 seconds
        const timeout = setTimeout(() => {
          setTypingUsers(prev => prev.filter(name => name !== data.userName))
          typingTimeoutRef.current.delete(data.userName)
        }, 3000)
        
        typingTimeoutRef.current.set(data.userName, timeout)
      } else if (data.type === 'typing-stop') {
        console.log('⌨️ INSTANT typing stop:', data.userName)
        setTypingUsers(prev => prev.filter(name => name !== data.userName))
        
        // Clear timeout
        const timeout = typingTimeoutRef.current.get(data.userName)
        if (timeout) {
          clearTimeout(timeout)
          typingTimeoutRef.current.delete(data.userName)
        }
      }
    }

    if (!typingListeners.has(conversationId)) {
      typingListeners.set(conversationId, new Set())
    }
    typingListeners.get(conversationId)!.add(listener)

    return () => {
      typingListeners.get(conversationId)?.delete(listener)
      // Clear all timeouts for this conversation
      typingTimeoutRef.current.forEach((timeout, userName) => {
        clearTimeout(timeout)
      })
      typingTimeoutRef.current.clear()
    }
  }, [conversationId])

  // Send typing indicators
  const startTyping = useCallback(() => {
    if (!conversationId || !currentUser || !instantSocket?.connected) return

    instantSocket.emit('typing-start', {
      conversationId: conversationId,
      userId: currentUser.id,
      userName: currentUser.name
    })
    console.log('⌨️ INSTANT typing start sent')
  }, [conversationId, currentUser])

  const stopTyping = useCallback(() => {
    if (!conversationId || !currentUser || !instantSocket?.connected) return

    instantSocket.emit('typing-stop', {
      conversationId: conversationId,
      userId: currentUser.id,
      userName: currentUser.name
    })
    console.log('⌨️ INSTANT typing stop sent')
  }, [conversationId, currentUser])

  return {
    typingUsers,
    startTyping,
    stopTyping
  }
}

// Cleanup function
export const cleanupInstantSocket = () => {
  if (instantSocket) {
    instantSocket.disconnect()
    instantSocket = null
  }
  readReceiptListeners.clear()
  typingListeners.clear()
}