"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/providers/supabase-provider'

const SocketStatus = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const { currentUser } = useSupabase()

  useEffect(() => {
    if (!currentUser) return

    // Monitor console logs for Socket.IO status
    const originalConsoleLog = console.log
    console.log = (...args) => {
      originalConsoleLog(...args)
      
      const message = args.join(' ')
      if (message.includes('✅ Socket.IO connected')) {
        setIsConnected(true)
      } else if (message.includes('❌ Socket.IO disconnected')) {
        setIsConnected(false)
      } else if (message.includes('📨 Socket.IO message received') || 
                 message.includes('✅ Message sent via Socket.IO')) {
        setMessageCount(prev => prev + 1)
      }
    }

    // Reset message count every minute
    const interval = setInterval(() => {
      setMessageCount(0)
    }, 60000)

    return () => {
      console.log = originalConsoleLog
      clearInterval(interval)
    }
  }, [currentUser])

  if (!currentUser || !isConnected) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-xs rounded-full shadow-lg">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span>Socket.IO Connected</span>
        {messageCount > 0 && (
          <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
            {messageCount}
          </span>
        )}
      </div>
    </div>
  )
}

export default SocketStatus