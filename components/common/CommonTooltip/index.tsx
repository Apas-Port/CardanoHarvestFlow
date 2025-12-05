import React, { RefObject } from 'react';

type CommonTooltipProps = {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  tooltipRef?: RefObject<HTMLDivElement | null>;
  role?: string;
};

const CommonTooltip: React.FC<CommonTooltipProps> = ({ show, children, className = '', tooltipRef, role = 'tooltip' }) => (
  <div
    ref={tooltipRef as React.LegacyRef<HTMLDivElement>}
    className={`absolute z-10 inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 rounded-lg shadow-xs tooltip bg-[#586789] ${show ? 'opacity-100 visible' : 'opacity-0 invisible'} ${className}`}
    role={role}
  >
    {children}
  </div>
);

export default CommonTooltip; 