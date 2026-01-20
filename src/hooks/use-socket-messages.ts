import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { supabase, Message } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

// Global socket instance
let globalSocket: Socket | null = null
const messageListeners = new Set<(message: Message, conversationId: string) => void>()
const conversationListeners = new Set<(conversationId: string, lastMessage: Message) => void>()
const typingListeners = new Set<(data: any) => void>()

// Initialize socket connection
const initializeSocket = (userId: string) => {
  if (globalSocket?.connected) {
    console.log('🔄 Socket already connected for user:', userId)
    return globalSocket
  }

  console.log('🚀 Initializing Socket.IO connection for user:', userId)
  
  globalSocket = io('http://localhost:3001', {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: false
  })

  globalSocket.on('connect', () => {
    console.log('✅ Socket.IO connected:', globalSocket?.id, 'for user:', userId)
    globalSocket?.emit('user-online', userId)
  })

  globalSocket.on('disconnect', () => {
    console.log('❌ Socket.IO disconnected for user:', userId)
  })

  globalSocket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error for user:', userId, error)
  })

  // Listen for new messages
  globalSocket.on('new-message', (data) => {
    console.log('📨 Socket.IO message received:', data)
    const { conversationId, message, isInConversation } = data
    
    // Notify all message listeners
    messageListeners.forEach(listener => {
      try {
        listener(message, conversationId)
      } catch (error) {
        console.error('Error in message listener:', error)
      }
    })
  })

  // Listen for conversation updates
  globalSocket.on('conversation-update', (data) => {
    console.log('🔄 Socket.IO conversation update:', data)
    const { conversationId, lastMessage } = data
    
    // Notify all conversation listeners
    conversationListeners.forEach(listener => {
      try {
        listener(conversationId, lastMessage)
      } catch (error) {
        console.error('Error in conversation listener:', error)
      }
    })
  })

  // Listen for typing indicators with improved responsiveness
  globalSocket.on('user-typing', (data) => {
    console.log('⌨️ Typing indicator received:', data.userName, 'in', data.conversationId)
    typingListeners.forEach(listener => {
      try {
        listener({ type: 'typing-start', ...data })
      } catch (error) {
        console.error('Error in typing listener:', error)
      }
    })
  })

  globalSocket.on('user-stopped-typing', (data) => {
    console.log('⌨️ Stopped typing indicator received:', data.userId, 'in', data.conversationId)
    typingListeners.forEach(listener => {
      try {
        listener({ type: 'typing-stop', ...data })
      } catch (error) {
        console.error('Error in typing listener:', error)
      }
    })
  })

  
  // Heartbeat
  setInterval(() => {
    if (globalSocket?.connected) {
      globalSocket.emit('ping')
    }
  }, 30000)

  return globalSocket
}

export const useSocketMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typing, setTyping] = useState<string[]>([])
  const { currentUser } = useSupabase()
  const messagesRef = useRef<Message[]>([])

  // Fetch messages from database
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !currentUser) {
      setMessages([])
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const fetchedMessages = data || []
      setMessages(fetchedMessages)
      messagesRef.current = fetchedMessages
      
      console.log(`📨 Fetched ${fetchedMessages.length} messages for conversation ${conversationId}`)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [conversationId, currentUser])

  // Initialize socket when user is available
  useEffect(() => {
    if (!currentUser) return

    const socket = initializeSocket(currentUser.id)
    
    return () => {
      // Don't disconnect socket on unmount, keep it alive for other components
    }
  }, [currentUser])

  // Join conversation room when conversation changes
  useEffect(() => {
    if (!conversationId || !currentUser || !globalSocket?.connected) return

    console.log('💬 Joining conversation room:', conversationId)
    globalSocket.emit('join-conversation', {
      conversationId: conversationId,
      userId: currentUser.id
    })

    return () => {
      if (globalSocket?.connected) {
        console.log('👋 Leaving conversation room:', conversationId)
        globalSocket.emit('leave-conversation', {
          conversationId: conversationId,
          userId: currentUser.id
        })
      }
    }
  }, [conversationId, currentUser])

  // Listen for new messages in current conversation
  useEffect(() => {
    if (!conversationId) return

    const messageListener = (newMessage: Message, msgConversationId: string) => {
      if (msgConversationId === conversationId) {
        console.log('📨 New message for current conversation:', newMessage.id)
        
        setMessages(prev => {
          // If this is a real message replacing an optimistic one
          if (!newMessage.id.startsWith('temp-')) {
            // Remove any optimistic message with similar content and sender
            const withoutOptimistic = prev.filter(msg => {
              if (msg.id.startsWith('temp-') && 
                  msg.content === newMessage.content && 
                  msg.sender === newMessage.sender &&
                  Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 10000) {
                return false
              }
              return true
            })
            
            // Check if real message already exists
            const exists = withoutOptimistic.some(msg => msg.id === newMessage.id)
            if (exists) return prev
            
            const updated = [...withoutOptimistic, newMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            messagesRef.current = updated
            return updated
          } else {
            // This is an optimistic message
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) return prev
            
            const updated = [...prev, newMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            messagesRef.current = updated
            return updated
          }
        })
      }
    }

    messageListeners.add(messageListener)
    
    return () => {
      messageListeners.delete(messageListener)
    }
  }, [conversationId])

  // Listen for typing indicators with improved state management
  useEffect(() => {
    if (!conversationId) return

    const typingListener = (data: any) => {
      if (data.conversationId === conversationId) {
        if (data.type === 'typing-start') {
          setTyping(prev => {
            if (!prev.includes(data.userName)) {
              console.log('⌨️ Adding typing user:', data.userName)
              return [...prev, data.userName]
            }
            return prev
          })
        } else if (data.type === 'typing-stop') {
          setTyping(prev => {
            const filtered = prev.filter(name => name !== data.userName)
            if (filtered.length !== prev.length) {
              console.log('⌨️ Removing typing user:', data.userName)
            }
            return filtered
          })
        }
      }
    }

    typingListeners.add(typingListener)
    
    return () => {
      typingListeners.delete(typingListener)
    }
  }, [conversationId])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Periodic refresh as fallback (every 5 seconds)
  useEffect(() => {
    if (!conversationId) return

    const interval = setInterval(() => {
      fetchMessages()
    }, 5000)

    return () => clearInterval(interval)
  }, [conversationId, fetchMessages])

  
  return { 
    messages, 
    loading, 
    error, 
    typing,
    refetch: fetchMessages 
  }
}

