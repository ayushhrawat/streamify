import { Palette } from "lucide-react";

interface LoadingImageProps {
  message?: string;
  className?: string;
}

const LoadingImage = ({ 
  message = "Generating image...", 
  className = "" 
}: LoadingImageProps) => {
  return (
    <div className={`flex items-center gap-3 p-2 ${className}`}>
      {/* Simple animated palette icon */}
      <Palette size={20} className="text-purple-600 animate-pulse" />
      
      {/* Loading text with animated dots */}
      <div className="flex items-center gap-2 text-purple-600">
        <span className="text-sm font-medium">{message}</span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingImage;