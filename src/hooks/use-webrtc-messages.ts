import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Message } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

// Global WebRTC connection manager
class WebRTCMessageManager {
  private connections: Map<string, RTCPeerConnection> = new Map()
  private dataChannels: Map<string, RTCDataChannel> = new Map()
  private messageListeners: Set<(message: Message) => void> = new Set()
  private conversationListeners: Set<() => void> = new Set()
  private currentUserId: string | null = null
  private signalingChannel: any = null

  async initialize(userId: string) {
    this.currentUserId = userId
    console.log('🚀 Initializing WebRTC Message Manager for user:', userId)
    
    // Set up signaling channel via Supabase
    this.signalingChannel = supabase
      .channel(`webrtc-signaling-${userId}`)
      .on('broadcast', { event: 'webrtc-offer' }, (payload) => {
        this.handleOffer(payload.payload)
      })
      .on('broadcast', { event: 'webrtc-answer' }, (payload) => {
        this.handleAnswer(payload.payload)
      })
      .on('broadcast', { event: 'webrtc-ice' }, (payload) => {
        this.handleIceCandidate(payload.payload)
      })
      .subscribe()

    console.log('✅ WebRTC signaling channel established')
  }

  async connectToPeer(peerId: string) {
    if (this.connections.has(peerId)) {
      console.log('Already connected to peer:', peerId)
      return
    }

    console.log('🔗 Connecting to peer:', peerId)
    
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    // Create data channel for messages
    const dataChannel = peerConnection.createDataChannel('messages', {
      ordered: true
    })

    dataChannel.onopen = () => {
      console.log('✅ Data channel opened with peer:', peerId)
      this.dataChannels.set(peerId, dataChannel)
    }

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as Message
        console.log('📨 Received WebRTC message:', message)
        this.notifyMessageListeners(message)
      } catch (error) {
        console.error('Error parsing WebRTC message:', error)
      }
    }

    dataChannel.onerror = (error) => {
      console.error('Data channel error with peer', peerId, error)
    }

    // Handle incoming data channels
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel
      channel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as Message
          console.log('📨 Received WebRTC message from incoming channel:', message)
          this.notifyMessageListeners(message)
        } catch (error) {
          console.error('Error parsing incoming WebRTC message:', error)
        }
      }
      this.dataChannels.set(peerId, channel)
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage('webrtc-ice', {
          to: peerId,
          from: this.currentUserId,
          candidate: event.candidate
        })
      }
    }

    this.connections.set(peerId, peerConnection)

    // Create and send offer
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    this.sendSignalingMessage('webrtc-offer', {
      to: peerId,
      from: this.currentUserId,
      offer: offer
    })
  }

  private async handleOffer(data: any) {
    if (data.to !== this.currentUserId) return

    console.log('📞 Received WebRTC offer from:', data.from)
    
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    // Handle incoming data channels
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel
      channel.onopen = () => {
        console.log('✅ Incoming data channel opened from peer:', data.from)
        this.dataChannels.set(data.from, channel)
      }
      channel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as Message
          console.log('📨 Received WebRTC message from offer:', message)
          this.notifyMessageListeners(message)
        } catch (error) {
          console.error('Error parsing WebRTC message from offer:', error)
        }
      }
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage('webrtc-ice', {
          to: data.from,
          from: this.currentUserId,
          candidate: event.candidate
        })
      }
    }

    this.connections.set(data.from, peerConnection)

    await peerConnection.setRemoteDescription(data.offer)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    this.sendSignalingMessage('webrtc-answer', {
      to: data.from,
      from: this.currentUserId,
      answer: answer
    })
  }

  private async handleAnswer(data: any) {
    if (data.to !== this.currentUserId) return

    console.log('📞 Received WebRTC answer from:', data.from)
    
    const peerConnection = this.connections.get(data.from)
    if (peerConnection) {
      await peerConnection.setRemoteDescription(data.answer)
    }
  }

  private async handleIceCandidate(data: any) {
    if (data.to !== this.currentUserId) return

    const peerConnection = this.connections.get(data.from)
    if (peerConnection) {
      await peerConnection.addIceCandidate(data.candidate)
    }
  }

  private sendSignalingMessage(event: string, payload: any) {
    if (this.signalingChannel) {
      this.signalingChannel.send({
        type: 'broadcast',
        event: event,
        payload: payload
      })
    }
  }

  sendMessage(message: Message, recipientIds: string[]) {
    console.log('📤 Sending WebRTC message to recipients:', recipientIds)
    
    recipientIds.forEach(recipientId => {
      const dataChannel = this.dataChannels.get(recipientId)
      if (dataChannel && dataChannel.readyState === 'open') {
        try {
          dataChannel.send(JSON.stringify(message))
          console.log('✅ Message sent via WebRTC to:', recipientId)
        } catch (error) {
          console.error('Error sending WebRTC message to', recipientId, error)
        }
      } else {
        console.log('⚠️ No WebRTC connection to', recipientId, 'attempting to connect...')
        this.connectToPeer(recipientId)
      }
    })
  }

  addMessageListener(callback: (message: Message) => void): () => void {
    this.messageListeners.add(callback)
    return () => this.messageListeners.delete(callback)
  }

  addConversationListener(callback: () => void): () => void {
    this.conversationListeners.add(callback)
    return () => this.conversationListeners.delete(callback)
  }

  private notifyMessageListeners(message: Message) {
    this.messageListeners.forEach(listener => {
      try {
        listener(message)
      } catch (error) {
        console.error('Error in message listener:', error)
      }
    })
    
    // Also notify conversation listeners
    this.conversationListeners.forEach(listener => {
      try {
        listener()
      } catch (error) {
        console.error('Error in conversation listener:', error)
      }
    })
  }

  cleanup() {
    this.connections.forEach(connection => connection.close())
    this.connections.clear()
    this.dataChannels.clear()
    this.messageListeners.clear()
    this.conversationListeners.clear()
    if (this.signalingChannel) {
      this.signalingChannel.unsubscribe()
    }
  }
}

