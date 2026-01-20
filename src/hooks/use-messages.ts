import { useState, useEffect } from 'react'
import { supabase, Message } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'
import { globalMessageStore } from './use-global-messages'

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentUser } = useSupabase()

  useEffect(() => {
    if (!conversationId || !currentUser) {
      setMessages([])
      setLoading(false)
      return
    }

    const fetchMessages = async () => {
      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (error) throw error
        setMessages(data || [])
      } catch (err) {
        console.error('Error fetching messages:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Set up polling fallback for real-time failures
    let isRealTimeWorking = false
    let pollInterval: NodeJS.Timeout | null = null
    
    const startPolling = () => {
      if (pollInterval) return
      
      pollInterval = setInterval(async () => {
        if (!isRealTimeWorking && conversationId && currentUser) {
          console.log('🔄 Polling for messages in conversation:', conversationId)
          try {
            const { data, error } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: true })

            if (error) throw error
            
            setMessages(prevMessages => {
              // Only update if we have new messages
              if (data && data.length !== prevMessages.length) {
                return data
              }
              return prevMessages
            })
          } catch (err) {
            console.error('Polling error:', err)
          }
        }
      }, 3000) // Poll every 3 seconds
    }

    // Listen to global message updates
    const unsubscribeGlobalMessages = globalMessageStore.addMessageListener((newMessage) => {
      // Only add message if it belongs to current conversation
      if (newMessage.conversation_id === conversationId) {
        console.log('📨 Adding message to current conversation:', newMessage.id)
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => msg.id === newMessage.id)
          if (exists) return prev
          
          // Remove any temporary/optimistic message with similar content and timestamp
          const filteredMessages = prev.filter(msg => {
            if (msg.id.startsWith('temp-') && 
                msg.content === newMessage.content && 
                msg.sender === newMessage.sender &&
                Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000) {
              return false // Remove optimistic message
            }
            return true
          })
          
          // Insert message in correct chronological order
          const newMessages = [...filteredMessages, newMessage]
          return newMessages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })
      }
    })

    // Set up direct real-time subscription for this specific conversation
    const conversationChannel = supabase
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
          console.log('🔥 Direct conversation message received:', newMessage.id)
          isRealTimeWorking = true
          
          // Clear polling since real-time is working
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          
          // Update messages immediately
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) return prev
            
            // Remove any temporary/optimistic message with similar content and timestamp
            const filteredMessages = prev.filter(msg => {
              if (msg.id.startsWith('temp-') && 
                  msg.content === newMessage.content && 
                  msg.sender === newMessage.sender &&
                  Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000) {
                return false // Remove optimistic message
              }
              return true
            })
            
            const newMessages = [...filteredMessages, newMessage]
            return newMessages.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          })
        }
      )
      .subscribe((status) => {
        console.log(`🔥 Direct conversation ${conversationId} subscription status:`, status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Direct conversation real-time is active')
          isRealTimeWorking = true
          
          // Clear polling fallback
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Direct conversation real-time failed, starting polling')
          isRealTimeWorking = false
          startPolling()
        }
      })

    return () => {
      unsubscribeGlobalMessages()
      conversationChannel.unsubscribe()
      
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [conversationId, currentUser])

  return { messages, loading, error }
}

export const useSendMessage = () => {
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
      id: `temp-${Date.now()}`,
      conversation_id: params.conversationId,
      sender: currentUser.id,
      content: params.content,
      message_type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Immediately notify global store for instant UI update
    globalMessageStore.notifyNewMessage(optimisticMessage)

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
      
      // The real message will be received via real-time subscription
      // and will replace the optimistic one
      return data
    } catch (error) {
      // If sending fails, we should remove the optimistic message
      // For now, the real-time system will handle this
      throw error
    } finally {
      setLoading(false)
    }
  }

  const sendImageMessage = async (params: {
    conversationId: string
    imageFile: File
  }) => {
    if (!currentUser) throw new Error('User not authenticated')

    setLoading(true)
    try {
      // Upload image to Supabase Storage
      const fileExt = params.imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `messages/${params.conversationId}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, params.imageFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath)

      // Save message with image URL
      const messageData = {
        conversation_id: params.conversationId,
        sender: currentUser.id,
        content: publicUrl,
        message_type: 'image' as const
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (error) throw error
      return data
    } finally {
      setLoading(false)
    }
  }

  const sendVideoMessage = async (params: {
    conversationId: string
    videoFile: File
  }) => {
    if (!currentUser) throw new Error('User not authenticated')

    setLoading(true)
    try {
      // Upload video to Supabase Storage
      const fileExt = params.videoFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `messages/${params.conversationId}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, params.videoFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath)

      // Save message with video URL
      const messageData = {
        conversation_id: params.conversationId,
        sender: currentUser.id,
        content: publicUrl,
        message_type: 'video' as const
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (error) throw error
      return data
    } finally {
      setLoading(false)
    }
  }

  return { 
    sendTextMessage, 
    sendImageMessage, 
    sendVideoMessage, 
    loading 
  }
}