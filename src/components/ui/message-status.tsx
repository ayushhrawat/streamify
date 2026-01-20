"use client";
import React from 'react';
import { MessageSeenSvg, MessageSeenBlueSvg } from '@/lib/svgs';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

interface MessageStatusProps {
  status: MessageStatus;
  size?: 'sm' | 'md' | 'lg';
}

const MessageStatusIndicator: React.FC<MessageStatusProps> = ({ 
  status, 
  size = 'sm' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSize = sizeClasses[size];

  return (
    <div className="flex items-center">
      {status === 'sending' && (
        <div className={`${iconSize} border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin`} />
      )}
      
      {status === 'sent' && (
        <div className="flex items-center">
          <MessageSeenSvg />
        </div>
      )}
      
      {status === 'delivered' && (
        <div className="flex items-center">
          <MessageSeenSvg />
        </div>
      )}
      
      {status === 'read' && (
        <div className="flex items-center">
          <MessageSeenBlueSvg />
        </div>
      )}
    </div>
  );
};

export default MessageStatusIndicator;