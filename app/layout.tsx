import './globals.css';
import localFont from 'next/font/local'
import type { Metadata } from 'next'; // Import Metadata type
import React from 'react';
import MeshProviderWrapper from '@/components/providers/MeshProviderWrapper';
import QueryProvider from '@/components/providers/QueryProvider';


const functionPro = localFont({
  src: [
    { path: "../public/fonts/FunctionPro-Book.otf", weight: '400' },
    { path: "../public/fonts/FunctionPro-Medium.otf", weight: '500' }
  ],
  variable: "--font-function-pro",
  display: 'swap',
});

const notoSansJP = localFont({
  src: [
    { path: "../public/fonts/NotoSansJP-Regular.ttf", weight: '400' },
    { path: "../public/fonts/NotoSansJP-Medium.ttf", weight: '500' }
  ],
  variable: "--font-noto-sans-jp",
  display: 'swap',
});

// Define metadata using the Metadata object
export const metadata: Metadata = {
  metadataBase: new URL('https://v2.harvestflow.io'), // Base URL for resolving relative image paths
  title: "HARVEST FLOW",
  description: "Engage in Social Action with an 8% Interest. Connecting with the world through cryptocurrency lending.",
  openGraph: {
    title: "HARVEST FLOW",
    description: "Engage in Social Action with an 8% Interest. Connecting with the world through cryptocurrency lending.",
    url: "https://v2.harvestflow.io",
    siteName: "HARVEST FLOW",
    locale: 'en_US', // Default locale, can be adjusted if needed per language
    type: 'website',
  },
  // Explicitly define icons using the icons property
  icons: {
    icon: [ // Standard favicons
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [ // Apple touch icons
      { url: '/favicon/apple-icon-57x57.png', sizes: '57x57' },
      { url: '/favicon/apple-icon-60x60.png', sizes: '60x60' },
      { url: '/favicon/apple-icon-72x72.png', sizes: '72x72' },
      { url: '/favicon/apple-icon-76x76.png', sizes: '76x76' },
      { url: '/favicon/apple-icon-114x114.png', sizes: '114x114' },
      { url: '/favicon/apple-icon-120x120.png', sizes: '120x120' },
      { url: '/favicon/apple-icon-144x144.png', sizes: '144x144' },
      { url: '/favicon/apple-icon-152x152.png', sizes: '152x152' },
      { url: '/favicon/apple-icon-180x180.png', sizes: '180x180' },
    ],
    other: [ // Android/Chrome icons etc.
      { rel: 'icon', type: 'image/png', sizes: '192x192', url: '/favicon/android-icon-192x192.png' },
      // Add other necessary icons like ms-icon if needed
      // { rel: 'msapplication-TileImage', url: '/favicon/ms-icon-144x144.png' }
    ]
  }
};

interface Props {
  children: React.ReactNode;
}

export default function RootLayout({
  children,
}: Props) {
  return (
    <html lang="en">
      <body className={`${functionPro.variable} ${notoSansJP.variable} font-function-pro antialiased`}>
        <QueryProvider>
          <MeshProviderWrapper>
            {children}
          </MeshProviderWrapper>
        </QueryProvider>
      </body>
    </html>
  )
}