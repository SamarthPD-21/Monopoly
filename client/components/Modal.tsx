import React from 'react'

export default function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative cyber-modal w-full max-w-md mx-4 p-8 transform transition-all duration-300 ease-out scale-100 animate-modal-in">
        {children}
      </div>
      <style jsx>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-modal-in { animation: modalIn 220ms cubic-bezier(.2,.9,.3,1); }
        
        .cyber-modal {
          background: rgba(16, 8, 30, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(168, 85, 247, 0.4);
          border-radius: 16px;
          box-shadow: 
            0 0 60px rgba(124, 58, 237, 0.4),
            inset 0 0 80px rgba(168, 85, 247, 0.05);
          position: relative;
        }
        
        .cyber-modal::before {
          content: '';
          position: absolute;
          top: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(168, 85, 247, 0.8) 50%, 
            transparent 100%
          );
          filter: blur(2px);
        }
      `}</style>
    </div>
  )
}
