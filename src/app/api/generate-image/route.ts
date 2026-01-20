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
    const { conversationId, prompt, senderName } = body

    console.log('🎨 Image generation API called with:', { conversationId, prompt, userId })

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    let imageUrl = null
    let errorMessage = null

    try {
      // Try Pollinations.ai first (faster and more reliable)
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${Math.floor(Math.random() * 1000000)}`
      
      console.log('🎨 Calling Pollinations.ai...')
      const pollinationsResponse = await fetch(pollinationsUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Streamify-Chat-App'
        }
      })
      
      if (pollinationsResponse.ok) {
        const imageBlob = await pollinationsResponse.blob()
        
        // Upload to Supabase Storage
        const fileName = `generated-${Date.now()}.png`
        const filePath = `generated-images/${fileName}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filePath, imageBlob, {
            contentType: 'image/png'
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(filePath)

        imageUrl = publicUrl
        console.log('✅ Pollinations.ai image generation success')
      } else {
        throw new Error(`Pollinations.ai error: ${pollinationsResponse.status}`)
      }

    } catch (pollinationsError: any) {
      console.error('❌ Pollinations.ai Error:', pollinationsError)
      
      try {
        // Fallback to Hugging Face API
        console.log('🎨 Trying Hugging Face fallback...')
        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
          {
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                negative_prompt: "blurry, bad quality, distorted, nsfw",
                num_inference_steps: 15, // Reduced for faster generation
                guidance_scale: 7.0,
              }
            }),
          }
        )

        if (hfResponse.ok) {
          const imageBlob = await hfResponse.blob()
          
          // Upload to Supabase Storage
          const fileName = `generated-${Date.now()}.png`
          const filePath = `generated-images/${fileName}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-media')
            .upload(filePath, imageBlob, {
              contentType: 'image/png'
            })

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('chat-media')
            .getPublicUrl(filePath)

          imageUrl = publicUrl
          console.log('✅ Hugging Face fallback success')
        } else {
          throw new Error('Both image generation services failed')
        }
        
      } catch (fallbackError) {
        console.error('❌ All image generation services failed:', fallbackError)
        errorMessage = "Sorry, image generation is temporarily unavailable. Please try again later."
      }
    }

    // Save AI response message to database with correct sender
    const messageContent = imageUrl || errorMessage || "Failed to generate image"
    const messageType = imageUrl ? 'image' : 'text'

    const { data: aiMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'ai-artist', // Use consistent sender identifier
        content: messageContent,
        message_type: messageType
      })
      .select()
      .single()

    if (saveError) throw saveError

    console.log('✅ Generated image message saved to database')
    
    return NextResponse.json({
      aiMessage,
      success: true
    })

  } catch (error) {
    console.error('❌ Error in image generation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}