import React, { forwardRef } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/i18n/client';


const About = forwardRef<HTMLDivElement, { lng: string }>((props, ref) => {
  const { lng } = props;
  const { t } = useTranslation(lng, 'common');
  return (
    <>
    <div ref={ref} className="max-w-[1440px] mx-auto px-4 pt-16 mb-12 flex flex-col justify-between md:flex-row items-center">
      <div className="md:w-3/7 md:pr-8 mb-8 md:mb-0">
        <div className="flex items-center text-[#1D1E1F] opacity-50 text-base mb-4">
          <span className="w-2 h-2 bg-[#1D1E1F] rounded-full mr-2"></span> {t('top.about.initiative')}
        </div>
        <p className="text-xl mb-6 leading-6">
          {t('top.about.lead1')}
        </p>
        <p className="text-lg text-gray-700 leading-6">
          {t('top.about.lead2')}
        </p>
      </div>
      <div className="md:w-3/7">
        <Image
          src="/images/top/tuktuk-image.png"
          alt="Tuktuks"
          width={555}
          height={400}
          layout="responsive"
        />
      </div>
    </div>


      <div className="container mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Column 1 */}
          <div className="bg-[#325AB4] pb-0 text-white p-8 rounded-lg">
            <h2 className="text-2xl font-medium pb-8">
              {t('top.about.col1.title').split('<br/>').map((line, i) => (
                <span key={i}>{line}{i !== t('top.about.col1.title').split('<br/>').length - 1 && <br />}</span>
              ))}
            </h2>
            <p className="mb-4 opacity-80">
              {t('top.about.col1.p1')}
            </p>
            <p className="mb-4 opacity-80">
              {t('top.about.col1.p2')}
            </p>
          </div>

          {/* Column 2 */}
          <div className="bg-gray-100 pb-0 p-8 rounded-lg">
            <h2 className="text-2xl font-medium pb-8">
              {t('top.about.col2.title').split('<br/>').map((line, i) => (
                <span key={i}>{line}{i !== t('top.about.col2.title').split('<br/>').length - 1 && <br />}</span>
              ))}
            </h2>
            <p className="mb-4">
              {t('top.about.col2.p1')}
            </p>
            <p className="mb-4">
              {t('top.about.col2.p2')}
            </p>
            <p>
              {t('top.about.col2.p3')}
            </p>
          </div>

          {/* Column 3 */}
          <div className="bg-gray-300 pb-0 rounded-lg flex flex-col relative">
            <div className="rounded-lg w-full min-h-[465px] min-w-[320px]">
              <Image
                src="/images/top/top-video.png"
                alt="video"
                fill sizes="100vw"
                className="object-cover rounded-lg" 
              />
            </div>
            <div
              className="absolute bottom-4 right-0 flex items-center justify-end space-x-2 bg-white rounded-full px-4 pr-1 py-1 cursor-pointer mr-4 w-auto max-w-xs border-2 border-gray-200"
              tabIndex={0}
              aria-label={t('top.about.col3.videoLabel')}
              onClick={() => window.open('https://www.youtube.com/watch?v=k96THhsz_NE&t', '_blank')}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { window.open('https://www.youtube.com/watch?v=k96THhsz_NE&t', '_blank'); } }}
            >
              <p className="text-gray-800 text-sm">{t('top.about.col3.videoLabel')}</p>
              <div
                className={`
                  h-8 w-8 rounded-full
                  p-1 text-black font-medium text-lg
                  bg-gradient-to-b from-[#F9D78C] to-[#E7B45A]
                  hover:opacity-80 transition-opacity duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <Image
                  src="/images/common/play-icon.svg"
                  alt="Play video"
                  width={24}
                  height={24}
                  className="font-light h-6 w-6"
                />
              </div>
            </div>
          </div>

          {/* Column 4 */}
          <div className="bg-gray-100 pb-0 p-8 rounded-lg">
            <h2 className="text-2xl font-medium pb-8">
              {t('top.about.col4.title').split('<br/>').map((line, i) => (
                <span key={i}>{line}{i !== t('top.about.col4.title').split('<br/>').length - 1 && <br />}</span>
              ))}
            </h2>
            <p className="mb-4">
              {t('top.about.col4.p1')}
            </p>
            <p className="mb-4">
              {t('top.about.col4.p2')}
            </p>
          </div>
        </div>
      </div>

    </>
  );
});

About.displayName = 'About';

export default About;
