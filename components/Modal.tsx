import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-blue-900/20 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div 
        className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-[bounceIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)] border-4 border-white ring-1 ring-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-blue-50 to-white">
          <h3 className="text-2xl font-black text-blue-900 tracking-tight">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 shadow-sm hover:shadow-md transition-all active:scale-90"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {children}
        </div>
      </div>
      
      <style>{`
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};