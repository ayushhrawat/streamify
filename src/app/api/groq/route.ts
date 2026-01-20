import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, messageContent } = body

    console.log('🤖 Groq AI called with:', { conversationId, messageContent, userId })

    if (!messageContent || messageContent.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    let aiResponse = "I'm sorry, I couldn't generate a response."

    try {
      // Get recent messages for context
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (messagesError) throw messagesError

      // Prepare conversation context
      const conversationHistory = messages
        .reverse()
        .map(msg => `${msg.sender}: ${msg.content}`)
        .join('\n')

      // Call Groq API
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // Fast and good model
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant in Streamify chat application. Respond naturally and conversationally. Keep responses concise and friendly. Be helpful and engaging.'
            },
            {
              role: 'user',
              content: `Recent conversation:\n${conversationHistory}\n\nLatest message: ${messageContent}\n\nPlease respond as an AI assistant:`
            }
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Groq API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      aiResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response."
      console.log('✅ Groq API success:', aiResponse)

    } catch (groqError: any) {
      console.error('❌ Groq API Error:', groqError)
      
      // Fallback to mock responses if Groq fails
      aiResponse = generateMockResponse(messageContent)
      console.log('🔄 Using fallback response:', aiResponse)
    }

    // Save AI response to database using the AI Assistant token
    const { data: newMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'ai-assistant', // Use the AI user token identifier
        content: aiResponse,
        message_type: 'text'
      })
      .select()
      .single()

    if (saveError) {
      console.error('❌ Error saving AI message:', saveError)
      throw saveError
    }

    console.log('✅ AI response saved to database')
    return NextResponse.json({
      message: newMessage,
      success: true
    })
  } catch (error) {
    console.error('❌ Error in AI API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Mock response generator as fallback
function generateMockResponse(messageContent: string): string {
  const message = messageContent.toLowerCase()
  
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hello! I'm your AI assistant. How can I help you today? 😊"
  }
  
  if (message.includes('how are you')) {
    return "I'm doing great, thank you for asking! I'm here and ready to help with any questions you have. How are you doing?"
  }
  
  if (message.includes('help') || message.includes('assist')) {
    return "I'd be happy to help! I can assist with questions, provide information, help with coding, writing, or just have a conversation. What would you like to know?"
  }
  
  if (message.includes('code') || message.includes('programming') || message.includes('javascript') || message.includes('react')) {
    return "I'd love to help with coding! What programming language or specific coding question do you have?"
  }
  
  if (message.includes('weather')) {
    return "I don't have access to real-time weather data, but I'd recommend checking a weather app or website for current conditions in your area!"
  }
  
  if (message.includes('time') || message.includes('date')) {
    return "I don't have access to real-time information, but you can check the current time and date on your device!"
  }
  
  if (message.includes('thank') || message.includes('thanks')) {
    return "You're very welcome! I'm glad I could help. Feel free to ask me anything else! 😊"
  }
  
  if (message.includes('bye') || message.includes('goodbye')) {
    return "Goodbye! It was nice chatting with you. Feel free to come back anytime if you have more questions! 👋"
  }
  
  if (message.includes('?')) {
    return "That's a great question! I'm here to help. Could you provide more details about what you're looking for?"
  }
  
  const defaultResponses = [
    "That's an interesting question! I'm here to help however I can. What would you like to know more about?",
    "I appreciate you reaching out! How can I assist you today?",
    "Thanks for your message! I'm here to help. What would you like to explore?",
    "I'm listening! How can I help you with that topic?",
    "That's a great point! Could you tell me more about what you're thinking?",
    "Interesting! I'd love to help you with that. What specific aspect would you like to discuss?",
    "I'm here to help! What would you like to know or talk about?",
    "That sounds intriguing! How can I assist you further with that?"
  ]
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
}