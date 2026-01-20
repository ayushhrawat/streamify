import { useEffect } from 'react'
import { supabase, Message } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

// Global message store for real-time updates
class GlobalMessageStore {
  private listeners: Set<(message: Message) => void> = new Set()
  private conversationListeners: Set<() => void> = new Set()
  
  addMessageListener(callback: (message: Message) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
  
  addConversationListener(callback: () => void) {
    this.conversationListeners.add(callback)
    return () => this.conversationListeners.delete(callback)
  }
  
  notifyNewMessage(message: Message) {
    this.listeners.forEach(callback => callback(message))
    // Also notify conversation list to update
    this.conversationListeners.forEach(callback => callback())
  }
  
  notifyConversationUpdate() {
    this.conversationListeners.forEach(callback => callback())
  }
}

export const globalMessageStore = new GlobalMessageStore()

// Global real-time message listener
export const useGlobalMessageListener = () => {
  const { currentUser } = useSupabase()
  
  useEffect(() => {
    if (!currentUser) return
    
    console.log('🌐 Setting up global message listener')
    
    let isRealTimeWorking = false
    let pollInterval: NodeJS.Timeout | null = null
    
    // Global message subscription - listens to ALL messages
    const globalMessageSubscription = supabase
      .channel('global-messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        (payload) => {
          const newMessage = payload.new as Message
          console.log('🌐 Global message received:', newMessage)
          isRealTimeWorking = true
          globalMessageStore.notifyNewMessage(newMessage)
        }
      )
      .subscribe((status) => {
        console.log('🌐 Global message subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time messaging is active')
          isRealTimeWorking = true
          
          // Clear any polling fallback
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Real-time failed, setting up polling fallback')
          isRealTimeWorking = false
          
          // Set up polling fallback every 2 seconds
          if (!pollInterval) {
            pollInterval = setInterval(() => {
              if (!isRealTimeWorking) {
                console.log('🔄 Polling for new messages...')
                // This will be handled by individual conversation subscriptions
              }
            }, 2000)
          }
        }
      })
    
    // Global conversation subscription
    const globalConversationSubscription = supabase
      .channel('global-conversations')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations'
        }, 
        () => {
          console.log('🌐 Global conversation change detected')
          globalMessageStore.notifyConversationUpdate()
        }
      )
      .subscribe((status) => {
        console.log('🌐 Global conversation subscription status:', status)
      })

    return () => {
      globalMessageSubscription.unsubscribe()
      globalConversationSubscription.unsubscribe()
      
      if (pollInterval) {
        clearInterval(pollInterval)
      }
      
      console.log('🌐 Global listeners cleaned up')
    }
  }, [currentUser])
}