import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

// Global conversation update manager
class ConversationUpdateManager {
  private updateListeners: Set<() => void> = new Set()
  private lastUpdateTime: number = 0

  addUpdateListener(callback: () => void) {
    this.updateListeners.add(callback)
    return () => this.updateListeners.delete(callback)
  }

  triggerUpdate() {
    const now = Date.now()
    // Increased debounce time to reduce frequent updates
    if (now - this.lastUpdateTime > 1000) {
      this.lastUpdateTime = now
      console.log('🔄 Triggering conversation list update')
      this.updateListeners.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('Error in conversation update listener:', error)
        }
      })
    }
  }
}

const conversationUpdateManager = new ConversationUpdateManager()

export const useConversationUpdates = () => {
  const { currentUser } = useSupabase()

  useEffect(() => {
    if (!currentUser) return

    console.log('🌐 Setting up conversation update listeners')

    // Listen for new messages globally
    const messagesChannel = supabase
      .channel('conversation-updates-messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        (payload) => {
          console.log('📨 New message detected for conversation updates:', payload.new.id)
          conversationUpdateManager.triggerUpdate()
        }
      )
      .subscribe((status) => {
        console.log('📨 Messages update subscription status:', status)
      })

    // Listen for conversation changes
    const conversationsChannel = supabase
      .channel('conversation-updates-conversations')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations'
        }, 
        () => {
          console.log('💬 Conversation change detected')
          conversationUpdateManager.triggerUpdate()
        }
      )
      .subscribe((status) => {
        console.log('💬 Conversations update subscription status:', status)
      })

    // Reduced polling to prevent constant loading
    const pollingInterval = setInterval(() => {
      conversationUpdateManager.triggerUpdate()
    }, 30000) // Every 30 seconds (much less frequent)

    // Listen for custom message sent events
    const handleMessageSent = () => {
      console.log('📨 Custom message sent event received')
      conversationUpdateManager.triggerUpdate()
    }

    window.addEventListener('messageSent', handleMessageSent)

    return () => {
      messagesChannel.unsubscribe()
      conversationsChannel.unsubscribe()
      clearInterval(pollingInterval)
      window.removeEventListener('messageSent', handleMessageSent)
    }
  }, [currentUser])

  return {
    addUpdateListener: conversationUpdateManager.addUpdateListener.bind(conversationUpdateManager),
    triggerUpdate: conversationUpdateManager.triggerUpdate.bind(conversationUpdateManager)
  }
}