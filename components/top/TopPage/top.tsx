'use client';

import { useTranslation } from '@/i18n/client';
import { Project } from '@/lib/project';
import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';

export const Top = ({ lng, projects }: { lng: string, projects: Project[] }) => {
  const { t } = useTranslation(lng);
  
  const title1 = t('top.hero.title1');
  const title2 = t('top.hero.title2');

  // Animation states
  const [animatedProjectsCount, setAnimatedProjectsCount] = useState(0);
  const [animatedTotalValue, setAnimatedTotalValue] = useState(0);
  const [animatedTuktuks, setAnimatedTuktuks] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  // Ref to track if animation is in progress
  const animationInProgress = useRef(false);
  
  // Helper function to format numbers in abbreviated form
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'm';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }, []);

  const getTotalValueLoaned = useCallback(() => {
    try {
      if (!projects || projects.length === 0) {
        return 0;
      }
      
      const values = projects.map(project => {
        // Only include projects that are listed
        if(!project.listing) {
          return 0;
        }
        
        // Skip coming_soon projects
        if(project.status === "coming_soon") {
          return 0;
        }
        
        // Skip projects with invalid capacity or unitPrice
        if(!project.capacity || !project.unitPrice || project.capacity <= 0 || project.unitPrice <= 0) {
          return 0;
        }
        
        let value = 0;
        if(project.status === "sold_out") {
          // For sold out projects, use the full capacity * unitPrice
          // Fallback calculation for projects without contract data
          value = (project.totalAmount) || (project.capacity * project.unitPrice) || 0;
        } else {
          // For active projects, use the raised amount (mintedAmount * unitPrice)
          value = project.raisedAmount || 0;
        }
        return value;
      });
      
      const total = values.reduce((a, b) => a + b, 0);
      
      return total;
    } catch (error) {
      console.error('TVL calculation error:', error);
      return 0;
    }
  }, [projects]);

  // Smooth counter animation using requestAnimationFrame
  const animateCounter = useCallback((
    start: number,
    end: number,
    duration: number,
    callback: (value: number) => void
  ): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easedProgress = easeOutCubic(progress);
        const currentValue = Math.round(start + (end - start) * easedProgress);
        
        callback(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }, []);

  // Initialize and start animations
  useEffect(() => {
    // Prevent multiple animations
    if (hasAnimated || animationInProgress.current) {
      return;
    }
    
    // Wait for project data to be loaded
    if (!projects || projects.length === 0) {
      return;
    }

    // Fallback values - used when data is not available
    const FALLBACK_VALUES = {
      projects: 1,
      totalValue: 100,
      tuktuks: 120
    };

    // Use real data from projects
    const realTotalValue = getTotalValueLoaned();
    const hasValidData = projects && projects.length > 0;

    const projectsCount = hasValidData ? projects.filter(project => project.listing).length : FALLBACK_VALUES.projects;
    const totalValue = hasValidData && realTotalValue > 0 ? realTotalValue : FALLBACK_VALUES.totalValue;

    const tuktuks = FALLBACK_VALUES.tuktuks; // Always use fallback value for tuktuks (not tracked on-chain)

    animationInProgress.current = true;
    setHasAnimated(true);

    // Start animations after a short delay
    const timeoutId = setTimeout(async () => {
      setIsVisible(true);
      
      try {
        // Run animations in parallel for better performance
        await Promise.all([
          animateCounter(0, projectsCount, 2000, setAnimatedProjectsCount),
          animateCounter(0, totalValue, 2500, setAnimatedTotalValue),
          animateCounter(0, tuktuks, 2200, setAnimatedTuktuks)
        ]);
      } finally {
        animationInProgress.current = false;
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      animationInProgress.current = false;
    };
  }, [projects, animateCounter, getTotalValueLoaned, hasAnimated]);

  // Reset animation state when projects change significantly
  useEffect(() => {
    if (projects && projects.length > 0) {
      // Reset animation when project data is loaded or changed
      setHasAnimated(false);
      animationInProgress.current = false;
    }
  }, [projects]);

  return (
    <section className="relative text-white h-[400px] md:h-[340px] xl:h-[420px] bg-white">
      <div className="absolute bottom-0 top-24 left-0 w-full h-full z-10 pointer-events-none overflow-hidden px-8">
        {/* Mobile Background */}
        <Image
          src="/images/top/background-mobile.png"
          alt="Background Image"
          className="w-full h-full object-cover rounded-t-3xl md:hidden"
          width={0}
          height={0}
          sizes="100vw"
          priority
        />
        {/* Desktop Background */}
        <Image
          src="/images/top/background.png"
          alt="Background Image"
          className="w-full h-full object-cover rounded-t-3xl hidden md:block"
          width={0}
          height={0}
          sizes="100vw"
          priority
        />
      </div>
      <div className="relative mx-auto px-8 h-full flex flex-col justify-start pt-32 md:pt-54 z-15">
        <div className="text-center">
          <h1 className={`text-[28px] md:text-[40px] leading-[1] tracking-[0.5px] whitespace-pre-line px-4 md:px-0 ${lng === 'ja' ? 'font-noto-sans-jp' : 'font-function-pro'}`} style={{ color: '#F5F5F5' }}>
            {title1}<br/>
            {title2}
          </h1>
        </div>
        {/* Statistics Section */}
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-12 md:justify-center items-center mt-6 md:mt-8 mb-6 md:mb-8 lg:mb-18">
          <div className="text-center w-40">
            <div className="text-sm" style={{ color: '#F5F5F5', opacity: 0.6 }}>{t('top.stats.projects')}</div>
            <div 
              className={`text-3xl md:text-4xl font-medium tabular-nums font-['Roboto_Mono',monospace] text-center min-w-[64px] transition-all duration-500 ease-out ${
                isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
              }`}
              style={{ 
                willChange: 'contents, transform, opacity',
                backfaceVisibility: 'hidden',
                perspective: '1000px'
              }}
            >
              {animatedProjectsCount}
            </div>
          </div>
          <div className="text-center w-40">
            <div className="text-sm" style={{ color: '#F5F5F5', opacity: 0.6 }}>{t('top.stats.totalValueLoaned')}</div>
            <div 
              className={`text-3xl md:text-4xl font-medium tabular-nums font-['Roboto_Mono',monospace] text-center flex justify-center items-center transition-all duration-500 ease-out ${
                isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
              }`}
              style={{ 
                willChange: 'contents, transform, opacity',
                backfaceVisibility: 'hidden',
                perspective: '1000px',
                transitionDelay: '100ms'
              }}
            >
              <span>$</span>
              <span className="inline-block text-right w-[80px] mr-10">
                {formatNumber(animatedTotalValue)}
              </span>
            </div>
          </div>
          <div className="text-center w-40">
            <div className="text-sm" style={{ color: '#F5F5F5', opacity: 0.6 }}>{t('top.stats.tuktuks')}</div>
            <div 
              className={`text-3xl md:text-4xl font-medium tabular-nums font-['Roboto_Mono',monospace] text-center min-w-[80px] transition-all duration-500 ease-out ${
                isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
              }`}
              style={{ 
                willChange: 'contents, transform, opacity',
                backfaceVisibility: 'hidden',
                perspective: '1000px',
                transitionDelay: '200ms'
              }}
            >
              {animatedTuktuks}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
