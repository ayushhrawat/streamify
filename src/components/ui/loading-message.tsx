import { Bot } from "lucide-react";

interface LoadingMessageProps {
  message?: string;
  className?: string;
}

const LoadingMessage = ({ 
  message = "Generating response...", 
  className = "" 
}: LoadingMessageProps) => {
  return (
    <div className={`flex items-center gap-2 text-blue-600 ${className}`}>
      <Bot size={16} className="animate-pulse" />
      <span className="text-sm font-medium">{message}</span>
      <div className="flex gap-1">
        <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};

export default LoadingMessage;