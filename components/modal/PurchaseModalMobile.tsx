import React, { RefObject } from 'react';
import { Project } from '@/lib/project';
import Image from 'next/image';
import CommonButton from '@/components/common/CommonButton';
import CommonTooltip from '@/components/common/CommonTooltip';
import { getNetworkImage } from '@/lib/network';

// Import the correct TranslateFunction type
type TranslateFunction = {
  (key: string, defaultValue?: string): string;
  (key: string, options: { returnObjects: true }): unknown[];
  (key: string, defaultValue: string, options: { returnObjects: true }): unknown[];
  (key: string, options: Record<string, unknown>): string;
  (key: string, defaultValue: string, options: Record<string, unknown>): string;
};

interface PurchaseModalMobileProps {
  lng: string;
  project: Project;
  quantity: number;
  onClose: () => void;
  onLendSupport: (project: Project, quantity: number) => Promise<void>;
  handleQuantityChange: (amount: number) => void;
  
  // Tooltip states and refs
  popoverShow: boolean;
  popoverRef: RefObject<HTMLDivElement | null>;
  btnRef: RefObject<HTMLButtonElement | null>;
  
  lendingPeriodPopoverShow: boolean;
  lendingPeriodPopoverRef: RefObject<HTMLDivElement | null>;
  lendingPeriodBtnRef: RefObject<HTMLButtonElement | null>;
  
  boostTooltipShow: boolean;
  boostTooltipRef: RefObject<HTMLDivElement | null>;
  boostBtnRef: RefObject<HTMLImageElement | null>;
  
  // Tooltip handlers
  openTooltip: () => void;
  closeTooltip: () => void;
  openLendingPeriodTooltip: () => void;
  closeLendingPeriodTooltip: () => void;
  openBoostTooltip: () => void;
  closeBoostTooltip: () => void;
  
  // Translation function
  t: TranslateFunction;
}

const PROGRESS_GRADIENT = 'linear-gradient(133deg, #95CAFF 0%, #83A6FF 99%)';

