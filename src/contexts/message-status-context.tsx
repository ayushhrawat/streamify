"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

type MessageStatusStyle = 'modern' | 'minimal' | 'gradient' | 'pulse' | 'dots';

interface MessageStatusContextType {
  statusStyle: MessageStatusStyle;
  setStatusStyle: (style: MessageStatusStyle) => void;
}

const MessageStatusContext = createContext<MessageStatusContextType | undefined>(undefined);

export const MessageStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [statusStyle, setStatusStyleState] = useState<MessageStatusStyle>('modern');

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('messageStatusStyle');
    if (saved && ['modern', 'minimal', 'gradient', 'pulse', 'dots'].includes(saved)) {
      setStatusStyleState(saved as MessageStatusStyle);
    }
  }, []);

  // Save preference to localStorage
  const setStatusStyle = (style: MessageStatusStyle) => {
    setStatusStyleState(style);
    localStorage.setItem('messageStatusStyle', style);
  };

  return (
    <MessageStatusContext.Provider value={{ statusStyle, setStatusStyle }}>
      {children}
    </MessageStatusContext.Provider>
  );
};

export const useMessageStatus = () => {
  const context = useContext(MessageStatusContext);
  if (context === undefined) {
    throw new Error('useMessageStatus must be used within a MessageStatusProvider');
  }
  return context;
};