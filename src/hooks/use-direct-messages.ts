import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'
import toast from 'react-hot-toast'

export const useDirectMessages = () => {
  const [loading, setLoading] = useState(false)
  const { currentUser } = useSupabase()

  const sendMessage = async (params: {
    conversationId: string
    content: string
    messageType?: 'text' | 'image' | 'video'
    sender?: string
  }) => {
    console.log('📤 Direct message send started:', params)
    
    if (!currentUser) {
      console.error('❌ No current user')
      throw new Error('User not authenticated')
    }

    if (!params.content.trim()) {
      console.error('❌ Empty message content')
      throw new Error('Message cannot be empty')
    }

    if (!params.conversationId) {
      console.error('❌ No conversation ID')
      throw new Error('No conversation selected')
    }

    setLoading(true)

    try {
      // Use the provided sender or default to current user
      const senderId = params.sender || currentUser.id;
      
      // Insert message directly into database
      const messageData = {
        conversation_id: params.conversationId,
        sender: senderId,
        content: params.content.trim(),
        message_type: params.messageType || 'text'
      }

      console.log('💾 Inserting message to database:', messageData)

      // Direct insert for speed
      const { data: newMessage, error: insertError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (insertError) {
        console.error('❌ Database insert failed:', insertError)
        throw new Error(`Database error: ${insertError.message}`)
      }

      console.log('✅ Message inserted successfully:', newMessage)

      // Update conversation's last message in parallel (don't wait for it)
      supabase
        .from('conversations')
        .update({
          last_message_content: params.content.trim(),
          last_message_created_at: new Date().toISOString(),
          last_message_sender: senderId,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.conversationId)
        .then(({ error: updateError }) => {
          if (updateError) {
            console.warn('⚠️ Failed to update conversation:', updateError)
          } else {
            console.log('✅ Conversation updated successfully')
          }
        })

      // Dispatch custom event for conversation list updates
      window.dispatchEvent(new CustomEvent('messageSent', {
        detail: { 
          conversationId: params.conversationId, 
          message: newMessage 
        }
      }))

      return newMessage

    } catch (error) {
      console.error('❌ Message send failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    sendMessage,
    loading
  }
}