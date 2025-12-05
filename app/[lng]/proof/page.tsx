import CommonFooter from '@/components/common/CommonFooter';
import ProofPage from '@/components/proof';
import { Suspense } from 'react';

interface PageProps {
  params: Promise<{ lng: string}>
}

export default async function Page({ params }: PageProps) {
  const { lng } = await params;
   
  const effectiveLng = lng || 'en';
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProofPage lng={effectiveLng} />
      <CommonFooter lng={effectiveLng} />
    </Suspense>
  )
}
