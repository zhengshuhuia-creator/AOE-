
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
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setVisible(false), 300);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row md:justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-blue-900/20 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Responsive Panel: Bottom Sheet on Mobile, Side Drawer on Desktop */}
      <div 
        className={`
          relative w-full md:max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out
          mt-auto md:mt-0 h-[85vh] md:h-full
          rounded-t-[2.5rem] md:rounded-t-none md:rounded-l-[2.5rem]
          ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full md:translate-y-0'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="md:hidden flex justify-center py-3">
           <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 md:px-8 md:py-6 border-b border-slate-50">
          <h3 className="text-xl md:text-2xl font-black text-blue-900 tracking-tight">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 task-scroll">
          {children}
        </div>
      </div>
    </div>
  );
};
