import React from 'react';
import MessageStatusIndicator, { MessageStatus } from '../ui/message-status';

const MessageStatusDemo: React.FC = () => {
  const statuses: MessageStatus[] = ['sending', 'sent', 'delivered', 'read'];
  const statusLabels = {
    sending: 'Sending',
    sent: 'Sent',
    delivered: 'Delivered',
    read: 'Read'
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">📱 Message Status Demo</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time message status indicators for modern messaging experience!
        </p>
      </div>

      <div className="border rounded-lg p-6 bg-white dark:bg-gray-800">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Message Status Indicators</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Clean indicators showing message delivery status
          </p>
        </div>
        
        <div className="grid grid-cols-4 gap-8">
          {statuses.map((status) => (
            <div key={status} className="flex flex-col items-center gap-3">
              <div className="h-12 flex items-center justify-center">
                <MessageStatusIndicator 
                  status={status} 
                  size="lg"
                />
              </div>
              <span className="text-sm font-medium">{statusLabels[status]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
          🚀 Features:
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
          <li>• <strong>Instant Updates:</strong> Status changes in real-time</li>
          <li>• <strong>Smooth Animations:</strong> Spinning loader for sending status</li>
          <li>• <strong>Visual Feedback:</strong> Clear indicators for each status</li>
          <li>• <strong>Responsive:</strong> Works on all screen sizes</li>
          <li>• <strong>Dark Mode:</strong> Fully compatible with dark/light themes</li>
        </ul>
      </div>

      <div className="mt-6 p-6 bg-green-50 dark:bg-green-950 rounded-lg">
        <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">
          💡 How It Works:
        </h3>
        <ol className="text-sm text-green-700 dark:text-green-300 space-y-2">
          <li>1. <strong>Sending:</strong> Animated spinner while message is being sent</li>
          <li>2. <strong>Sent:</strong> Single checkmark when message reaches server</li>
          <li>3. <strong>Delivered:</strong> Double checkmark when delivered to recipient</li>
          <li>4. <strong>Read:</strong> Blue checkmarks when recipient reads the message</li>
        </ol>
      </div>
    </div>
  );
};

export default MessageStatusDemo;