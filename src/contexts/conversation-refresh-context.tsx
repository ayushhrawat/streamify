"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface ConversationRefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

const ConversationRefreshContext = createContext<ConversationRefreshContextType | undefined>(undefined);

export const ConversationRefreshProvider = ({ children }: { children: ReactNode }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <ConversationRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </ConversationRefreshContext.Provider>
  );
};

export const useConversationRefresh = () => {
  const context = useContext(ConversationRefreshContext);
  if (context === undefined) {
    throw new Error('useConversationRefresh must be used within a ConversationRefreshProvider');
  }
  return context;
};