const PurchaseModalMobile: React.FC<PurchaseModalMobileProps> = ({
  lng,
  project,
  quantity,
  onClose,
  onLendSupport,
  handleQuantityChange,
  popoverShow,
  popoverRef,
  btnRef,
  lendingPeriodPopoverShow,
  lendingPeriodPopoverRef,
  lendingPeriodBtnRef,
  boostTooltipShow,
  boostTooltipRef,
  boostBtnRef,
  openTooltip,
  closeTooltip,
  openLendingPeriodTooltip,
  closeLendingPeriodTooltip,
  openBoostTooltip,
  closeBoostTooltip,
  t
}) => {
  const displayCurrency = project.displayCurrency ?? project.lendingType;
  const displayUnitPrice = project.displayUnitPrice ?? project.unitPrice;
  const displayRaisedAmount = project.displayRaisedAmount ?? project.raisedAmount;
  const displayTotalAmount = project.displayTotalAmount ?? project.totalAmount;
  const safeDisplayRaisedAmount = Number(displayRaisedAmount ?? 0);
  const safeDisplayTotalAmount = Number(displayTotalAmount ?? 0);
  const boundedDisplayRaisedAmount = safeDisplayTotalAmount > 0
    ? Math.min(safeDisplayRaisedAmount, safeDisplayTotalAmount)
    : safeDisplayRaisedAmount;
  const totalDisplayPrice = displayUnitPrice * quantity;
  const formattedTotalDisplayPrice = totalDisplayPrice.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const formattedRoundedDisplayPrice = Math.ceil(totalDisplayPrice).toLocaleString();
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-lg font-medium font-['Function_Pro',sans-serif]">{t('modals.purchase.title')}</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {(project.title === "Plume Tuktuks 01" || project.title === "Plume Tuktuks 02") && (
          <div className="absolute right-4 top-20 z-10" style={{ display: 'inline-block' }}>
            <Image
              ref={boostBtnRef}
              src="/images/common/plume-boost.svg"
              alt="Plume Boost"
              aria-label="Plume Boost"
              width={200}
              height={50}
              draggable={false}
              priority
              tabIndex={0}
              className="animate-glow-pulse w-40 h-auto"
              onMouseEnter={openBoostTooltip}
              onMouseLeave={closeBoostTooltip}
              onFocus={openBoostTooltip}
              onBlur={closeBoostTooltip}
            />
            <CommonTooltip
              show={boostTooltipShow}
              tooltipRef={boostTooltipRef}
              className="min-w-[240px] p-3 rounded text-white text-sm text-left shadow-[2px_2px_6px_0px_rgba(40,41,56,0.15)] whitespace-normal break-words bg-gradient-to-r from-[#26C393] via-[#00D594] to-[#26C393] top-full right-0 mt-2 z-50"
              role="tooltip"
            >
              {t('modals.purchase.tooltips.plumeBoost')}
            </CommonTooltip>
          </div>
        )}
        
        <div className="p-4">
          <div className='bg-[#325AB4] rounded-lg py-2 px-4 mb-2'>
            <Image width={422} height={500} src={project.previewImage} alt={project.title} className="mb-2 w-full h-auto" />
          </div>
          
          <div className='bg-[#F5F5F5] text-[#161718] p-3 mb-4 relative'>
            <CommonTooltip
              show={popoverShow}
              tooltipRef={popoverRef}
              className="min-w-[240px] max-w-[300px] p-3 rounded text-white text-sm text-left shadow-[2px_2px_6px_0px_rgba(40,41,56,0.15)] whitespace-normal break-words bottom-full right-0 mb-2 z-50"
            >
              {t('modals.purchase.tooltips.proofOfSupport')}
            </CommonTooltip>
            <div className='flex justify-between'>
              <h3 className="text-base font-normal mb-1">
                {lng === 'ja' ? (
                  <>
                    {t('modals.purchase.supportAndReceive')} <span className="font-medium">{project.title} NFT</span>を{t('modals.purchase.supportAndReceiveEnd')}
                  </>
                ) : (
                  <>
                    {t('modals.purchase.supportAndReceive')} <span className="font-medium">{project.title} NFT</span>
                  </>
                )}
              </h3>
              <button
                ref={btnRef as React.LegacyRef<HTMLButtonElement>}
                type="button"
                onMouseEnter={openTooltip}
                onMouseLeave={closeTooltip}
                className="p-0 m-0 bg-transparent border-none"
              >
                <Image
                  width={20}
                  height={20}
                  src={'/images/common/popup-icon.png'}
                  alt="popup"
                  className="pb-2 w-4 h-auto"
                />
              </button>
            </div>
            <p className="text-xs">
              {lng === 'ja' ? (
                <>
                  <span>このNFTは{project.id === "6efc1caf706a48b5b4b0402a7d367291" ? "Izumida Lee": "Momoka Ito"}</span>{t('modals.purchase.featuresArtwork')}{t('modals.purchase.symbolOfContribution')}
                </>
              ) : (
                <>
                  {t('modals.purchase.featuresArtwork')} <span>{project.id === "6efc1caf706a48b5b4b0402a7d367291" ? "Izumida Lee": "Momoka Ito"}</span>. {t('modals.purchase.symbolOfContribution')}
                </>
              )}
            </p>
          </div>

          <h2 className="text-sm font-['Function_Pro',sans-serif]">No.{String(project.num).padStart(3,'0')}</h2>
          <h2 className="text-2xl font-medium font-['Function_Pro',sans-serif] mb-2">{project.title}</h2>

          <div className="flex flex-row items-start mb-3 gap-4">
            <span className="text-gray-700 mt-1 font-['Function_Pro',sans-serif] text-sm">
              <Image
                src={getNetworkImage(project.network)}
                alt={project.lendingType} width={20} height={20} className="inline mr-1 mb-1 w-4 h-auto" />
              {project.lendingType} Lending
            </span>
            <span className="text-gray-700 mt-1 font-['Function_Pro',sans-serif] text-sm">
              <Image
                src={getNetworkImage(project.network)}
                alt={project.network} width={20} height={20} className="inline mr-1 mb-1 w-4 h-auto" />
              {project.network} Network
            </span>
          </div>

          <div className="flex justify-between mb-2 text-sm">
            <div className="font-['Function_Pro',sans-serif]">{t('modals.purchase.raisedToDate')}</div>
            {project.status === "sold_out" ? (
              <div className="font-['Roboto_Mono',monospace]">{safeDisplayTotalAmount.toLocaleString()}/{safeDisplayTotalAmount.toLocaleString()} {displayCurrency}</div>
            ) : (project.title === "Plume Tuktuks 01" || project.title === "Plume Tuktuks 02") ? (
              <div className="font-['Roboto_Mono',monospace]">{safeDisplayRaisedAmount.toLocaleString()} {displayCurrency}</div>
            ) : (
              <div className="font-['Roboto_Mono',monospace]">{boundedDisplayRaisedAmount.toLocaleString()} / {safeDisplayTotalAmount.toLocaleString()} {displayCurrency}</div>
            )}
          </div>

          {/* 進捗バー（マイルストーンベース） */}
          <div className="w-full bg-[#A9BEEF]/30 rounded-full h-2 mb-3 relative">
            {(() => {
              const currentAmount = safeDisplayRaisedAmount;
              let progressWidth = "0%";
              let maxValue = safeDisplayTotalAmount;
              
              if (project.milestones && project.milestones.length > 0) {
                maxValue = project.milestones[project.milestones.length - 1];
              }
              
              if (project.status === "sold_out") {
                progressWidth = "100%";
              } else {
                const progressPercentage = maxValue > 0 ? Math.min((currentAmount / maxValue) * 100, 100) : 0;
                progressWidth = `${progressPercentage}%`;
              }
              
              return (
                <>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: progressWidth,
                      background: PROGRESS_GRADIENT
                    }}
                    aria-label="progress bar"
                    role="progressbar"
                  ></div>
                  
                  {/* マイルストーンドット */}
                  {project.milestones && project.milestones.map((milestone, index) => {
                    const position = maxValue > 0 ? (milestone / maxValue) * 100 : 0;
                    const isReached = currentAmount >= milestone;
                    
                    return (
                      <div
                        key={index}
                        className={`absolute top-[-4px] w-3 h-3 rounded-full border-2 ${
                          isReached 
                            ? 'bg-secondary border-white' 
                            : 'bg-white border-gray-400'
                        }`}
                        style={{
                          left: `${Math.min(position, 98)}%`,
                          transform: 'translateX(-50%)'
                        }}
                        title={`Milestone: ${milestone.toLocaleString()} ${displayCurrency}`}
                      />
                    );
                  })}
                </>
              );
            })()}
          </div>

          {/* Milestone Progress Text */}
          {project.status !== "sold_out" && 
           project.milestones && 
           project.unitSupportTarget && 
           (() => {
             const currentAmount = project.raisedAmount || 0;
             const nextMilestone = project.milestones.find((m: number) => m > currentAmount);
             
             if (nextMilestone) {
               const remaining = nextMilestone - currentAmount;
               const estimatedSupport = Math.floor(currentAmount / project.unitSupportTarget.unitCost);
               const milestoneIndex = project.milestones.indexOf(nextMilestone);
               const getMilestoneLabel = (index: number) => {
                 if (index === 0) return t('modals.purchase.milestoneLabels.first');
                 if (index === 1) return t('modals.purchase.milestoneLabels.second'); 
                 if (index === 2) return t('modals.purchase.milestoneLabels.third');
                 return t('modals.purchase.milestoneLabels.ordinal', { number: index + 1 });
               };
               
               const milestoneLabel = getMilestoneLabel(milestoneIndex);
               
               return (
                 <div className="mb-4">
                   <p className="text-[#1D1E1F80] text-left leading-none text-sm">
                     {lng === 'ja' ? (
                       <>
                         {t('modals.purchase.milestoneProgress.prefix')} {milestoneLabel} {t('modals.purchase.milestoneProgress.middle')} <span className="font-medium text-secondary">{remaining.toLocaleString()} {project.lendingType}</span> {t('modals.purchase.milestoneProgress.suffix')} <span className="font-medium text-secondary">{estimatedSupport} {project.unitSupportTarget.label}</span>{t('modals.purchase.milestoneProgress.end')}
                       </>
                     ) : (
                       <>
                         {t('modals.purchase.milestoneProgress.prefix')} <span className="font-medium text-secondary">{remaining.toLocaleString()} {project.lendingType}</span> {t('modals.purchase.milestoneProgress.middle')} {milestoneLabel} {t('modals.purchase.milestoneProgress.suffix')} <span className="font-medium text-secondary">{estimatedSupport} {project.unitSupportTarget.label}</span>{t('modals.purchase.milestoneProgress.end')}
                       </>
                     )}
                   </p>
                 </div>
               );
             }
             return null;
           })()
          }

          {project.status === "sold_out" && (
            <div
              className="px-3 py-4 text-center rounded-lg mb-3 text-[#04304D] font-['Roboto_Mono',monospace] text-[12px] bg-gradient-to-br from-[rgba(233,241,255,0.4)] to-[rgba(186,206,233,0.4)]"
            >
              {t('modals.purchase.thankYouInterest')}<br/>
              {t('modals.purchase.projectReachedGoal')}
            </div>
          )}
          
          {project.status === "sold_out" ? (
            <>
              <div className="p-3 rounded-lg mb-3 bg-[#F5F5F5]">
                <div className="flex items-center justify-between">
                  <div className='basis-1/3'>
                    <h3 className="text-sm text-[#1D1E1F80] font-['Function_Pro',sans-serif]">{t('modals.purchase.support')}</h3>
                    <span className="text-lg font-bold font-['Roboto_Mono',monospace]">{formattedRoundedDisplayPrice} {displayCurrency}</span>
                    <p className="text-xs text-gray-600 font-['Roboto_Mono',monospace]">(${formattedRoundedDisplayPrice})</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="pl-3 pr-2 rounded-lg mb-4 bg-[#F5F5F5]">
                <div className="flex items-center justify-between gap-2">
                  <div className='basis-1/2 py-2'>
                    <h3 className="text-sm text-[#1D1E1F80] font-function-pro">{t('modals.purchase.support')}</h3>
                    <span className="text-lg font-bold font-mono">{formattedTotalDisplayPrice} {displayCurrency}</span>
                    <p className="text-xs text-gray-600 font-mono">(${totalDisplayPrice.toFixed(2)})</p>
                  </div>
                  <div className="basis-1/2 flex py-1 px-2 items-center justify-between border-gray-300 rounded-lg bg-white">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        className="font-['Function_Pro',sans-serif] px-2 py-2 text-black bg-[#F5F5F5] text-lg w-10 h-10 font-bold hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        aria-label={t('modals.purchase.quantityDecrease')}
                        disabled={quantity <= 1}
                      >
                        ー
                      </button>
                      <input
                        type="text"
                        value={quantity}
                        readOnly
                        className="w-10 text-center border-none focus:ring-0 text-gray-900 font-medium text-lg bg-transparent"
                        aria-label="Quantity"
                      />
                      <button
                        onClick={() => handleQuantityChange(1)}
                        className="font-['Function_Pro',sans-serif] rounded-lg text-black font-medium text-lg bg-gradient-to-b from-[#F9D78C] to-[#E7B45A] hover:opacity-80 transition-opacity duration-200 py-2 px-2 m-1 w-10 h-10 text-xl font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={t('modals.purchase.quantityIncrease')}
                        disabled={quantity >= 15}
                      >
                        ＋
                      </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Financial returns and Social Impact */}
          <div className="mb-3">
            <h3 className="font-['Function_Pro',sans-serif] text-sm mb-2">{t('modals.purchase.financialReturns')}</h3>
            <div className='pr-2 text-xs text-[#1D1E1F80]'>
              <div className="flex justify-between py-1 border-b border-[#BFC9D480]">
                <span className="font-['Roboto_Mono',monospace]">{t('modals.purchase.interestEarned')}</span>
                <span className="font-bold text-black font-['Roboto_Mono',monospace]">
                  ${(
                    Math.ceil(
                      quantity * displayUnitPrice * project.apy * (project.lendingPeriod / 12)
                    ) / 100
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#BFC9D480]">
                <span className="font-['Roboto_Mono',monospace]">{t('modals.purchase.interestRate')}</span>
                <span className="text-black font-medium font-['Roboto_Mono',monospace]">
                  {project.apy}% APY
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#BFC9D480]">
                <span className="font-['Roboto_Mono',monospace]">{t('modals.purchase.repaymentMethod')}</span>
                <span className="text-black font-medium font-['Roboto_Mono',monospace]">
                  {project.repaymentMethod}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-0">
            <h3 className="font-['Function_Pro',sans-serif] text-sm mb-2">{t('modals.purchase.socialImpact')}</h3>
            <div className='pr-2 pb-2 text-xs text-[#1D1E1F80]'>
              <div className="flex justify-between py-1 border-b border-[#BFC9D480]">
                <span className="flex items-center gap-2 font-['Roboto_Mono',monospace] relative">
                  {t('modals.purchase.lendingPeriod')}
                  <button
                    ref={lendingPeriodBtnRef as React.LegacyRef<HTMLButtonElement>}
                    type="button"
                    onMouseEnter={openLendingPeriodTooltip}
                    onMouseLeave={closeLendingPeriodTooltip}
                    className="p-0 m-0 bg-transparent border-none"
                    tabIndex={0}
                    aria-label="Lending Period Info"
                  >
                    <Image
                      width={20}
                      height={20}
                      src={'/images/common/popup-icon.png'}
                      alt="popup"
                      className="pb-1 w-4 h-auto"
                    />
                  </button>
                  <CommonTooltip
                    show={lendingPeriodPopoverShow}
                    tooltipRef={lendingPeriodPopoverRef}
                    className="font-['Function_Pro',sans-serif] min-w-[250px] max-w-[280px] bottom-full left-0 mb-2 z-50"
                  >
                    {t('modals.purchase.tooltips.lendingPeriod')}
                  </CommonTooltip>
                </span>
                <span className="text-black font-medium font-['Roboto_Mono',monospace]">
                  {project.lendingPeriod} {t('modals.purchase.months')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#BFC9D480]">
                <span className="font-['Roboto_Mono',monospace]">{t('modals.purchase.startDate')}</span>
                <span className="text-black font-medium font-['Roboto_Mono',monospace]">
                  {project.startDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Buttons for Mobile */}
      {project.status !== "sold_out" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white">
          <div className="flex gap-1">
            <button
              onClick={onClose}
              className="flex basis-1/2 h-[80px] px-2 text-center justify-center items-center gap-2 bg-[#F5F5F5] uppercase font-medium cursor-pointer text-sm"
            >
              {t('modals.purchase.cancel')}
            </button>
            <CommonButton
              className="flex basis-1/2 h-[80px] px-2 justify-center items-center gap-2 !rounded-none uppercase cursor-pointer text-sm"
              onClick={async () => {
                await onLendSupport(project, quantity);
              }}
            >
              {t('modals.purchase.buyNow')}
            </CommonButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseModalMobile; 
