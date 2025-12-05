// Next.js built-in components for head management
import Head from 'next/head';

interface MetaConfig {
  title?: string;
  description?: string;
  ogImage?: string;
  ogUrl?: string;
  siteName?: string;
  twitterSite?: string;
  twitterCreator?: string;
}

export const HeadComponent: React.FC<MetaConfig> = ({
  title = "Custom Wraps",
  description = "Custom prints and wraps for Real World Assets",
  ogImage = "https://customwraps.harvestflow.io/images/PR_01.jpg",
  ogUrl = "https://customwraps.harvestflow.io",
  siteName = "Custom Wraps",
  twitterSite = "@harvestflow_io",
  twitterCreator = "@ApasPort_Web3",
}) => {
  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${title} - Ride the Current with Harvest Flow`} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />

      {/* Default favicon */}
      <link rel="icon" href="/favicon/favicon.ico" />
    </Head>
  );
};
