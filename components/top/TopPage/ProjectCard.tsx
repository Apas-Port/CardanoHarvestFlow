import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Project } from '@/lib/project';
import { createPopper } from '@popperjs/core';
import CommonTooltip from '@/components/common/CommonTooltip';
import { useTranslation } from '@/i18n/client';
import { getNetworkImage } from '@/lib/network';

interface ProjectCardProps {
  project: Project;
  lng: string;
}

const PROGRESS_GRADIENT = 'linear-gradient(133deg, #95CAFF 0%, #83A6FF 99%)';

const ProgressBar = ({ width }: { width: string }) => (
  <div
    className="h-1.5 rounded-full"
    style={{ width, background: PROGRESS_GRADIENT }}
    aria-label="progress bar"
    role="progressbar"
  />
);

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  lng
}) => {
  const { t } = useTranslation(lng, 'common');
  const displayCurrency = project.displayCurrency ?? project.lendingType;
  const displayRaisedAmount = project.displayRaisedAmount ?? project.raisedAmount;
  const displayTotalAmount = project.displayTotalAmount ?? project.totalAmount;
  const [boostTooltipShow, setBoostTooltipShow] = useState(false);
  const boostBtnRef = useRef<HTMLImageElement>(null);
  const boostTooltipRef = useRef<HTMLDivElement>(null);
  const openBoostTooltip = () => {
    if (boostBtnRef.current && boostTooltipRef.current) {
      createPopper(boostBtnRef.current, boostTooltipRef.current, { placement: "top" });
      setBoostTooltipShow(true);
    }
  };
  const closeBoostTooltip = () => setBoostTooltipShow(false);

  return (
    <>
      <div
        className="relative bg-[#F5F5F5] w-[512px] rounded-lg shadow-md flex cursor-pointer overflow-visible"
        style={{ width: '544px', height: '212px' }}
      >
        <div
          className="relative p-3 rounded-2xl"
        >
          <div
            className='rounded-2xl'
            style={{ width: '195px', height: '188px' }}
          >
            <Image
              className='rounded-2xl'
              src={project.mainImage}
              alt={project.title}
              width="195"
              height="188"
              objectFit="cover"
              draggable={false}
            />
          </div>
        </div>
        <div className="w-2/3 p-4 flex flex-col justify-between relative">
          <div className='flex justify-between items-start'>
            <div>
              <p className="text-gray-500 text-sm mb-0 pt-3 font-function-pro">No. {String(project.num).padStart(3, '0')}</p>
              <h3 className="text-lg font-medium mb-2 font-function-pro">{project.title}</h3>
            </div>
            {(project.title === "Plume Tuktuks 01" || project.title === "Plume Tuktuks 02") && (
              <div className="relative ml-auto" style={{ display: 'inline-block' }}>
                <Image
                  ref={boostBtnRef}
                  src="/images/common/plume-boost.svg"
                  alt="Plume Boost"
                  aria-label="Plume Boost"
                  width={140}
                  height={33}
                  draggable={false}
                  priority
                  tabIndex={0}
                  className="animate-glow-pulse"
                  style={{ right: '-10px', position: 'relative' }}
                  onMouseEnter={openBoostTooltip}
                  onMouseLeave={closeBoostTooltip}
                  onFocus={openBoostTooltip}
                  onBlur={closeBoostTooltip}
                />
                <CommonTooltip
                  show={boostTooltipShow}
                  tooltipRef={boostTooltipRef}
                  className="min-w-[240px] p-3 rounded text-white text-sm text-left shadow-[2px_2px_6px_0px_rgba(40,41,56,0.15)] whitespace-normal break-words bg-gradient-to-r from-[#26C393] via-[#00D594] to-[#26C393] z-50"
                  role="tooltip"
                >
{t('modals.purchase.tooltips.plumeBoost')}
                </CommonTooltip>
              </div>
            )}
          </div>
          <div>
            <span className="p-1 items-center gap-[1px] bg-[#7acaac66] text-[#095438] text-[13px] font-medium rounded font-mono">
              APY {project.apy.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center space-x-4 my-4">
            <div className="flex items-center">
              <Image src={getNetworkImage(project.network)} alt={project.lendingType} width={22} height={22} className="mr-1" draggable={false}/>
              <span className="text-gray-700 text-base font-['Function_Pro',sans-serif]">{project.lendingType} Lending</span>
            </div>
            <div className="flex items-center">
              <Image src={getNetworkImage(project.network)} alt={project.network} width={22} height={22} className="mr-1" draggable={false}/>
              <span className="text-gray-700 text-base font-['Function_Pro',sans-serif]">{project.network} Network</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
            <ProgressBar width={
              (project.title !== "")
                ? "100%"
                : project.status === "sold_out"
                  ? "100%"
                  : project.status === "coming_soon"
                    ? "0%"
                    : `${Number(Number(project.mintedAmount) / Number(project.capacity)) * 100}%`
            } />
          </div>
          <div className="flex justify-between text-sm text-gray-700">
            <span>
              {project.status === 'coming_soon' ? 
                <span className="text-black text-[14px] font-normal font-['Function_Pro',sans-serif] leading-normal">Coming Soon</span> :
                project.status === 'sold_out' ? 
                <span className="text-black text-[14px] font-normal font-['Function_Pro',sans-serif] leading-normal">Sold Out</span>:
                <div className="flex items-center gap-1">
                  <div className="ripple-container">
                    <div className="ripple-ring animate-ripple"></div>
                    <div className="ripple-ring animate-ripple"></div>
                    <div className="ripple-dot animate-dot-pulse"></div>
                  </div>
                  <span className="text-black text-[14px] font-normal font-['Function_Pro',sans-serif] leading-normal">Live</span>
                </div>
              }
            </span>
            {(project.title !== "") ? (
              <span className="text-right text-black text-[14px] font-normal font-['Roboto_Mono',monospace]">{Number(displayRaisedAmount).toLocaleString()} {displayCurrency}</span>
            ) : (
              project.status === "sold_out"? (
                <span className="text-right text-black text-[14px] font-normal font-['Roboto_Mono',monospace]">{Number(displayTotalAmount).toLocaleString()}/{Number(displayTotalAmount).toLocaleString()} {displayCurrency}</span>
              ): project.status === "coming_soon"? (
                <span></span>
              ): (
                <span className="text-right text-black text-[14px] font-normal font-['Roboto_Mono',monospace]">{Math.min(Number(displayRaisedAmount), Number(displayTotalAmount)).toLocaleString()}/{Number(displayTotalAmount).toLocaleString()} {displayCurrency}</span>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectCard;
