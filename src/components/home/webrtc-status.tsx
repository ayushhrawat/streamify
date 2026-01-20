"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/providers/supabase-provider'

const WebRTCStatus = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionCount, setConnectionCount] = useState(0)
  const { currentUser } = useSupabase()

  useEffect(() => {
    if (!currentUser) return

    // Monitor console logs for WebRTC status
    const originalConsoleLog = console.log
    console.log = (...args) => {
      originalConsoleLog(...args)
      
      const message = args.join(' ')
      if (message.includes('✅ Data channel opened with peer') || 
          message.includes('✅ Incoming data channel opened from peer')) {
        setIsConnected(true)
        setConnectionCount(prev => prev + 1)
      } else if (message.includes('🚀 Initializing WebRTC Message Manager')) {
        setIsConnected(false)
        setConnectionCount(0)
      }
    }

    return () => {
      console.log = originalConsoleLog
    }
  }, [currentUser])

  if (!currentUser || !isConnected) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-xs rounded-full shadow-lg">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span>WebRTC Active ({connectionCount})</span>
      </div>
    </div>
  )
}

export default WebRTCStatus