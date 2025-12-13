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
  const [tvlFromAPI, setTvlFromAPI] = useState<number | null>(null);
  
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

  // Fetch TVL from API (DefiLlama style)
  const fetchTvlFromAPI = useCallback(async (): Promise<number> => {
    try {
      const networks = ['plume_mainnet', 'polygon'];
      const apiUrl = 'https://harvestflow-api-production.up.railway.app/token-events/total';
      
      const tvlPromises = networks.map(async (network) => {
        try {
          const response = await fetch(`${apiUrl}/${network}`);
          if (!response.ok) {
            console.warn(`Failed to fetch TVL for ${network}:`, response.status);
            return 0;
          }
          const data = await response.json();
          return data.totalAmount || 0;
        } catch (error) {
          console.error(`Error fetching TVL for ${network}:`, error);
          return 0;
        }
      });
      
      const results = await Promise.all(tvlPromises);
      const totalTvl = results.reduce((sum, value) => sum + value, 0);
      
      return totalTvl;
    } catch (error) {
      console.error('Error fetching TVL from API:', error);
      return 0;
    }
  }, []);

  // Fallback: Calculate TVL from projects data
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

  // Fetch TVL from API on component mount
  useEffect(() => {
    const loadTvl = async () => {
      try {
        const tvl = await fetchTvlFromAPI();
        if (tvl > 0) {
          setTvlFromAPI(tvl);
        }
      } catch (error) {
        console.error('Failed to load TVL from API:', error);
      }
    };
    
    loadTvl();
  }, [fetchTvlFromAPI]);

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

    // Test values - used as fallback when data is not available
    const TEST_VALUES = {
      projects: 5,
      totalValue: 500000,
      tuktuks: 150
    };

    // Priority: TVL from API > calculated from projects > test values
    const calculatedTotalValue = getTotalValueLoaned();
    const totalValue = tvlFromAPI !== null && tvlFromAPI > 0 
      ? tvlFromAPI 
      : (calculatedTotalValue > 0 ? calculatedTotalValue : TEST_VALUES.totalValue);
    
    const hasValidData = projects && projects.length > 0;
    
    const projectsCount = hasValidData ? (5 + projects.filter(project => project.listing).length) : TEST_VALUES.projects;
    const tuktuks = TEST_VALUES.tuktuks; // Always use test value for tuktuks

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
  }, [projects, animateCounter, getTotalValueLoaned, hasAnimated, tvlFromAPI]);

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
