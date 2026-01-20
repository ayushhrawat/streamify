import { useState, useEffect } from 'react'
import { supabase, Message } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

export const useSimpleMessages = (conversationId: string) => {
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
        setError(null)
        
        console.log('Fetching messages for conversation:', conversationId)
        
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (error) throw error

        console.log('Fetched messages:', data)
        setMessages(data || [])
      } catch (err) {
        console.error('Error fetching messages:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        (payload) => {
          console.log('New message received:', payload.new)
          const newMessage = payload.new as Message
          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [conversationId, currentUser])

  return { messages, loading, error }
}

export const useSendSimpleMessage = () => {
  const [loading, setLoading] = useState(false)
  const { currentUser } = useSupabase()

  const sendMessage = async (params: {
    conversationId: string
    content: string
    messageType?: 'text' | 'image' | 'video'
  }) => {
    if (!currentUser) throw new Error('User not authenticated')

    setLoading(true)
    try {
      const messageData = {
        conversation_id: params.conversationId,
        sender: currentUser.token_identifier,
        content: params.content,
        message_type: params.messageType || 'text'
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (error) throw error

      // Update conversation's updated_at timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', params.conversationId)

      return data
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
      const filePath = `images/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, params.imageFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath)

      // Send message with image URL
      return await sendMessage({
        conversationId: params.conversationId,
        content: publicUrl,
        messageType: 'image'
      })
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
      const filePath = `videos/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, params.videoFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath)

      // Send message with video URL
      return await sendMessage({
        conversationId: params.conversationId,
        content: publicUrl,
        messageType: 'video'
      })
    } finally {
      setLoading(false)
    }
  }

  return { sendMessage, sendImageMessage, sendVideoMessage, loading }
}