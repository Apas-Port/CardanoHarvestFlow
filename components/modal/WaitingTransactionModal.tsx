import React, { useState } from 'react';
import CommonButton from '@/components/common/CommonButton';
import { Project } from '@/lib/project';
import { useTranslation } from '@/i18n/client';
import { SpinningCircles } from 'react-loading-icons';

interface WaitingTransactionModalProps {
  lng: string;
  isOpen: boolean;
  isLendingProgress: boolean;
  onClose: () => void;
  onBackToPurchaseModal: () => void;
  onContinue: () => Promise<void>;
  project: Project;
  amount: number;
}

const WaitingTransactionModal: React.FC<WaitingTransactionModalProps> = ({ lng, isLendingProgress, project, amount, isOpen, onContinue, onClose, onBackToPurchaseModal }) => {
  const { t } = useTranslation(lng, 'common');
  const [isStepsOpen, setIsStepsOpen] = useState(true);
  const displayCurrency = project.displayCurrency ?? project.lendingType;
  const displayUnitPrice = project.displayUnitPrice ?? project.unitPrice;
  const totalDisplayPrice = displayUnitPrice * amount;
  const formattedTotalDisplayPrice = totalDisplayPrice.toLocaleString(undefined, { maximumFractionDigits: 2 });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade p-4 md:p-0" onClick={onClose}>
      <div className="bg-white p-1 w-full max-w-[900px] md:w-1/4 max-h-[90vh] md:max-h-none rounded-t-3xl rounded-b-none shadow-lg relative overflow-y-auto md:overflow-hidden animate-modal-in" onClick={e => e.stopPropagation()}>
        {/* <Image src="/images/common/mailing-list.png" alt="logo" width={600} height={100} /> */}
        <h2 className="text-xl md:text-2xl font-medium text-center mt-6 md:mt-8 mb-4 md:mb-6 px-4">
          {t('modals.waitingTransaction.confirmTransaction')}
          {amount > 1 && (
            <span className="block text-sm mt-2 text-blue-600 font-normal">
              Bulk minting {amount} NFTs in a single transaction
            </span>
          )}
        </h2>

        <div className="space-y-4 mb-4 mx-4 md:mx-8 p-3 md:p-4 rounded-lg" style={{ background: 'var(--Grey, #F5F5F5)' }}>
          <div className="flex justify-between items-center border-b border-[#BFC9D480] pb-2">
            <span className="text-gray-500 text-sm md:text-base">{t('modals.waitingTransaction.total')}</span>
            <span className="text-[#161718] font-['Roboto_Mono',monospace] text-sm md:text-[14px] font-semibold">{formattedTotalDisplayPrice}　{displayCurrency}</span>
          </div>
          <div className="flex justify-between items-center border-b border-[#BFC9D480] pb-2">
            <span className="text-gray-500 text-sm md:text-base">{t('modals.waitingTransaction.name')}</span>
            <span className="text-[#161718] font-['Roboto_Mono',monospace] text-sm md:text-[14px] font-normal">{project.title}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm md:text-base">{t('modals.waitingTransaction.noItems')}</span>
            <span className="text-[#161718] font-['Roboto_Mono',monospace] text-sm md:text-[14px] font-normal">{amount}</span>
          </div>
        </div>

        {/* <div className="text-center mb-4 md:mb-6 px-4">
          <p className="text-gray-500 text-xs md:text-sm">
            {t('modals.waitingTransaction.lowOnPusd')}{' '}
            <a 
              href="https://portal.plume.org/swap" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#2663F2] underline px-1 py-0.5 rounded transition-colors duration-200"
            >
              Plume Portal
            </a>
          </p>
        </div> */}

        <div className="border rounded-lg border-[#BFC9D480] mx-4 md:mx-8 mb-4 md:mb-6">
          <div className="flex justify-between items-center mt-2 ml-3 md:ml-4 mb-0">
            <h3 className="text-base md:text-lg font-medium">{t('modals.waitingTransaction.transactionSteps')}</h3>
            <button
              onClick={() => setIsStepsOpen(open => !open)}
              aria-label={isStepsOpen ? t('modals.waitingTransaction.collapseSteps') : t('modals.waitingTransaction.expandSteps')}
              aria-expanded={isStepsOpen}
              className="ml-2 mr-2 md:mr-3 focus:outline-none"
              tabIndex={0}
            >
              {isStepsOpen ? (
                <svg width="24" height="24" className="md:w-[30px] md:h-[30px]" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 12L10 8L14 12" stroke="#1D1E1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="24" height="24" className="md:w-[30px] md:h-[30px]" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8L10 12L14 8" stroke="#1D1E1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
          <div className="border-b border-[#BFC9D480] my-2" />
          {isStepsOpen && (
            <div>
              <div className="space-y-4 mx-3 md:mx-4 mb-3 md:mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 opacity-100 p-1 mr-2 md:mr-3 font-normal text-sm md:text-base" style={{ background: 'var(--Yellow-Gradient, linear-gradient(0deg, #E6B95F 0%, #FFD98C 100%))' }}>
                      <p>1</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium opacity-100 mt-1 mb-2 text-sm md:text-base`}>{t('modals.waitingTransaction.step1Title')}</h4>
                    <p className="text-gray-800 text-xs md:text-sm opacity-50">{t('modals.waitingTransaction.step1Description')}</p>
                  </div>
                </div>
              </div>
              <div className="border-b border-[#BFC9D480] my-2" />
              <div className="space-y-4 mx-3 md:mx-4 mb-3 md:mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 opacity-100 p-1 mr-2 md:mr-3 font-normal text-sm md:text-base" style={{ background: 'var(--Yellow-Gradient, linear-gradient(0deg, #E6B95F 0%, #FFD98C 100%))' }}>
                      <p>2</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium opacity-100 mt-1 mb-2 text-sm md:text-base`}>{t('modals.waitingTransaction.step2Title')}</h4>
                    <p className="text-gray-800 text-xs md:text-sm opacity-50">{t('modals.waitingTransaction.step2Description')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between space-y-reverse space-y-1 sm:space-y-0 sm:space-x-1">
          <button
            className="flex w-full sm:w-[145px] px-4 md:px-6 py-6 md:py-8 justify-center items-start gap-2 rounded-none text-gray-700 font-medium bg-[#F5F5F5] uppercase hover:cursor-pointer text-sm md:text-base"
            onClick={onBackToPurchaseModal}
            type="button"
            aria-label={t('modals.waitingTransaction.cancel')}
          >
            {t('modals.waitingTransaction.cancel')}
          </button>
          <CommonButton
            className="flex flex-1 px-4 md:px-6 py-6 md:py-8 justify-center items-start gap-2 bg-yellow-500 rounded-none uppercase hover:cursor-pointer text-sm md:text-base"
            onClick={() => { onContinue() }}
            disabled={isLendingProgress}
            aria-label={t('modals.waitingTransaction.continue')}
          >
            {isLendingProgress && (
              <SpinningCircles className="w-4 h-4 md:w-5 md:h-5 inline-block mr-2" />
            )} {t('modals.waitingTransaction.continue')}
          </CommonButton>
        </div>
      </div>
    </div>
  );
};

export default WaitingTransactionModal;
