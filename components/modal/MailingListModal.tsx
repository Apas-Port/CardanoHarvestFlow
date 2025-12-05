import React, { useState, useEffect } from 'react';
import CommonButton from '@/components/common/CommonButton';
import { SpinningCircles } from 'react-loading-icons';
import Image from 'next/image';
import { Project } from '@/lib/project';
// Removed ethers import - will use Cardano address validation
import { useTranslation } from '@/i18n/client';

interface MailingListModalProps {
  lng: string;
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  initialWalletAddress?: string;
  initialProject?: Project;
  onSubscribe: (data: { email: string; name: string; walletAddress: string, projectId: string }) => void;
}

const MailingListModal: React.FC<MailingListModalProps> = ({
  lng,
  isOpen,
  onClose,
  initialEmail = '',
  initialWalletAddress = '',
  initialProject = null,
  onSubscribe,
}) => {
  const { t } = useTranslation(lng, 'common');
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState('');
  const [walletAddress, setWalletAddress] = useState(initialWalletAddress);
  const [project, setProject] = useState(initialProject);
  const [isFormValid, setIsFormValid] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; wallet?: string, name?: string  }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    setWalletAddress(initialWalletAddress);
  }, [initialWalletAddress]);

  useEffect(() => {
    if(initialProject) {
      setProject(initialProject);
    }
  }, [initialProject]);

  useEffect(() => {
    setIsFormValid(email.trim() !== '' && name.trim() !== '');
  }, [email, name]);

  const validateForm = () => {
    const newErrors: { email?: string; wallet?: string, name?: string } = {};

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate wallet address if provided
    // TODO: Implement Cardano address validation
    if (walletAddress && !walletAddress.startsWith('addr1')) {
      newErrors.wallet = 'Please enter a valid Cardano address';
    }

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      onSubscribe({
        email: email.trim(),
        name: name.trim(),
        walletAddress: walletAddress.trim(),
        projectId: project?.id || ''
      });
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade" onClick={onClose}>
      <div className="bg-white p-1 w-[400px] rounded-t-3xl shadow-lg relative animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <Image src="/images/common/mailing-list.png" alt="logo" width={400} height={67} />
        <div className="text-center mt-8">
          <h2 className="text-3xl text-[#1C1C64] text-center">{t('modals.mailingList.title')}</h2>
        </div>
        <div className="mt-2 mb-4 mx-6 text-center text-gray-500">
          {t('modals.mailingList.description')}
        </div>

        <div className="mt-2 mb-4 mx-6 text-center">
          <div className="mt-4" suppressHydrationWarning>
            <input
              type="email"
              id="email"
              className="appearance-none border border-gray-400 placeholder-gray-400 rounded-lg w-full h-12 px-3 text-gray-700 leading-tight focus:outline-none bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('modals.mailingList.emailPlaceholder')}
              aria-label={t('modals.mailingList.emailPlaceholder')}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>
          <div className="mt-4" suppressHydrationWarning>
            <input
              type="text"
              id="name"
              className="appearance-none border border-gray-400 placeholder-gray-400 rounded-lg w-full h-12 px-3 text-gray-700 leading-tight focus:outline-none bg-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('modals.mailingList.namePlaceholder')}
              aria-label={t('modals.mailingList.namePlaceholder')}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          <div className="mt-4" suppressHydrationWarning>
            <input
              type="text"
              id="walletAddress"
              className="appearance-none border border-gray-400 placeholder-gray-400 rounded-lg w-full h-12 px-3 text-gray-700 leading-tight focus:outline-none bg-white"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={t('modals.mailingList.walletPlaceholder')}
              aria-label={t('modals.mailingList.walletPlaceholder')}
            />
            {errors.wallet && <p className="text-red-500 text-sm mt-1">{errors.wallet}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 font-medium">
          <button
            className="flex w-[145px] py-8 px-6 justify-center items-center gap-2 shrink-0 bg-[#F5F5F5] text-black rounded-none cursor-pointer"
            onClick={onClose}
            type="button"
          >
            {t('modals.mailingList.cancel')}
          </button>
          <CommonButton
            className="flex flex-1 py-8 px-6 justify-center items-center gap-2 bg-yellow-500 rounded-none cursor-pointer"
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
          >
            {loading && <SpinningCircles className="w-5 h-5 mr-2" />}
            {loading ? t('modals.mailingList.submitting') : t('modals.mailingList.submit')}
          </CommonButton>
        </div>
      </div>
    </div>
  );
};

export default MailingListModal;
