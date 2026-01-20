"use client"

import * as React from "react"
import { Button } from "./button"

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface AlertDialogContentProps {
  children: React.ReactNode;
}

interface AlertDialogHeaderProps {
  children: React.ReactNode;
}

interface AlertDialogFooterProps {
  children: React.ReactNode;
}

interface AlertDialogTitleProps {
  children: React.ReactNode;
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode;
}

interface AlertDialogActionProps {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

interface AlertDialogCancelProps {
  onClick?: () => void;
  children: React.ReactNode;
}

const AlertDialog: React.FC<AlertDialogProps> = ({ open, onOpenChange, children }) => {
  console.log('AlertDialog render - open:', open);
  
  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      console.log('Backdrop clicked, closing dialog');
      onOpenChange(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={handleBackdropClick}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const AlertDialogContent: React.FC<AlertDialogContentProps> = ({ children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4 border">
    {children}
  </div>
);

const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({ children }) => (
  <div className="mb-4">
    {children}
  </div>
);

const AlertDialogFooter: React.FC<AlertDialogFooterProps> = ({ children }) => (
  <div className="flex justify-end gap-2 mt-6">
    {children}
  </div>
);

const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({ children }) => (
  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
    {children}
  </h2>
);

const AlertDialogDescription: React.FC<AlertDialogDescriptionProps> = ({ children }) => (
  <p className="text-sm text-gray-600 dark:text-gray-400">
    {children}
  </p>
);

const AlertDialogAction: React.FC<AlertDialogActionProps> = ({ onClick, className, children }) => {
  const handleClick = () => {
    console.log('AlertDialogAction clicked');
    if (onClick) {
      onClick();
    }
  };

  return (
    <Button onClick={handleClick} className={className}>
      {children}
    </Button>
  );
};

const AlertDialogCancel: React.FC<AlertDialogCancelProps> = ({ onClick, children }) => {
  const handleClick = () => {
    console.log('AlertDialogCancel clicked');
    if (onClick) {
      onClick();
    }
  };

  return (
    <Button variant="outline" onClick={handleClick}>
      {children}
    </Button>
  );
};

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}