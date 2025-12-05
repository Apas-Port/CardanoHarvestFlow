import Account from '@/components/account';

interface PageProps {
  params: Promise<{ lng: string }>
}

export default async function Page({ params }: PageProps) {
  const { lng } = await params;
  const effectiveLng = lng || 'en';
  return (
    <Account lng={effectiveLng} />
  );
}
