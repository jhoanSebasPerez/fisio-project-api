'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Evitar scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Fondo oscuro */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Contenido del modal */}
        <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl">
          <div className="p-6">
            {/* Botón de cerrar */}
            <button 
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <span className="sr-only">Cerrar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Título */}
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {title}
            </h3>
            
            {/* Contenido */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
