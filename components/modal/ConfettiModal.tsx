import React, { useState, useEffect, useRef } from 'react';

interface ConfettiModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ConfettiModal: React.FC<ConfettiModalProps> = ({ isOpen, onClose, children }) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Mock confetti effect - in real implementation would use canvas-confetti
      console.log('🎉 Confetti animation would play here');
    } else {
      const resetTimer = setTimeout(() => {
        setIsVisible(false);
        if (modalRef.current) {
          modalRef.current.classList.remove('lower');
        }
      }, 300); // Small delay to allow fade out transition
      return () => clearTimeout(resetTimer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[90]'>
      <div
        className={`fixed inset-0 z-[90] w-full h-full transition-opacity duration-200 ease-in ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>
      <div ref={modalRef} className={isOpen ? 'show' : ''}>
        {children}
      </div>
    </div>
  );
};

export default ConfettiModal;