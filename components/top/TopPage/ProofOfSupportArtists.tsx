import React, { forwardRef, ForwardedRef } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/i18n/client';

const ProofOfSupportArtists = forwardRef<HTMLDivElement, { lng: string }>(({ lng }, ref: ForwardedRef<HTMLDivElement>) => {
  const { t } = useTranslation(lng, 'common');
  return (
    <>
      <div ref={ref} className="max-w-[1440px] mx-auto px-4 py-16 md:flex-row items-center">
        <div className="flex items-center text-[#1D1E1F] opacity-50 text-base mb-4">
          <span className="w-2 h-2 bg-[#1D1E1F] rounded-full mr-2"></span> {t('top.artists.title')}
        </div>
        <div className="md:flex items-start font-light text-base font-medium mb-4">
          <div className="w-full md:w-1/2 pt-6 md:pr-4">
            <Image
              src="/images/top/proof-of-support-artists01.png"
              alt=""
              width={1400}
              height={500}
            />
            <div className='text-left font-light text-dark-blue text-2xl mt-8 mb-2'>
              {t('top.artists.izumidaLee.name')}
            </div>
            <div className='text-left font-light text-[#707070] text-base mb-4 leading-6'>
              {t('top.artists.izumidaLee.bio')}
            </div>
          </div>
          <div className="w-full md:w-1/2 pt-6 md:pl-4">
            <Image
              src="/images/top/proof-of-support-artists02.png"
              alt=""
              width={1400}
              height={500}
            />
            <div className='text-left font-light text-2xl text-dark-blue mt-8 mb-2'>
              {t('top.artists.momokaIto.name')}
            </div>
            <div className='text-left font-light text-[#707070]  text-base mb-4 leading-6'>
              {t('top.artists.momokaIto.bio')}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

ProofOfSupportArtists.displayName = 'ProofOfSupportArtists';

export default ProofOfSupportArtists;
