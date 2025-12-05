import React, { useState } from 'react';
import { useTranslation } from '@/i18n/client';

interface ContactProps {
  onOpenModal: (email: string) => void;
}

const Contact: React.FC<ContactProps & { lng: string }> = ({ onOpenModal, lng }) => {
  const { t } = useTranslation(lng, 'common');
  const [emailInput, setEmailInput] = useState(''); // State to hold the email input value

  const handleButtonClick = () => {
    onOpenModal(emailInput);
  };

  return (
    <div className='w-full bg-[#325AB4]'>
      <section className="bg-white rounded-b-[100px] flex flex-col items-center justify-center py-20 pb-48 px-4">
        <h2 className="text-4xl text-center text-dark-blue mb-4 whitespace-pre-line">
          {t('top.contact.title')}
        </h2>
        <p className="text-center text-gray-600 mb-8 max-w-md">
          {t('top.contact.description')}
        </p>
        <div className="flex items-center border border-gray-300 rounded-full p-1 max-w-sm w-full" suppressHydrationWarning>
          <input
            type="email"
            id="email"
            placeholder={t('top.contact.emailPlaceholder')}
            className="flex-grow px-4 py-2 outline-none bg-transparent text-gray-700"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <button
            className={`
              flex items-center justify-center
              px-6 py-2 min-h-10 min-w-fit rounded-full text-sm text-black font-light 
              bg-gradient-to-b from-[#F9D78C] to-[#E7B45A]
              hover:from-yellow-500 hover:to-yellow-600
              whitespace-nowrap cursor-pointer
            `}
            onClick={handleButtonClick}
          >
            {t('top.contact.joinButton')}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>
      </section>
    </div>
  );
};

export default Contact;
