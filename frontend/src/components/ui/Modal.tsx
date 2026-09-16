import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  
  // Fermer avec la touche Echap
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay (Fermeture au clic à l'extérieur) */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Contenu de la modal */}
      <div className="relative w-full max-w-md bg-zinc-950/80 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col animate-slide-up">
        
        {/* Header de la modal */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Corps de la modal */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
