import React from 'react';
import CommonButton from '@/components/common/CommonButton';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void; // Called when backdrop is clicked or explicitly closed
  onAction?: () => void; // Called when the main button is clicked
  title: string;
  message: string | React.ReactNode;
  buttonText?: string;
  actionButtonDisabled?: boolean; // To disable the button during action
  icon?: React.ReactNode; // Optional icon element
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  onAction,
  title,
  message,
  buttonText = 'Got It', // Default button text
  actionButtonDisabled = false,
  icon,
}) => {
  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick} // Add backdrop click handler
    >
      {/* Prevent modal content click from closing */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Content Panel */}
        <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center">
          {/* Optional Icon */}
          {icon && (
            <div className="mb-6 inline-block">
              {icon}
            </div>
          )}

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-medium text-gray-800 mb-4">
            {title}
          </h2>

          {/* Description */}
          <div className="text-gray-600 mb-8 text-sm md:text-base">
            {message}
          </div>

          {/* Action Button */}
          <CommonButton
            onClick={onAction || onClose} // Use onAction if provided, otherwise default to onClose
            disabled={actionButtonDisabled} // Disable button based on prop
            className="w-full bg-[#FACC15] hover:bg-yellow-400 text-gray-900 font-medium py-3 transition rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buttonText}
          </CommonButton>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
