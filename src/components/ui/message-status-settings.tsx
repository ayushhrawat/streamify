"use client";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';
import MessageStatusIndicator, { MessageStatus } from './message-status';
import { Settings } from 'lucide-react';

interface MessageStatusSettingsProps {
  currentStyle: string;
  onStyleChange: (style: string) => void;
}

const MessageStatusSettings: React.FC<MessageStatusSettingsProps> = ({
  currentStyle,
  onStyleChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const styles = [
    {
      id: 'modern',
      name: 'Modern Circles',
      description: 'Clean circular indicators with smooth animations'
    },
    {
      id: 'minimal',
      name: 'Minimal Lines',
      description: 'Simple lines and shapes for a clean look'
    },
    {
      id: 'gradient',
      name: 'Gradient Glow',
      description: 'Colorful gradients with shimmer effects'
    },
    {
      id: 'pulse',
      name: 'Pulse Effect',
      description: 'Pulsing indicators with ripple animations'
    },
    {
      id: 'dots',
      name: 'Animated Dots',
      description: 'Bouncing dots and circular indicators'
    }
  ];

  const statuses: MessageStatus[] = ['sending', 'sent', 'delivered', 'read'];
  const statusLabels = {
    sending: 'Sending',
    sent: 'Sent',
    delivered: 'Delivered',
    read: 'Read'
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 px-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Status</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Message Status Style</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {styles.map((style) => (
            <div
              key={style.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                currentStyle === style.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
              onClick={() => {
                onStyleChange(style.id);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{style.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {style.description}
                  </p>
                </div>
                {currentStyle === style.id && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {statuses.map((status) => (
                  <div key={status} className="flex flex-col items-center gap-2">
                    <MessageStatusIndicator 
                      status={status} 
                      style={style.id as any} 
                      size="md"
                    />
                    <span className="text-xs text-gray-500">
                      {statusLabels[status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Status Meanings:
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <div><strong>Sending:</strong> Message is being sent</div>
            <div><strong>Sent:</strong> Message sent to server (single checkmark)</div>
            <div><strong>Delivered:</strong> Message delivered to recipient (double checkmark - green)</div>
            <div><strong>Read:</strong> Message opened and read by recipient (double checkmark - blue)</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageStatusSettings;