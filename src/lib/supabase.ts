import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on your schema
export interface User {
  id: string
  name?: string
  email: string
  image: string
  token_identifier: string
  is_online: boolean
  pinned_conversations?: string[]
  blocked_users?: string[]
  muted_conversations?: string[]
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
  // Additional fields from the function
  other_user_name?: string
  other_user_image?: string
  other_user_email?: string
  other_user_is_online?: boolean
  last_message_content?: string
  last_message_created_at?: string
  last_message_sender?: string
  unread_count?: number
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

export interface MessageReadStatus {
  id: string
  message_id?: string
  conversation_id?: string
  user_id: string
  read_at?: string
  last_read_at?: string
  created_at: string
}

// Helper function to get current user from Clerk
export const getCurrentUserToken = () => {
  // This will be populated by Clerk auth
  if (typeof window !== 'undefined') {
    // For now, we'll use a mock token - this should be replaced with actual Clerk token
    return 'mock-user-token'
  }
  return null
}