import React from "react";
import Link from "next/link";

// Utility function to combine class names
const clsx = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

export enum AccountProjectNavigationLink {
  YourNFT = "your-nft",
  AssetOverview = "asset-overview",
  Earn = "earn",
  RWA = "rwa",
  Updates = "updates",
}

const AccountProjectNavigation: React.FC = () => {
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
      <li
        className={clsx("text-heading5SmallerLH24 font-medium uppercase account-navigation-link hover:cursor-pointer")}
        onClick={() => {
          handleScrollToElement(AccountProjectNavigationLink.YourNFT);
        }}
        data-to-scrollspy-id={AccountProjectNavigationLink.YourNFT}
      >
        Proof of support
      </li>
      <li
        className={clsx("text-heading5SmallerLH24 font-medium uppercase account-navigation-link hover:cursor-pointer")}
        onClick={() => {
          handleScrollToElement(AccountProjectNavigationLink.Earn);
        }}
        data-to-scrollspy-id={AccountProjectNavigationLink.Earn}
      >
        Harvest
      </li>
      <li
        className={clsx("text-heading5SmallerLH24 font-medium uppercase account-navigation-link hover:cursor-pointer")}
        onClick={() => {
          handleScrollToElement(AccountProjectNavigationLink.AssetOverview);
        }}
        data-to-scrollspy-id={AccountProjectNavigationLink.AssetOverview}
      >
        Asset overview
      </li>
      <li
        className={clsx("text-heading5SmallerLH24 font-medium uppercase account-navigation-link hover:cursor-pointer")}
        onClick={() => {
          handleScrollToElement(AccountProjectNavigationLink.RWA);
        }}
        data-to-scrollspy-id={AccountProjectNavigationLink.RWA}
      >
        RWA Data
      </li>
      <li className={clsx("text-heading5SmallerLH24 font-medium uppercase account-navigation-link hover:cursor-pointer")}>
        <Link href="/account">my account</Link>
      </li>
    </ul>
  );
};

export default AccountProjectNavigation;