export const useSendSocketMessage = () => {
  const [loading, setLoading] = useState(false)
  const { currentUser } = useSupabase()

  const sendTextMessage = async (params: {
    conversationId: string
    content: string
  }) => {
    if (!currentUser) throw new Error('User not authenticated')

    setLoading(true)

    // Create optimistic message for immediate display
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}-${Math.random()}`,
      conversation_id: params.conversationId,
      sender: currentUser.id,
      content: params.content,
      message_type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Show optimistic message immediately to sender
    messageListeners.forEach(listener => {
      try {
        listener(optimisticMessage, params.conversationId)
      } catch (error) {
        console.error('Error in optimistic message listener:', error)
      }
    })

    try {
      // Save to database
      const messageData = {
        conversation_id: params.conversationId,
        sender: currentUser.id,
        content: params.content,
        message_type: 'text' as const
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (error) throw error

      // Get conversation participants
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('participants')
        .eq('id', params.conversationId)
        .single()

      if (convError) throw convError

      // Replace optimistic message with real message for sender
      messageListeners.forEach(listener => {
        try {
          listener(data, params.conversationId)
        } catch (error) {
          console.error('Error in real message listener:', error)
        }
      })

      // Mark conversation as read for sender (since they're actively sending)
      markConversationAsRead(params.conversationId)
      
      // Also mark messages as read in database for the sender
      try {
        await supabase.rpc('mark_messages_as_read', {
          conversation_id_param: params.conversationId,
          user_token: currentUser.token_identifier
        })
        console.log('✅ Marked conversation as read for sender after sending message')
      } catch (error) {
        console.warn('Failed to mark messages as read:', error)
      }

      // Trigger conversation list update for sender
      conversationListeners.forEach(listener => {
        try {
          listener(params.conversationId, data)
        } catch (error) {
          console.error('Error in conversation listener for sender:', error)
        }
      })

      // Send via Socket.IO for instant delivery to other participants
      if (globalSocket?.connected) {
        globalSocket.emit('send-message', {
          conversationId: params.conversationId,
          message: data,
          participants: conversation.participants
        })
        console.log('✅ Message sent via Socket.IO:', data.id)
      } else {
        console.warn('⚠️ Socket not connected, message saved to DB only')
      }

      return data
    } catch (error) {
      // Remove optimistic message on error
      console.error('❌ Failed to send message:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const startTyping = (conversationId: string) => {
    if (globalSocket?.connected && currentUser) {
      globalSocket.emit('typing-start', {
        conversationId: conversationId,
        userId: currentUser.id,
        userName: currentUser.name
      })
      console.log('⌨️ Sent typing start for:', currentUser.name)
    }
  }

  const stopTyping = (conversationId: string) => {
    if (globalSocket?.connected && currentUser) {
      globalSocket.emit('typing-stop', {
        conversationId: conversationId,
        userId: currentUser.id,
        userName: currentUser.name
      })
      console.log('⌨️ Sent typing stop for:', currentUser.name)
    }
  }

  const markConversationAsRead = (conversationId: string) => {
    if (globalSocket?.connected && currentUser) {
      globalSocket.emit('conversation-read', {
        conversationId: conversationId,
        userId: currentUser.id
      })
      console.log('📖 Marked conversation as read:', conversationId)
    }
  }

  return { 
    sendTextMessage, 
    loading,
    startTyping,
    stopTyping,
    markConversationAsRead
  }
}

// Hook for conversation list updates
export const useSocketConversations = () => {
  const [updateTrigger, setUpdateTrigger] = useState(0)
  const { currentUser } = useSupabase()

  useEffect(() => {
    if (!currentUser) return

    // Initialize socket
    initializeSocket(currentUser.id)

    const conversationListener = (conversationId: string, lastMessage: Message) => {
      console.log('🔄 Socket.IO conversation update received:', conversationId)
      setUpdateTrigger(prev => prev + 1)
    }

    conversationListeners.add(conversationListener)
    
    return () => {
      conversationListeners.delete(conversationListener)
    }
  }, [currentUser])

  return { updateTrigger }
}

// Cleanup function
export const cleanupSocket = () => {
  if (globalSocket) {
    globalSocket.disconnect()
    globalSocket = null
  }
  messageListeners.clear()
  conversationListeners.clear()
  typingListeners.clear()
}