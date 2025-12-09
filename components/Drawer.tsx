import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      // Prevent body scrolling when drawer is open
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setVisible(false), 300); // Wait for animation
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-blue-900/20 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        className={`
          relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col
          transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
          rounded-l-[2.5rem] overflow-hidden border-l-4 border-blue-50
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-blue-50/80 to-white backdrop-blur-md sticky top-0 z-10 border-b border-blue-50">
          <h3 className="text-2xl font-black text-blue-900 tracking-tight flex items-center gap-2">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-2.5 rounded-full bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 shadow-sm hover:shadow-md transition-all active:scale-90 border border-gray-100"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 task-scroll">
          {children}
        </div>
      </div>
    </div>
  );
};