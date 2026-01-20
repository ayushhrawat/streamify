# WhatsApp Clone Setup Instructions

## Current Issue
The chat functionality is currently disabled because the Convex backend needs to be properly configured. Here's how to fix it:

## Steps to Enable Chat Functionality

### 1. Start Convex Development Server
```bash
npx convex dev
```

If this fails with a network error, try:
- Check your internet connection
- Try running: `npx convex login` first
- Then run: `npx convex dev`

### 2. Configure Clerk JWT Template
1. Go to your Clerk Dashboard: https://dashboard.clerk.com/
2. Navigate to your app: "rational-whippet-25"
3. Go to "JWT Templates" in the sidebar
4. Create a new template named "convex"
5. Set the template content to:
```json
{
  "iss": "https://rational-whippet-25.clerk.accounts.dev",
  "sub": "{{user.id}}",
  "aud": "convex",
  "exp": {{exp}},
  "iat": {{iat}},
  "tokenIdentifier": "{{user.id}}"
}
```

### 3. Update Convex Auth Config
Make sure your `convex/auth.config.ts` matches your Clerk domain:
```typescript
const authConfig = {
  providers: [
    {
      domain: "https://rational-whippet-25.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

### 4. Re-enable Database Queries
Once Convex is running properly, uncomment the queries in these files:

**src/components/home/left-panel.tsx:**
```typescript
const conversations = useQuery(api.conversations.getMyConversations);
```

**src/components/home/message-container.tsx:**
```typescript
const messages = useQuery(api.messages.getMessages, 
  selectedConversation ? { conversation: selectedConversation._id } : "skip"
);
const me = useQuery(api.users.getMe);
```

**src/components/home/user-list-dialog.tsx:**
```typescript
const createConversation = useMutation(api.conversations.createConversation);
const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);
const me = useQuery(api.users.getMe);
const users = useQuery(api.users.getUsers);
```

### 5. Test the Application
1. Sign up/login with different email addresses in different browser windows
2. Click the "New Chat" button (MessageSquareDiff icon)
3. You should see other users in the dialog
4. Select a user and click "Create" to start a conversation

## Troubleshooting

### If you get "Unauthorized" errors:
- Make sure the JWT template is correctly configured in Clerk
- Ensure the domain in `auth.config.ts` matches your Clerk instance

### If Convex won't start:
- Try `npx convex login` first
- Check your internet connection
- Make sure you're in the correct directory

### If no users appear in the dialog:
- Make sure you've signed up with multiple accounts
- Check that the Convex queries are uncommented
- Verify that the backend is running with `npx convex dev`

## Current Status
- ✅ Frontend UI is working
- ✅ Clerk authentication is configured
- ❌ Convex backend needs to be started
- ❌ JWT template needs to be configured
- ❌ Database queries are currently disabled

Once you complete the setup steps above, the chat functionality will work properly!