// Global instance
const webrtcManager = new WebRTCMessageManager()

export const useWebRTCMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentUser } = useSupabase()
  const messagesRef = useRef<Message[]>([])

  // Fetch messages from database
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !currentUser) {
      setMessages([])
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const fetchedMessages = data || []
      setMessages(fetchedMessages)
      messagesRef.current = fetchedMessages
      
      console.log(`📨 Fetched ${fetchedMessages.length} messages for conversation ${conversationId}`)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [conversationId, currentUser])

  // Initialize WebRTC when user is available
  useEffect(() => {
    if (!currentUser) return

    webrtcManager.initialize(currentUser.id)

    return () => {
      // Don't cleanup on unmount, keep connections alive
    }
  }, [currentUser])

  // Set up message listener for current conversation
  useEffect(() => {
    if (!conversationId) return

    const unsubscribe = webrtcManager.addMessageListener((newMessage) => {
      if (newMessage.conversation_id === conversationId) {
        console.log('📨 WebRTC message received for current conversation:', newMessage.id)
        
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg => msg.id === newMessage.id)
          if (exists) return prev
          
          const updated = [...prev, newMessage].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          messagesRef.current = updated
          return updated
        })
      }
    })

    return unsubscribe
  }, [conversationId])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Also set up Supabase real-time as backup
  useEffect(() => {
    if (!conversationId || !currentUser) return

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        (payload) => {
          const newMessage = payload.new as Message
          console.log('📨 Supabase backup message received:', newMessage.id)
          
          // Only add if not already added by WebRTC
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) return prev
            
            const updated = [...prev, newMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            return updated
          })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId, currentUser])

  return { messages, loading, error, refetch: fetchMessages }
}

export const useSendWebRTCMessage = () => {
  const [loading, setLoading] = useState(false)
  const { currentUser } = useSupabase()

  const sendTextMessage = async (params: {
    conversationId: string
    content: string
  }) => {
    if (!currentUser) throw new Error('User not authenticated')

    setLoading(true)

    try {
      // First, save to database
      const messageData = {
        conversation_id: params.conversationId,
        sender: currentUser.id,
        content: params.content,
        message_type: 'text' as const
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (error) throw error

      // Get conversation participants
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('participants')
        .eq('id', params.conversationId)
        .single()

      if (convError) throw convError

      // Send via WebRTC to all participants except sender
      const recipients = conversation.participants.filter((id: string) => id !== currentUser.id)
      webrtcManager.sendMessage(data, recipients)

      console.log('✅ Message sent via WebRTC and saved to database:', data.id)
      return data
    } finally {
      setLoading(false)
    }
  }

  return { sendTextMessage, loading }
}

// Global conversation updates via WebRTC
export const useWebRTCConversations = () => {
  const [updateTrigger, setUpdateTrigger] = useState(0)
  const { currentUser } = useSupabase()

  useEffect(() => {
    if (!currentUser) return

    const unsubscribe = webrtcManager.addConversationListener(() => {
      console.log('🔄 WebRTC conversation update received')
      setUpdateTrigger(prev => prev + 1)
    })

    return unsubscribe
  }, [currentUser])

  return { updateTrigger }
}