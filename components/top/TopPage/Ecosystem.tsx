import React, { forwardRef, ForwardedRef } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/i18n/client';

const Ecosystem = forwardRef<HTMLDivElement, { lng: string }>(({ lng }, ref: ForwardedRef<HTMLDivElement>) => {
  const { t } = useTranslation(lng, 'common');
  return (
    <>
      <div ref={ref} className="max-w-[1440px] mx-auto px-4 py-16 md:flex-row items-center">
        <div className="flex items-center text-[#1D1E1F] opacity-50 text-base mb-4">
          <span className="w-2 h-2 bg-[#1D1E1F] rounded-full mr-2"></span> {t('top.ecosystem.title')}
        </div>
        <div className="flex items-center text-gray-500 text-base font-medium mb-4">
          <Image
            src="/images/top/ecosystem.png"
            alt=""
            width={1400}
            height={500}
          />
        </div>
      </div>
    </>
  );
});

Ecosystem.displayName = 'Ecosystem';

export default Ecosystem;
