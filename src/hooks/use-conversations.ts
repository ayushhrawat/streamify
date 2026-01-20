import { useState, useEffect, useCallback } from 'react'
import { supabase, Conversation } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'
import { useConversationRefresh } from '@/contexts/conversation-refresh-context'

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentUser } = useSupabase()
  
  // Try to get conversation refresh context (might not be available)
  let refreshKey = 0
  try {
    const conversationRefreshContext = useConversationRefresh()
    refreshKey = conversationRefreshContext.refreshKey
  } catch {
    // ConversationRefreshProvider not available, that's okay
  }

  const fetchConversations = useCallback(async (silent = false) => {
    if (!currentUser) {
      setConversations([])
      if (!silent) setLoading(false)
      return
    }

    try {
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      
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

      // Get all unique user IDs from conversations
      const allUserIds = new Set<string>()
      conversationsData?.forEach(conv => {
        conv.participants?.forEach((p: string) => {
          if (p !== currentUser.token_identifier) {
            allUserIds.add(p)
          }
        })
      })

      // Fetch all users in one query
      const { data: allUsers } = await supabase
        .from('users')
        .select('token_identifier, name, image, email, is_online')
        .in('token_identifier', Array.from(allUserIds))

      // Create a map for quick user lookup
      const userMap = new Map()
      allUsers?.forEach(user => {
        userMap.set(user.token_identifier, user)
      })

      // Get all conversation IDs for last messages
      const conversationIds = conversationsData?.map(conv => conv.id) || []
      
      // Fetch last messages for all conversations in one query
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      // Group last messages by conversation_id
      const lastMessageMap = new Map()
      lastMessages?.forEach(msg => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg)
        }
      })

      // Transform the data to include additional fields
      const transformedConversations: Conversation[] = (conversationsData || []).map((conv: any) => {
        let otherUserName = null
        let otherUserImage = null
        let otherUserEmail = null
        let otherUserIsOnline = false

        // If it's not a group, get the other user's details
        if (!conv.is_group && conv.participants.length === 2) {
          const otherUserId = conv.participants.find((p: string) => p !== currentUser.token_identifier)
          if (otherUserId) {
            const otherUser = userMap.get(otherUserId)
            if (otherUser) {
              otherUserName = otherUser.name
              otherUserImage = otherUser.image
              otherUserEmail = otherUser.email
              otherUserIsOnline = otherUser.is_online
            }
          }
        }

        // Get last message from map
        const lastMessage = lastMessageMap.get(conv.id)

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

      console.log('Transformed conversations:', transformedConversations)
      setConversations(transformedConversations)
    } catch (err) {
      console.error('Error fetching conversations:', err)
      if (!silent) setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchConversations()

    // Set up real-time subscription
    const subscription = supabase
      .channel('conversations')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'conversations'
        }, 
        (payload) => {
          console.log('New conversation created:', payload)
          // Check if current user is a participant
          if (payload.new.participants && payload.new.participants.includes(currentUser?.token_identifier)) {
            console.log('Current user is participant, refetching conversations...')
            // Silent refresh without loading indicator
            fetchConversations(true)
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations'
        }, 
        (payload) => {
          console.log('Conversation updated:', payload)
          // Check if current user is a participant
          if (payload.new.participants && payload.new.participants.includes(currentUser?.token_identifier)) {
            console.log('Current user is participant, refetching conversations...')
            // Silent refresh without loading indicator
            fetchConversations(true)
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'conversations'
        }, 
        () => {
          console.log('Conversation deleted, refetching...')
          // Silent refresh without loading indicator
          fetchConversations(true)
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
          // Silent refresh without loading indicator
          fetchConversations(true)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [currentUser, refreshKey, fetchConversations])

  const refetch = useCallback(async (silent = false) => {
    await fetchConversations(silent)
  }, [fetchConversations])

  return { conversations, loading, error, refetch }
}

export const useCreateConversation = () => {
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
        admin: params.isGroup ? currentUser.token_identifier : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('Creating conversation with data:', conversationData)

      const { data, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single()

      if (error) {
        console.error('Error creating conversation:', error)
        throw error
      }

      console.log('Conversation created successfully:', data)
      
      // Dispatch a custom event for immediate UI updates
      window.dispatchEvent(new CustomEvent('conversationCreated', {
        detail: { conversation: data }
      }))

      return data.id
    } finally {
      setLoading(false)
    }
  }

  return { createConversation, loading }
}