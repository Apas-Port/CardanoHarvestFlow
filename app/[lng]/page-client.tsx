'use client';
import React, { useState, Suspense } from 'react';
import { TopPage } from '@/components/top/TopPage';
import LoadingScreen from '@/components/common/LoadingScreen';

interface TopPageClientProps {
  lng: string;
}

export function TopPageClient({ lng }: TopPageClientProps) {
  const [showLoading, setShowLoading] = useState(true);
  const [shouldRenderLoading, setShouldRenderLoading] = useState(true);

  const handleTopPageLoaded = () => {
    setTimeout(() => {
      setShowLoading(false);
    }, 100);
  };

  const handleFadeOut = () => {
    setShouldRenderLoading(false);
  };

  return (
    <>
      <Suspense fallback={<LoadingScreen isVisible={true} onFadeOut={() => {}} />}>
        <TopPage lng={lng} onLoaded={handleTopPageLoaded} />
      </Suspense>
      {shouldRenderLoading && (
        <div className="fixed inset-0 z-50">
          <LoadingScreen isVisible={showLoading} onFadeOut={handleFadeOut} />
        </div>
      )}
    </>
  );
}