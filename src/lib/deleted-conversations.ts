// Utility functions for managing deleted conversations in localStorage

const DELETED_CONVERSATIONS_KEY = 'streamify_deleted_conversations';

export const getDeletedConversations = (userId?: string): string[] => {
  if (typeof window === 'undefined' || !userId) return [];
  
  try {
    const key = `${DELETED_CONVERSATIONS_KEY}_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (error) {
    console.error('Error getting deleted conversations:', error);
    return [];
  }
};

export const addDeletedConversation = (conversationId: string, userId?: string): void => {
  if (typeof window === 'undefined' || !userId) return;
  
  try {
    const key = `${DELETED_CONVERSATIONS_KEY}_${userId}`;
    const deletedConversations = getDeletedConversations(userId);
    
    if (!deletedConversations.includes(conversationId)) {
      deletedConversations.push(conversationId);
      localStorage.setItem(key, JSON.stringify(deletedConversations));
    }
  } catch (error) {
    console.error('Error adding deleted conversation:', error);
  }
};

export const removeDeletedConversation = (conversationId: string, userId?: string): void => {
  if (typeof window === 'undefined' || !userId) return;
  
  try {
    const key = `${DELETED_CONVERSATIONS_KEY}_${userId}`;
    const deletedConversations = getDeletedConversations(userId);
    const updatedDeleted = deletedConversations.filter(id => id !== conversationId);
    localStorage.setItem(key, JSON.stringify(updatedDeleted));
  } catch (error) {
    console.error('Error removing deleted conversation:', error);
  }
};

export const isConversationDeleted = (conversationId: string, userId?: string): boolean => {
  const deletedConversations = getDeletedConversations(userId);
  return deletedConversations.includes(conversationId);
};