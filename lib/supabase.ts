import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface User {
  id: string
  name?: string
  email: string
  image: string
  token_identifier: string
  is_online: boolean
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  participants: string[]
  is_group: boolean
  group_name?: string
  group_image?: string
  admin?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender: string
  content: string
  message_type: 'text' | 'image' | 'video'
  created_at: string
  updated_at: string
}

// Helper functions for real-time subscriptions
export const subscribeToConversations = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('conversations')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'conversations',
        filter: `participants.cs.{${userId}}`
      }, 
      callback
    )
    .subscribe()
}

export const subscribeToMessages = (conversationId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, 
      callback
    )
    .subscribe()
}