import React from 'react';
import { useTranslation } from '@/i18n/client';

interface ErrorModalProps {
  lng: string;
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string;
  errorTitle?: string;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ lng, isOpen, onClose, errorMessage, errorTitle }) => {
  const { t } = useTranslation(lng, 'common');

  if (!isOpen) {
    return null;
  }

  // Function to detect and truncate transaction hashes
  const formatMessage = (message: string) => {
    // Regex to detect transaction hashes (64 character hex strings)
    const txHashRegex = /\b([a-fA-F0-9]{64})\b/g;
    
    return message.replace(txHashRegex, (match) => {
      // Truncate to show first 6 and last 6 characters
      return `${match.slice(0, 6)}...${match.slice(-6)}`;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99] p-4 md:p-0 animate-fade" onClick={onClose}>
      <div className="bg-white rounded-t-3xl rounded-b-none md:rounded-lg p-6 md:p-8 w-full max-w-[500px] animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {/* Error Title */}
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
            {errorTitle || t('modals.error.title', 'Error')}
          </h2>

          {/* Error Message */}
          <p className="text-gray-600 text-sm md:text-base mb-6 whitespace-pre-wrap break-words max-w-full">
            {formatMessage(errorMessage)}
          </p>

          {/* Close Button */}
          <button
            className="w-full px-6 py-3 md:py-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200"
            onClick={onClose}
          >
            {t('modals.error.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;