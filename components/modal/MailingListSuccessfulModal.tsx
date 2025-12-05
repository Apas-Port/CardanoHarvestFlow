import React from 'react';
import Image from 'next/image';
import CommonButton from '@/components/common/CommonButton';
import { useTranslation } from '@/i18n/client';

interface MailingListSuccessfulModalProps {
  lng: string;
  isOpen: boolean;
  onClose: () => void;
}

const MailingListSuccessfulModal: React.FC<MailingListSuccessfulModalProps> = ({ lng, isOpen, onClose }) => {
  const { t } = useTranslation(lng, 'common');

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-t-lg max-w-md w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <div className="pt-8 px-8 pb-6 w-full flex flex-col items-center">
          <Image height={64} width={64} src="/images/top/successful-icon.png" alt="icon" />
          <h2 className="text-2xl text-center mt-4 text-navy">{t('modals.mailingList.success')}</h2>
                  <p className="text-gray-600 text-center mt-4">
          {t('modals.mailingList.successDescription')}
        </p>
        </div>
        <CommonButton className="w-[calc(100%-8px)] py-3 text-lg mb-1 rounded-none" onClick={onClose}>
          {t('modals.mailingList.close')}
        </CommonButton>
      </div>
    </div>
  );
};

export default MailingListSuccessfulModal;
