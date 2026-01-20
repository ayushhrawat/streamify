import { useState, useEffect } from 'react'
import { supabase, Conversation } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

export const useSimpleConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentUser } = useSupabase()

  useEffect(() => {
    if (!currentUser) {
      setConversations([])
      setLoading(false)
      return
    }

    const fetchConversations = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log('Fetching conversations for user:', currentUser.token_identifier)
        
        // Simple query to get conversations where user is a participant
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select('*')
          .contains('participants', [currentUser.token_identifier])
          .order('updated_at', { ascending: false })

        if (conversationsError) {
          throw conversationsError
        }

        console.log('Raw conversations:', conversationsData)

        // Transform the data to include additional fields
        const transformedConversations: Conversation[] = await Promise.all(
          (conversationsData || []).map(async (conv: any) => {
            let otherUserName = null
            let otherUserImage = null
            let otherUserEmail = null
            let otherUserIsOnline = false

            // If it's not a group, get the other user's details
            if (!conv.is_group && conv.participants.length === 2) {
              const otherUserId = conv.participants.find((p: string) => p !== currentUser.token_identifier)
              if (otherUserId) {
                const { data: otherUser } = await supabase
                  .from('users')
                  .select('name, image, email, is_online')
                  .eq('token_identifier', otherUserId)
                  .single()

                if (otherUser) {
                  otherUserName = otherUser.name
                  otherUserImage = otherUser.image
                  otherUserEmail = otherUser.email
                  otherUserIsOnline = otherUser.is_online
                }
              }
            }

            // Get last message
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, created_at, sender')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            return {
              id: conv.id,
              participants: conv.participants,
              is_group: conv.is_group,
              group_name: conv.group_name,
              group_image: conv.group_image,
              admin: conv.admin,
              created_at: conv.created_at,
              updated_at: conv.updated_at,
              other_user_name: otherUserName,
              other_user_image: otherUserImage,
              other_user_email: otherUserEmail,
              other_user_is_online: otherUserIsOnline,
              last_message_content: lastMessage?.content || null,
              last_message_created_at: lastMessage?.created_at || null,
              last_message_sender: lastMessage?.sender || null,
              unread_count: 0 // Simplified - no unread count for now
            }
          })
        )

        console.log('Transformed conversations:', transformedConversations)
        setConversations(transformedConversations)
      } catch (err) {
        console.error('Error fetching conversations:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()

    // Set up real-time subscription
    const subscription = supabase
      .channel('conversations')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations'
        }, 
        () => {
          console.log('Conversation change detected, refetching...')
          fetchConversations()
        }
      )
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        () => {
          console.log('New message detected, refetching conversations...')
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [currentUser])

  return { conversations, loading, error, refetch: () => {
    if (currentUser) {
      // Trigger refetch
    }
  }}
}

export const useCreateSimpleConversation = () => {
  const [loading, setLoading] = useState(false)
  const { currentUser } = useSupabase()

  const createConversation = async (params: {
    participants: string[]
    isGroup: boolean
    groupName?: string
    groupImage?: string
  }) => {
    if (!currentUser) throw new Error('User not authenticated')

    setLoading(true)
    try {
      const conversationData = {
        participants: [currentUser.token_identifier, ...params.participants],
        is_group: params.isGroup,
        group_name: params.groupName,
        group_image: params.groupImage,
        admin: params.isGroup ? currentUser.token_identifier : null
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single()

      if (error) throw error
      return data.id
    } finally {
      setLoading(false)
    }
  }

  return { createConversation, loading }
}