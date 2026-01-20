import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Message } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

// Global message store for instant updates
class InstantMessageStore {
  private messageListeners: Set<(message: Message) => void> = new Set()
  private conversationListeners: Set<() => void> = new Set()
  private optimisticMessages: Map<string, Message> = new Map()

  addMessageListener(callback: (message: Message) => void): () => void {
    this.messageListeners.add(callback)
    return () => this.messageListeners.delete(callback)
  }

  addConversationListener(callback: () => void): () => void {
    this.conversationListeners.add(callback)
    return () => this.conversationListeners.delete(callback)
  }

  // Add optimistic message immediately
  addOptimisticMessage(message: Message) {
    this.optimisticMessages.set(message.id, message)
    this.notifyMessageListeners(message)
    this.notifyConversationListeners()
  }

  // Replace optimistic with real message
  replaceOptimisticMessage(tempId: string, realMessage: Message) {
    this.optimisticMessages.delete(tempId)
    this.notifyMessageListeners(realMessage)
    this.notifyConversationListeners()
  }

  // Notify about new real-time message
  notifyNewMessage(message: Message) {
    this.notifyMessageListeners(message)
    this.notifyConversationListeners()
  }

  // Public method to trigger conversation updates
  triggerConversationUpdate() {
    this.notifyConversationListeners()
  }

  private notifyMessageListeners(message: Message) {
    this.messageListeners.forEach(callback => {
      try {
        callback(message)
      } catch (error) {
        console.error('Error in message listener:', error)
      }
    })
  }

  private notifyConversationListeners() {
    this.conversationListeners.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in conversation listener:', error)
      }
    })
  }
}

const instantMessageStore = new InstantMessageStore()

export const useInstantMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentUser } = useSupabase()
  const lastFetchRef = useRef<number>(0)

  // Fetch messages from database
  const fetchMessages = useCallback(async (force = false) => {
    if (!conversationId || !currentUser) {
      setMessages([])
      setLoading(false)
      return
    }

    // Prevent too frequent fetches
    const now = Date.now()
    if (!force && now - lastFetchRef.current < 1000) {
      return
    }
    lastFetchRef.current = now

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
      
      console.log(`📨 Fetched ${fetchedMessages.length} messages for conversation ${conversationId}`)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [conversationId, currentUser])

  // Listen for new messages
  useEffect(() => {
    if (!conversationId) return

    const unsubscribe = instantMessageStore.addMessageListener((newMessage) => {
      if (newMessage.conversation_id === conversationId) {
        console.log('📨 New message for current conversation:', newMessage.id)
        
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg => msg.id === newMessage.id)
          if (exists) return prev
          
          // Remove any optimistic message with similar content
          const filtered = prev.filter(msg => {
            if (msg.id.startsWith('temp-') && 
                msg.content === newMessage.content && 
                msg.sender === newMessage.sender) {
              return false
            }
            return true
          })
          
          // Add new message and sort
          const updated = [...filtered, newMessage].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          
          return updated
        })
      }
    })

    return unsubscribe
  }, [conversationId])

  // Set up Supabase real-time subscription
  useEffect(() => {
    if (!conversationId || !currentUser) return

    console.log('🔄 Setting up real-time subscription for conversation:', conversationId)

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        (payload) => {
          const newMessage = payload.new as Message
          console.log('🔥 Real-time message received:', newMessage.id)
          instantMessageStore.notifyNewMessage(newMessage)
        }
      )
      .subscribe((status) => {
        console.log(`🔄 Subscription status for ${conversationId}:`, status)
      })

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId, currentUser])

  // Set up aggressive polling as fallback
  useEffect(() => {
    if (!conversationId || !currentUser) return

    const pollInterval = setInterval(() => {
      fetchMessages()
    }, 3000) // Poll every 3 seconds

    return () => {
      clearInterval(pollInterval)
    }
  }, [conversationId, currentUser, fetchMessages])

  // Initial fetch
  useEffect(() => {
    fetchMessages(true)
  }, [fetchMessages])

  return { messages, loading, error, refetch: () => fetchMessages(true) }
}

export const useSendInstantMessage = () => {
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

    // Show optimistic message immediately
    instantMessageStore.addOptimisticMessage(optimisticMessage)

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

      // Replace optimistic message with real one
      instantMessageStore.replaceOptimisticMessage(optimisticMessage.id, data)

      // Force conversation list update immediately
      setTimeout(() => {
        instantMessageStore.triggerConversationUpdate()
      }, 100)

      console.log('✅ Message sent successfully:', data.id)
      return data
    } catch (error) {
      // Remove optimistic message on error
      console.error('❌ Failed to send message:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { sendTextMessage, loading }
}

// Hook for conversation list updates
export const useInstantConversations = () => {
  const [updateTrigger, setUpdateTrigger] = useState(0)
  const { currentUser } = useSupabase()

  useEffect(() => {
    if (!currentUser) return

    const unsubscribe = instantMessageStore.addConversationListener(() => {
      console.log('🔄 Conversation update triggered')
      setUpdateTrigger(prev => prev + 1)
    })

    return unsubscribe
  }, [currentUser])

  // Also listen to global message changes
  useEffect(() => {
    if (!currentUser) return

    console.log('🌐 Setting up global message listener for conversations')

    const channel = supabase
      .channel('global-messages-for-conversations')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        (payload) => {
          const newMessage = payload.new as Message
          console.log('🌐 Global message received for conversation updates:', newMessage.id)
          setUpdateTrigger(prev => prev + 1)
        }
      )
      .subscribe((status) => {
        console.log('🌐 Global conversation subscription status:', status)
      })

    // Reduced polling for conversation updates
    const conversationPolling = setInterval(() => {
      console.log('🔄 Triggering conversation update via polling')
      setUpdateTrigger(prev => prev + 1)
    }, 8000) // Trigger conversation updates every 8 seconds (reduced from 2)

    return () => {
      channel.unsubscribe()
      clearInterval(conversationPolling)
    }
  }, [currentUser])

  return { updateTrigger }
}