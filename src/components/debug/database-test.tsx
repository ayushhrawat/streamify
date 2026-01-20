"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/providers/supabase-provider'

export default function DatabaseTest() {
  const [testResults, setTestResults] = useState<any>({})
  const { currentUser } = useSupabase()

  const runTests = async () => {
    const results: any = {}

    try {
      // Test 1: Check if we can connect to Supabase
      results.connection = 'Testing connection...'
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      results.connection = connectionError ? `Error: ${connectionError.message}` : 'Connected ✅'

      // Test 2: Check current user
      results.currentUser = currentUser ? `User: ${currentUser.name} (${currentUser.id})` : 'No current user ❌'

      // Test 3: Check if users table has data
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
      
      results.users = usersError ? `Error: ${usersError.message}` : `Found ${users?.length || 0} users`

      // Test 4: Check if conversations table exists
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
      
      results.conversations = conversationsError ? `Error: ${conversationsError.message}` : `Found ${conversations?.length || 0} conversations`

      // Test 5: Test the RPC function
      if (currentUser) {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_user_conversations', { 
            user_token: currentUser.token_identifier 
          })
        
        results.rpcFunction = rpcError ? `RPC Error: ${rpcError.message}` : `RPC works, returned ${rpcData?.length || 0} conversations`
      } else {
        results.rpcFunction = 'Cannot test RPC - no current user'
      }

    } catch (error) {
      results.error = `General error: ${error}`
    }

    setTestResults(results)
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg m-4">
      <h3 className="text-lg font-bold mb-4">Database Connection Test</h3>
      
      <button 
        onClick={runTests}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600"
      >
        Run Tests
      </button>

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