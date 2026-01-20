"use client"

import { ReactNode, createContext, useContext, useEffect, useState } from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { supabase, User, getCurrentUserToken } from "@/lib/supabase"
import { useUser } from "@clerk/nextjs"
import { useGlobalMessageListener } from "@/hooks/use-global-messages"
import { useUserRefresh } from "@/contexts/user-refresh-context"

interface SupabaseContextType {
  currentUser: User | null
  loading: boolean
  error: string | null
}

const SupabaseContext = createContext<SupabaseContextType>({
  currentUser: null,
  loading: true,
  error: null
})

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

function SupabaseProviderInner({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user: clerkUser, isLoaded } = useUser()
  
  // Try to get user refresh context (might not be available)
  let triggerRefresh: (() => void) | null = null
  try {
    const userRefreshContext = useUserRefresh()
    triggerRefresh = userRefreshContext.triggerRefresh
  } catch {
    // UserRefreshProvider not available, that's okay
  }
  
  // Initialize global message listener for real-time updates
  useGlobalMessageListener()

  useEffect(() => {
    const initializeUser = async () => {
      if (!isLoaded) return
      
      if (!clerkUser) {
        setCurrentUser(null)
        setLoading(false)
        return
      }

      try {
        const tokenIdentifier = clerkUser.id
        console.log('Initializing user with token:', tokenIdentifier)
        
        // Check if user exists in Supabase
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('token_identifier', tokenIdentifier)
          .single()

        console.log('Existing user check:', { existingUser, fetchError })

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError
        }

        if (existingUser) {
          console.log('User exists, updating online status and name if needed')
          
          // Get the best available name from Clerk
          const bestName = clerkUser.fullName || 
                          clerkUser.firstName || 
                          clerkUser.username ||
                          existingUser.name ||
                          clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] || 
                          'User'
          
          // Update user's online status and ensure name is properly set
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ 
              is_online: true,
              name: bestName, // Update name in case it was missing or needs updating
              image: clerkUser.imageUrl || existingUser.image // Update image if available
            })
            .eq('id', existingUser.id)
            .select()
            .single()

          if (updateError) throw updateError
          console.log('User updated:', updatedUser)
          setCurrentUser(updatedUser)
        } else {
          console.log('Creating new user')
          // Create new user with proper name prioritization
          const userName = clerkUser.fullName || 
                          clerkUser.firstName || 
                          clerkUser.username ||
                          clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] || 
                          'User'
          
          const newUser = {
            name: userName,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            image: clerkUser.imageUrl || '/placeholder.png',
            token_identifier: tokenIdentifier,
            is_online: true
          }

          console.log('New user data:', newUser)

          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single()

          console.log('User creation result:', { createdUser, createError })

          if (createError) throw createError
          setCurrentUser(createdUser)
          
          // Trigger user list refresh when a new user is created
          if (triggerRefresh) {
            triggerRefresh()
          }
          
          // Also dispatch a global event for immediate UI updates
          window.dispatchEvent(new CustomEvent('userCreated', { 
            detail: { user: createdUser } 
          }))
        }
      } catch (err) {
        console.error('Error initializing user:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    initializeUser()
  }, [clerkUser, isLoaded])

  // Set user offline when component unmounts
  useEffect(() => {
    return () => {
      if (currentUser) {
        supabase
          .from('users')
          .update({ is_online: false })
          .eq('id', currentUser.id)
          .then(() => {
            console.log('User set to offline')
          })
      }
    }
  }, [currentUser])

  return (
    <SupabaseContext.Provider value={{ currentUser, loading, error }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export default function SupabaseProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#10b981',
        },
      }}
      telemetry={false}
    >
      <SupabaseProviderInner>
        {children}
      </SupabaseProviderInner>
    </ClerkProvider>
  )
}