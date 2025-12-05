import { TopPageClient } from './page-client';

interface PageProps {
  params: Promise<{ lng: string }>
}

export default async function Page({ params }: PageProps) {
  const { lng } = await params;
  const effectiveLng = lng || 'en';
  
  return <TopPageClient lng={effectiveLng} />;
}