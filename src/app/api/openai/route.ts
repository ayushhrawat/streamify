import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, messageContent } = body

    console.log('🤖 ChatGPT API called with:', { conversationId, messageContent })

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

      // Try to generate AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are ChatGPT, a helpful AI assistant in Streamify chat application. Respond naturally and conversationally. Keep responses concise and friendly."
          },
          {
            role: "user",
            content: `Recent conversation:\n${conversationHistory}\n\nLatest message: ${messageContent}\n\nPlease respond as ChatGPT:`
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      })

      aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response."
      console.log('✅ OpenAI API success')

    } catch (openaiError: any) {
      console.error('❌ OpenAI API Error:', openaiError)
      
      // Handle quota exceeded error with mock responses
      if (openaiError?.error?.code === 'insufficient_quota' || 
          openaiError?.message?.includes('quota') ||
          openaiError?.message?.includes('billing') ||
          openaiError?.status === 429) {
        
        console.log('💡 Using mock ChatGPT response due to quota limit')
        
        // Generate mock responses based on message content
        aiResponse = generateMockResponse(messageContent)
      } else {
        // For other errors, use a generic fallback
        aiResponse = "I'm currently experiencing technical difficulties. Please try again later! 🤖"
      }
    }

    // Save AI response to database
    const { data: newMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'ChatGPT',
        content: aiResponse,
        message_type: 'text'
      })
      .select()
      .single()

    if (saveError) throw saveError

    console.log('✅ ChatGPT response saved to database')
    return NextResponse.json(newMessage)
  } catch (error) {
    console.error('❌ Error in ChatGPT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Mock response generator for when quota is exceeded
function generateMockResponse(messageContent: string): string {
  const message = messageContent.toLowerCase()
  
  // Greeting responses
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hello! I'm ChatGPT, your AI assistant. How can I help you today? 😊 (Note: I'm currently running on limited resources)"
  }
  
  // How are you responses
  if (message.includes('how are you')) {
    return "I'm doing great, thank you for asking! I'm here and ready to help with any questions you have. How are you doing? (Running on backup mode)"
  }
  
  // Help requests
  if (message.includes('help') || message.includes('assist')) {
    return "I'd be happy to help! I can assist with questions, provide information, help with coding, writing, or just have a conversation. What would you like to know? (Limited mode active)"
  }
  
  // Coding related
  if (message.includes('code') || message.includes('programming') || message.includes('javascript') || message.includes('react')) {
    return "I'd love to help with coding! While I'm currently running on limited resources, I can still provide basic programming guidance. What specific coding question do you have?"
  }
  
  // Weather
  if (message.includes('weather')) {
    return "I don't have access to real-time weather data, but I'd recommend checking a weather app or website for the most current conditions in your area!"
  }
  
  // Time
  if (message.includes('time') || message.includes('date')) {
    return "I don't have access to real-time information, but you can check the current time and date on your device!"
  }
  
  // Thank you
  if (message.includes('thank') || message.includes('thanks')) {
    return "You're very welcome! I'm glad I could help. Feel free to ask me anything else! 😊"
  }
  
  // Goodbye
  if (message.includes('bye') || message.includes('goodbye') || message.includes('see you')) {
    return "Goodbye! It was nice chatting with you. Feel free to come back anytime if you have more questions! 👋"
  }
  
  // Questions
  if (message.includes('?')) {
    return "That's a great question! While I'm currently operating with limited capabilities due to API quota limits, I'm still here to help as best I can. Could you provide more specific details?"
  }
  
  // Default responses
  const defaultResponses = [
    "That's an interesting message! While I'm currently running on limited resources due to API quota, I'm still here to help as best I can. 🤖",
    "I appreciate you reaching out! I'm operating with reduced capabilities right now, but I'm still happy to chat and help where I can.",
    "Thanks for your message! I'm currently in backup mode due to API limits, but I'm still here to assist you. Could you tell me more about what you're looking for?",
    "I'm here and listening! While my responses are simpler right now due to quota limitations, I'm still ready to help however I can.",
    "That's interesting! I'm currently operating with basic responses due to API quota limits, but I'd still like to help. Can you provide more details?"
  ]
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
}