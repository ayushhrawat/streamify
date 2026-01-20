// Mock data for testing - will be replaced with Supabase data
export const mockUsers = [
  {
    id: "user1",
    _id: "user1",
    name: "John Doe",
    email: "john@example.com",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    is_online: true,
    isOnline: true,
    token_identifier: "user_1",
    tokenIdentifier: "user_1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user2",
    _id: "user2", 
    name: "Jane Smith",
    email: "jane@example.com",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    is_online: false,
    isOnline: false,
    token_identifier: "user_2",
    tokenIdentifier: "user_2",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user3",
    _id: "user3",
    name: "Mike Johnson", 
    email: "mike@example.com",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    is_online: true,
    isOnline: true,
    token_identifier: "user_3",
    tokenIdentifier: "user_3",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const mockConversations = [
  {
    id: "conv1",
    _id: "conv1",
    participants: ["current_user", "user1"],
    is_group: false,
    isGroup: false,
    name: "John Doe",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lastMessage: {
      _id: "msg1",
      content: "Hey, how are you?",
      sender: "user1",
      messageType: "text",
      _creationTime: Date.now() - 3600000
    }
  }
];

export const mockMessages = [
  {
    _id: "msg1",
    content: "Hey, how are you?",
    sender: {
      _id: "user1",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      name: "John Doe",
      tokenIdentifier: "user_1",
      email: "john@example.com",
      _creationTime: Date.now() - 86400000,
      isOnline: true
    },
    conversation: "conv1",
    messageType: "text" as const,
    _creationTime: Date.now() - 3600000
  },
  {
    _id: "msg2", 
    content: "I'm doing great! How about you?",
    sender: {
      _id: "current_user",
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
      name: "You",
      tokenIdentifier: "current_user",
      email: "you@example.com",
      _creationTime: Date.now() - 86400000,
      isOnline: true
    },
    conversation: "conv1",
    messageType: "text" as const,
    _creationTime: Date.now() - 3000000
  }
];

export const mockCurrentUser = {
  id: "current_user",
  _id: "current_user",
  name: "You",
  email: "you@example.com", 
  image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
  is_online: true,
  isOnline: true,
  token_identifier: "current_user",
  tokenIdentifier: "current_user",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};