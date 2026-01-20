"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

const RealtimeStatus = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null)
  const { currentUser } = useSupabase()

  useEffect(() => {
    if (!currentUser) return

    // Monitor connection status
    const channel = supabase
      .channel('status-check')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        () => {
          setIsConnected(true)
          setLastMessageTime(new Date())
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Check connection every 30 seconds
    const interval = setInterval(() => {
      if (lastMessageTime && Date.now() - lastMessageTime.getTime() > 30000) {
        // No messages received in 30 seconds, might be disconnected
        setIsConnected(false)
      }
    }, 30000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [currentUser, lastMessageTime])

  if (!currentUser) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
        isConnected 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
        }`} />
        {isConnected ? 'Real-time Active' : 'Polling Mode'}
      </div>
    </div>
  )
}

export default RealtimeStatus