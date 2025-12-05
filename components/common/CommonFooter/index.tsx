"use client"

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaXTwitter, FaDiscord } from 'react-icons/fa6';
import { useTranslation } from '@/i18n/client';
import MailingListModal from '@/components/modal/MailingListModal';
import { useState } from 'react';

interface CommonFooterProps {
  lng: string;
}

const CommonFooter: React.FC<CommonFooterProps> = ({ lng }) => {
   
  const { t } = useTranslation(lng);
  const [isMailingListOpen, setIsMailingListOpen] = useState(false);
  const handleOpenMailingList = () => setIsMailingListOpen(true);
  const handleCloseMailingList = () => setIsMailingListOpen(false);
  const handleSubscribe = () => {};

  return (
    <footer className="bg-[#325AB4] text-white py-8 px-4 sm:px-6 md:py-12 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Logo */}
        <div className="mb-8 md:mb-14">
          <Image 
            src="/images/common/logo-white.png" 
            alt="HarvestFlow Logo" 
            width={240} 
            height={40}
            className="w-[180px] md:w-[240px] h-auto"
          />
        </div>
        {/* Main content sections */}
        <div className="flex flex-col lg:flex-row lg:justify-between mb-8 md:mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-16 mb-8 lg:mb-0">
            <div className="mb-6 sm:mb-0">
              <h3 className="font-medium mb-3 md:mb-5 text-base md:text-lg">{t('footer.services')}</h3>
              <ul className="space-y-2 text-sm md:text-base">
                <li><Link href="https://www.harvestflow.io/?lng=jp" className="hover:underline" target="_blank" rel="noopener noreferrer">{t('footer.cryptoLending')}</Link></li>
                <li><Link href="#" className="hover:underline" target="_blank" rel="noopener noreferrer">{t('footer.customWrapping')}</Link></li>
              </ul>
            </div>
            <div className="mb-6 sm:mb-0">
              <h3 className="font-medium mb-3 md:mb-5 text-base md:text-lg">{t('footer.legal')}</h3>
              <ul className="space-y-2 text-sm md:text-base">
                <li><Link href={`https://harvestflow.io/privacy-policy?lng=${lng}`} className="hover:underline" target="_blank" rel="noopener noreferrer">{t('footer.privacyPolicy')}</Link></li>
                <li><Link href="https://docs.google.com/document/d/1x8H4WDiF8_AodT1m_UGuxMXD1MmI94AG4O-b0irJg6I" className="hover:underline" target="_blank" rel="noopener noreferrer">{t('footer.termsConditions')}</Link></li>
              </ul>
            </div>
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <h3 className="font-medium mb-3 md:mb-5 text-base md:text-lg">{t('footer.updates')}</h3>
              <ul className="space-y-2 text-sm md:text-base">
                <li>
                  <button
                    type="button"
                    className="hover:underline bg-transparent text-left w-full"
                    aria-label="Join mailing list"
                    tabIndex={0}
                    onClick={handleOpenMailingList}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenMailingList(); }}
                  >
                    Join mailing list
                  </button>
                </li>
                <li>
                  <Link
                    href="https://harvestflow.deform.cc/contact/"
                    className="hover:underline"
                    aria-label="Send an enquiry"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Send an enquiry
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://discord.com/invite/harvesthall"
                    className="hover:underline"
                    aria-label="Discord"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Discord
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://x.com/HarvestFlow_io"
                    className="hover:underline"
                    aria-label="X"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    X
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          {/* Apas Port logo */}
          <div className="flex xl:h-12 xl:mt-32 justify-center lg:justify-end mt-8 lg:mt-0">
            <Image 
              src="/images/common/apasport.png" 
              width={180} 
              height={200} 
              alt="apasport logo"
              className="w-[120px] md:w-[140px] lg:w-[180px] h-auto"
            />
          </div>
        </div>

        {/* Bottom section with copyright and social icons */}
        <div className="border-t border-white/20 pt-6 md:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white text-xs md:text-sm opacity-70 text-center md:text-left">
              {t('footer.copyright', 'Copyright © Apas Port Co., Ltd 2025. All rights reserved.')}
            </p>
            <div className="flex space-x-3">
              <Link 
                href="https://x.com/HarvestFlow_io" 
                className="border border-white/30 rounded-xl p-3 hover:bg-white/10 transition-colors text-white" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
              >
                <FaXTwitter className="h-4 w-4 md:h-5 md:w-5" />
              </Link>
              <Link 
                href="https://discord.com/invite/harvesthall" 
                className="border border-white/30 rounded-xl p-3 hover:bg-white/10 transition-colors text-white" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Discord"
              >
                <FaDiscord className="h-4 w-4 md:h-5 md:w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      <MailingListModal
        lng={lng}
        isOpen={isMailingListOpen}
        onClose={handleCloseMailingList}
        onSubscribe={handleSubscribe}
      />
    </footer>
  );
};

export default CommonFooter;
