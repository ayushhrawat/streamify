import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
};

interface ContextMenuItemProps {
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  destructive?: boolean;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ 
  onClick, 
  icon, 
  children, 
  destructive = false 
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
        destructive 
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
          : 'text-gray-700 dark:text-gray-300'
      } cursor-pointer`}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
};