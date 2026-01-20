import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Message } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

// Global message cache to prevent duplicates and ensure consistency
const messageCache = new Map<string, Message>()
const conversationCache = new Map<string, Message[]>()

// Global listeners for real-time updates
const globalListeners = new Set<(messages: Message[], conversationId: string) => void>()

let globalSubscription: any = null
let isGlobalSubscriptionActive = false

// Aggressive polling intervals
let fastPollInterval: NodeJS.Timeout | null = null
let slowPollInterval: NodeJS.Timeout | null = null

export const useRealtimeMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentUser } = useSupabase()
  const lastFetchTime = useRef<number>(0)
  const isActiveConversation = useRef(true)

  // Fetch messages function
  const fetchMessages = useCallback(async (force = false) => {
    if (!conversationId || !currentUser) {
      setMessages([])
      setLoading(false)
      return
    }

    // Prevent too frequent fetches (unless forced)
    const now = Date.now()
    if (!force && now - lastFetchTime.current < 1000) {
      return
    }
    lastFetchTime.current = now

    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const newMessages = data || []
      
      // Update cache
      conversationCache.set(conversationId, newMessages)
      newMessages.forEach(msg => messageCache.set(msg.id, msg))
      
      // Update state
      setMessages(newMessages)
      
      // Notify global listeners
      globalListeners.forEach(listener => {
        try {
          listener(newMessages, conversationId)
        } catch (err) {
          console.error('Global listener error:', err)
        }
      })
      
      console.log(`📨 Fetched ${newMessages.length} messages for conversation ${conversationId}`)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [conversationId, currentUser])

  // Initialize global subscription once
  useEffect(() => {
    if (!currentUser || globalSubscription) return

    console.log('🌐 Initializing global message subscription')
    
    globalSubscription = supabase
      .channel('global-messages-aggressive')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        (payload) => {
          const newMessage = payload.new as Message
          console.log('🔥 Real-time message received:', newMessage.id)
          
          // Update cache immediately
          messageCache.set(newMessage.id, newMessage)
          
          // Update conversation cache
          const conversationMessages = conversationCache.get(newMessage.conversation_id) || []
          const exists = conversationMessages.some(msg => msg.id === newMessage.id)
          if (!exists) {
            const updatedMessages = [...conversationMessages, newMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            conversationCache.set(newMessage.conversation_id, updatedMessages)
            
            // Notify all listeners
            globalListeners.forEach(listener => {
              try {
                listener(updatedMessages, newMessage.conversation_id)
              } catch (err) {
                console.error('Global listener error:', err)
              }
            })
          }
          
          isGlobalSubscriptionActive = true
        }
      )
      .subscribe((status) => {
        console.log('🌐 Global subscription status:', status)
        isGlobalSubscriptionActive = (status === 'SUBSCRIBED')
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time is ACTIVE')
          // Slow down polling when real-time works
          if (fastPollInterval) {
            clearInterval(fastPollInterval)
            fastPollInterval = null
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Real-time FAILED - activating aggressive polling')
          isGlobalSubscriptionActive = false
          startAggressivePolling()
        }
      })

    return () => {
      if (globalSubscription) {
        globalSubscription.unsubscribe()
        globalSubscription = null
      }
    }
  }, [currentUser])

  // Aggressive polling fallback
  const startAggressivePolling = useCallback(() => {
    if (fastPollInterval) return
    
    console.log('🔄 Starting aggressive polling (every 2 seconds)')
    fastPollInterval = setInterval(() => {
      if (!isGlobalSubscriptionActive) {
        // Poll all active conversations
        conversationCache.forEach((_, convId) => {
          fetchMessagesForConversation(convId)
        })
      }
    }, 2000) // Very frequent polling
  }, [])

  // Fetch messages for any conversation
  const fetchMessagesForConversation = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const newMessages = data || []
      const cachedMessages = conversationCache.get(convId) || []
      
      // Check if there are new messages
      if (newMessages.length !== cachedMessages.length) {
        console.log(`🔄 Polling found new messages in conversation ${convId}`)
        conversationCache.set(convId, newMessages)
        newMessages.forEach(msg => messageCache.set(msg.id, msg))
        
        // Notify listeners
        globalListeners.forEach(listener => {
          try {
            listener(newMessages, convId)
          } catch (err) {
            console.error('Polling listener error:', err)
          }
        })
      }
    } catch (err) {
      console.error('Polling error for conversation', convId, err)
    }
  }

  // Register this hook as a global listener
  useEffect(() => {
    if (!conversationId) return

    const listener = (newMessages: Message[], convId: string) => {
      if (convId === conversationId && isActiveConversation.current) {
        setMessages(newMessages)
        console.log(`📨 Updated messages for active conversation ${convId}`)
      }
    }

    globalListeners.add(listener)
    return () => {
      globalListeners.delete(listener)
    }
  }, [conversationId])

  // Initial fetch and setup
  useEffect(() => {
    if (!conversationId || !currentUser) {
      setMessages([])
      setLoading(false)
      return
    }

    isActiveConversation.current = true
    setLoading(true)
    
    // Check cache first
    const cachedMessages = conversationCache.get(conversationId)
    if (cachedMessages) {
      setMessages(cachedMessages)
      setLoading(false)
      console.log(`📨 Loaded ${cachedMessages.length} messages from cache`)
    }
    
    // Always fetch fresh data
    fetchMessages(true)
    
    // Start aggressive polling if real-time isn't working
    if (!isGlobalSubscriptionActive) {
      startAggressivePolling()
    }
    
    // Also set up a slow polling as ultimate fallback
    slowPollInterval = setInterval(() => {
      fetchMessages()
    }, 10000) // Every 10 seconds as final fallback

    return () => {
      isActiveConversation.current = false
      if (slowPollInterval) {
        clearInterval(slowPollInterval)
        slowPollInterval = null
      }
    }
  }, [conversationId, currentUser, fetchMessages, startAggressivePolling])

  return { messages, loading, error, refetch: () => fetchMessages(true) }
}

export const useSendRealtimeMessage = () => {
  const [loading, setLoading] = useState(false)
  const { currentUser } = useSupabase()

  const sendTextMessage = async (params: {
    conversationId: string
    content: string
  }) => {
    if (!currentUser) throw new Error('User not authenticated')

    setLoading(true)
    
    // Create optimistic message for immediate UI update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}-${Math.random()}`,
      conversation_id: params.conversationId,
      sender: currentUser.id,
      content: params.content,
      message_type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add to cache immediately
    messageCache.set(optimisticMessage.id, optimisticMessage)
    const cachedMessages = conversationCache.get(params.conversationId) || []
    const updatedMessages = [...cachedMessages, optimisticMessage]
    conversationCache.set(params.conversationId, updatedMessages)
    
    // Notify listeners immediately
    globalListeners.forEach(listener => {
      try {
        listener(updatedMessages, params.conversationId)
      } catch (err) {
        console.error('Optimistic update error:', err)
      }
    })

    try {
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
      
      // Replace optimistic message with real one
      messageCache.delete(optimisticMessage.id)
      messageCache.set(data.id, data)
      
      const messages = conversationCache.get(params.conversationId) || []
      const finalMessages = messages
        .filter(msg => msg.id !== optimisticMessage.id)
        .concat(data)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      conversationCache.set(params.conversationId, finalMessages)
      
      // Notify listeners of real message
      globalListeners.forEach(listener => {
        try {
          listener(finalMessages, params.conversationId)
        } catch (err) {
          console.error('Real message update error:', err)
        }
      })
      
      console.log('✅ Message sent successfully:', data.id)
      return data
    } catch (error) {
      // Remove optimistic message on error
      const messages = conversationCache.get(params.conversationId) || []
      const filteredMessages = messages.filter(msg => msg.id !== optimisticMessage.id)
      conversationCache.set(params.conversationId, filteredMessages)
      
      globalListeners.forEach(listener => {
        try {
          listener(filteredMessages, params.conversationId)
        } catch (err) {
          console.error('Error cleanup listener error:', err)
        }
      })
      
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { sendTextMessage, loading }
}

// Cleanup function for global resources
export const cleanupRealtimeMessages = () => {
  if (globalSubscription) {
    globalSubscription.unsubscribe()
    globalSubscription = null
  }
  if (fastPollInterval) {
    clearInterval(fastPollInterval)
    fastPollInterval = null
  }
  if (slowPollInterval) {
    clearInterval(slowPollInterval)
    slowPollInterval = null
  }
  messageCache.clear()
  conversationCache.clear()
  globalListeners.clear()
}