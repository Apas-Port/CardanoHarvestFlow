'use client';

import { useState, forwardRef, ForwardedRef } from 'react';
import Image from 'next/image';
import { FiChevronDown } from 'react-icons/fi';
import { useTranslation } from '@/i18n/client';

export const FaQ = forwardRef<HTMLDivElement, { lng: string }>(({ lng }, ref: ForwardedRef<HTMLDivElement>) => {
  const { t } = useTranslation(lng, 'common');
  const [openIndex, setOpenIndex] = useState<number | null>(-1); // Default open based on image

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  
  // Get FAQ items from translations
  const faqItems = Object.keys(t('faq.items', { returnObjects: true }))
    .filter(([key]) => t(`faq.items.${key}.question`) !== `faq.items.${key}.question`) // Ensure we have a translation
    .map(key => ({
      id: key,
      question: t(`faq.items.${key}.question`),
      answer: t(`faq.items.${key}.answer`)
    }));

  return (
    <div ref={ref} className="bg-white py-12 lg:py-16">
      <div className="bg-[#F5F5F5] max-w-[1440px] mx-auto text-white py-24 px-4 sm:px-6 lg:px-8 rounded-3xl min-h-[600px] flex flex-col items-center">
        <h2 className="text-3xl text-dark-blue font-medium mb-4 text-center">
          {t('faq.title', 'Frequently Asked Questions')}
        </h2>
        <Image src="/images/common/faq-icon.png" alt="HarvestFlow Logo" width={32} height={32} className="text-xl font-bold py-2" />
        <div className="w-full text-dark-blue max-w-3xl mx-auto">
          {faqItems.map((item, index) => (
            <div key={item.id} className="border-b border-[#BFC9D480] py-4">
              <button
                onClick={() => toggleFaq(index)}
                className="cursor-pointer flex justify-between items-center w-full text-left focus:outline-none"
              >
                <span className="text-lg">{item.question}</span>
                <span className="ml-4 w-10 h-6 flex items-center justify-center border border-gray-400 rounded-full">
                  <FiChevronDown className={`transition-transform duration-300 ease-in-out ${openIndex === index ? 'rotate-180' : ''}`} />
                </span>
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index 
                    ? 'max-h-96 opacity-100 mt-3' 
                    : 'max-h-0 opacity-0 mt-0'
                }`}
              >
                <div 
                  className="text-dark-blue whitespace-pre-line pb-2"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

FaQ.displayName = 'FaQ';
