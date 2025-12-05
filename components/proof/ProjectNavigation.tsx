import React from "react";
import Link from "next/link";

// Utility function to combine class names
const clsx = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

export enum ProjectNavigationLink {
  YourNFT = "your-nft",
  AssetOverview = "asset-overview",
  Earn = "earn",
  RWA = "rwa",
  Updates = "updates",
}

const ProjectNavigation: React.FC<{
  isAccessToken?: boolean;
 }> = ({isAccessToken}) => {
  const getElement = (dataAttribute: string) => {
    return document.getElementById(dataAttribute);
  };

  const handleScrollToElement = (dataAttribute: string) => {
    const element = getElement(dataAttribute);
    if (!element) return;

    const elementTop = element.offsetTop - 120; // offsetY: 120 相当
    window.scrollTo({
      top: elementTop,
      behavior: 'smooth'
    });
  };

  return (
    <ul className="flex flex-col gap-5">
      { !isAccessToken && (<li
        className={clsx("text-heading5SmallerLH24 font-medium uppercase account-navigation-link hover:cursor-pointer")}
        onClick={() => {
          handleScrollToElement(ProjectNavigationLink.YourNFT);
        }}
        data-to-scrollspy-id={ProjectNavigationLink.YourNFT}
      >
        Proof of support
      </li>)}
      { !isAccessToken && (<li
        className={clsx("text-heading5SmallerLH24 font-medium uppercase account-navigation-link hover:cursor-pointer")}
        onClick={() => {
          handleScrollToElement(ProjectNavigationLink.Earn);
        }}
        data-to-scrollspy-id={ProjectNavigationLink.Earn}
      >
        Harvest
      </li>)}
      <li
        className={clsx("text-heading5SmallerLH24 font-medium uppercase account-navigation-link hover:cursor-pointer")}
        onClick={() => {
          handleScrollToElement(ProjectNavigationLink.AssetOverview);
        }}
        data-to-scrollspy-id={ProjectNavigationLink.AssetOverview}
      >
        Asset overview
      </li>
      <li
        className={clsx("text-heading5SmallerLH24 font-medium uppercase account-navigation-link hover:cursor-pointer")}
        onClick={() => {
          handleScrollToElement(ProjectNavigationLink.RWA);
        }}
        data-to-scrollspy-id={ProjectNavigationLink.RWA}
      >
        RWA Data
      </li>
      <li className={clsx("text-heading5SmallerLH24 font-medium uppercase account-navigation-link hover:cursor-pointer")}>
        <Link href="/account">my account</Link>
      </li>
    </ul>
  );
};

export default ProjectNavigation;
