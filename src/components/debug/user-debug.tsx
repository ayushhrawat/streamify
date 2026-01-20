"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'
import { useUser } from '@clerk/nextjs'

export default function UserDebug() {
  const [testResults, setTestResults] = useState<any>({})
  const { currentUser, loading, error } = useSupabase()
  const { user: clerkUser } = useUser()

  const runUserTests = async () => {
    const results: any = {}

    try {
      // Test 1: Check Clerk user
      results.clerkUser = clerkUser ? `✅ Clerk user: ${clerkUser.id} (${clerkUser.emailAddresses[0]?.emailAddress})` : '❌ No Clerk user'

      // Test 2: Check Supabase current user
      results.supabaseUser = currentUser ? `✅ Supabase user: ${currentUser.id} (${currentUser.name})` : '❌ No Supabase user'

      // Test 3: Check if we can read users table
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
      
      results.usersTable = usersError ? `❌ Error: ${usersError.message}` : `✅ Found ${allUsers?.length || 0} users`

      // Test 4: Try to create a test user
      if (clerkUser) {
        const testUser = {
          name: 'Test User',
          email: 'test@example.com',
          image: '/placeholder.png',
          token_identifier: `test-${Date.now()}`,
          is_online: true
        }

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert(testUser)
          .select()
          .single()

        results.userCreation = createError ? `❌ Create error: ${createError.message}` : `✅ Created test user: ${createdUser.id}`

        // Clean up test user
        if (createdUser) {
          await supabase.from('users').delete().eq('id', createdUser.id)
        }
      }

      // Test 5: Check conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
      
      results.conversations = convError ? `❌ Error: ${convError.message}` : `✅ Found ${conversations?.length || 0} conversations`

      // Test 6: Check messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
      
      results.messages = msgError ? `❌ Error: ${msgError.message}` : `✅ Found ${messages?.length || 0} messages`

    } catch (error) {
      results.error = `❌ General error: ${error}`
    }

    setTestResults(results)
  }

  const forceCreateUser = async () => {
    if (!clerkUser) {
      alert('No Clerk user found')
      return
    }

    try {
      const newUser = {
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        image: clerkUser.imageUrl || '/placeholder.png',
        token_identifier: clerkUser.id,
        is_online: true
      }

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single()

      if (createError) {
        alert(`Error creating user: ${createError.message}`)
      } else {
        alert(`User created successfully: ${createdUser.name}`)
        runUserTests() // Refresh tests
      }
    } catch (error) {
      alert(`Error: ${error}`)
    }
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg m-4">
      <h3 className="text-lg font-bold mb-4">User Debug Panel</h3>
      
      <div className="space-y-2 mb-4">
        <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        <div><strong>Error:</strong> {error || 'None'}</div>
        <div><strong>Current User:</strong> {currentUser?.name || 'None'}</div>
        <div><strong>Clerk User:</strong> {clerkUser?.emailAddresses[0]?.emailAddress || 'None'}</div>
      </div>

      <div className="space-x-2 mb-4">
        <button 
          onClick={runUserTests}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Run Tests
        </button>
        
        <button 
          onClick={forceCreateUser}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Force Create User
        </button>
      </div>

      <div className="space-y-2">
        {Object.entries(testResults).map(([key, value]) => (
          <div key={key} className="text-sm">
            <strong>{key}:</strong> {String(value)}
          </div>
        ))}
      </div>
    </div>
  )
}