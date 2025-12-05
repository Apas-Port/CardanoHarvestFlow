import { languages } from '@/i18n/settings';
import React from 'react';

export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

interface Props {
  children: React.ReactNode;
}

export default function LngLayout({
  children,
}: Props) {
  return <>{children}</>;
}
