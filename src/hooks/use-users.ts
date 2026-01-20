import { useState, useEffect } from 'react'
import { supabase, User } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'
import { useUserRefresh } from '@/contexts/user-refresh-context'

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentUser } = useSupabase()
  
  // Try to get user refresh context (might not be available)
  let refreshKey = 0
  try {
    const userRefreshContext = useUserRefresh()
    refreshKey = userRefreshContext.refreshKey
  } catch {
    // UserRefreshProvider not available, that's okay
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching users, currentUser:', currentUser)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('token_identifier', currentUser?.token_identifier || 'no-user') // Exclude current user
        .order('name')

      console.log('Users query result:', { data, error })
      
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {

    if (currentUser) {
      fetchUsers()

      // Set up real-time subscription for user changes
      const usersSubscription = supabase
        .channel('users')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'users'
          }, 
          (payload) => {
            console.log('User status update:', payload)
            setUsers(prev => 
              prev.map(user => 
                user.id === payload.new.id 
                  ? { ...user, ...payload.new } as User
                  : user
              )
            )
          }
        )
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'users'
          }, 
          (payload) => {
            console.log('New user created:', payload)
            // Only add the new user if it's not the current user and not already in the list
            if (payload.new.token_identifier !== currentUser?.token_identifier) {
              setUsers(prev => {
                // Check if user already exists to prevent duplicates
                const userExists = prev.some(user => user.token_identifier === payload.new.token_identifier)
                if (!userExists) {
                  return [...prev, payload.new as User]
                }
                return prev
              })
            }
          }
        )
        .on('postgres_changes', 
          { 
            event: 'DELETE', 
            schema: 'public', 
            table: 'users'
          }, 
          (payload) => {
            console.log('User deleted:', payload)
            setUsers(prev => prev.filter(user => user.id !== payload.old.id))
          }
        )
        .subscribe()

      // Listen for global user creation events
      const handleUserCreated = (event: CustomEvent) => {
        console.log('User created event received:', event.detail)
        if (currentUser && event.detail?.user?.token_identifier !== currentUser.token_identifier) {
          // Add the new user to the list immediately, but check for duplicates
          setUsers(prev => {
            const userExists = prev.some(user => user.token_identifier === event.detail.user.token_identifier)
            if (!userExists) {
              return [...prev, event.detail.user]
            }
            return prev
          })
        }
      }
      
      window.addEventListener('userCreated', handleUserCreated as EventListener)

      return () => {
        usersSubscription.unsubscribe()
        window.removeEventListener('userCreated', handleUserCreated as EventListener)
      }
    } else {
      // If no current user, stop loading
      setLoading(false)
      setUsers([])
    }
  }, [currentUser, refreshKey])

  const refetch = () => {
    if (currentUser) {
      fetchUsers()
    }
  }

  return { users, loading, error, refetch }
}

export const useGroupMembers = (conversationId: string) => {
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGroupMembers = async () => {
      try {
        setLoading(true)
        
        // First get the conversation to get participant IDs
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('participants')
          .eq('id', conversationId)
          .single()

        if (convError) throw convError

        // Then get user details for all participants
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('token_identifier', conversation.participants)

        if (usersError) throw usersError
        setMembers(users || [])
      } catch (err) {
        console.error('Error fetching group members:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (conversationId) {
      fetchGroupMembers()
    }
  }, [conversationId])

  return { members, loading, error }
}

export const useKickUser = () => {
  const [loading, setLoading] = useState(false)

  const kickUser = async (params: {
    conversationId: string
    userId: string
  }) => {
    setLoading(true)
    try {
      // Get current conversation
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('participants')
        .eq('id', params.conversationId)
        .single()

      if (fetchError) throw fetchError

      // Remove user from participants array
      const updatedParticipants = conversation.participants.filter(
        (id: string) => id !== params.userId
      )

      // Update conversation
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ participants: updatedParticipants })
        .eq('id', params.conversationId)

      if (updateError) throw updateError
    } finally {
      setLoading(false)
    }
  }

  return { kickUser, loading }
}