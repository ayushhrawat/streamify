"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/providers/supabase-provider'

const AggressiveRealtimeStatus = () => {
  const [status, setStatus] = useState<'connecting' | 'realtime' | 'polling' | 'offline'>('connecting')
  const [messageCount, setMessageCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const { currentUser } = useSupabase()

  useEffect(() => {
    if (!currentUser) {
      setStatus('offline')
      return
    }

    let messageCountInterval: NodeJS.Timeout
    let statusCheckInterval: NodeJS.Timeout

    // Monitor console logs to determine status
    const originalConsoleLog = console.log
    console.log = (...args) => {
      originalConsoleLog(...args)
      
      const message = args.join(' ')
      if (message.includes('✅ Real-time is ACTIVE')) {
        setStatus('realtime')
        setLastUpdate(new Date())
      } else if (message.includes('🔄 Starting aggressive polling')) {
        setStatus('polling')
        setLastUpdate(new Date())
      } else if (message.includes('🔥 Real-time message received') || 
                 message.includes('📨 Fetched') || 
                 message.includes('🔄 Polling found new messages')) {
        setMessageCount(prev => prev + 1)
        setLastUpdate(new Date())
      }
    }

    // Check status every 5 seconds
    statusCheckInterval = setInterval(() => {
      if (lastUpdate && Date.now() - lastUpdate.getTime() > 30000) {
        setStatus('offline')
      }
    }, 5000)

    // Reset message count every minute
    messageCountInterval = setInterval(() => {
      setMessageCount(0)
    }, 60000)

    return () => {
      console.log = originalConsoleLog
      clearInterval(statusCheckInterval)
      clearInterval(messageCountInterval)
    }
  }, [currentUser, lastUpdate])

  if (!currentUser) return null

  const getStatusColor = () => {
    switch (status) {
      case 'realtime': return 'bg-green-500'
      case 'polling': return 'bg-yellow-500'
      case 'connecting': return 'bg-blue-500'
      case 'offline': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'realtime': return 'Real-time Active'
      case 'polling': return 'Polling Mode'
      case 'connecting': return 'Connecting...'
      case 'offline': return 'Offline'
      default: return 'Unknown'
    }
  }

  const getStatusDescription = () => {
    switch (status) {
      case 'realtime': return 'Messages appear instantly'
      case 'polling': return 'Messages appear within 3 seconds'
      case 'connecting': return 'Setting up connection...'
      case 'offline': return 'No connection - refresh page'
      default: return ''
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center gap-3 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-300 ${
        status === 'realtime' 
          ? 'bg-green-600 shadow-green-200' 
          : status === 'polling'
          ? 'bg-yellow-600 shadow-yellow-200'
          : status === 'connecting'
          ? 'bg-blue-600 shadow-blue-200'
          : 'bg-red-600 shadow-red-200'
      } shadow-lg`}>
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${
          status === 'realtime' ? 'animate-pulse' : ''
        }`} />
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{getStatusText()}</span>
            {messageCount > 0 && (
              <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                {messageCount} msgs/min
              </span>
            )}
          </div>
          <span className="text-xs opacity-90">{getStatusDescription()}</span>
          {lastUpdate && (
            <span className="text-xs opacity-75">
              Last: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default AggressiveRealtimeStatus