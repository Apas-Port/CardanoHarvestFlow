import React from "react";

import { ExtraSmallTile } from "@/components/common/DataTiles";

import { RwaAsset } from "@/lib/types";
import { Project } from "@/lib/project";

const DriverAvatar = () => (
  <svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24.3 51.6C10 54.65 0 61.75 0 70V90H40L25 70H12.5M40 90L48.9 54.05C48.9 54.05 45 55 40 55C35 55 31.1 54.05 31.1 54.05M40 90H80V70C80 61.75 70 54.65 55.7 51.6L67.5 70H55L40 90Z" fill="#325AB4" />
    <path d="M20 20C20 8.9543 28.9543 0 40 0C51.0457 0 60 8.95431 60 20V29.3845C60 38.5618 53.7541 46.5615 44.8507 48.7873C41.6659 49.5835 38.3341 49.5835 35.1493 48.7873C26.2459 46.5615 20 38.5618 20 29.3845V20Z" fill="#325AB4" />
  </svg>
);

const AssetOverviewSection: React.FC<{
  asset?: RwaAsset;
  project?: Project;
  notRwaFounded: boolean;
}> = ({ asset, project, notRwaFounded = false }) => {
  // Mock metrics data
  const totalDistance = 12345; // km
  const totalTravelTime = 456; // hours

  if(notRwaFounded) {
    return (
      <div className="flex flex-col gap-[50px] xl:gap-[58px]">
        <h2 className="text-heading5Larger xl:text-heading4_30_30 text-center uppercase font-medium tracking-[0.35rem]">RWA DATA</h2>
        <div className="text-center">No RWA Found</div>
      </div>
    )
  }

  if(!asset) {
    return (
      <p>Loading...</p>
    )
  }

  return (
    <div className="flex flex-col gap-[60px] xl:gap-[58px]">
      <h2 className="text-heading5Larger xl:text-heading4_30_30 text-center uppercase font-medium tracking-[0.35rem]">ASSET OVERVIEW</h2>
      <div className="bg-white border-r border-b border-black">
        <div className="grid grid-cols-1 grid-rows-2 xl:grid-rows-1 xl:grid-cols-2">
          <div className="grid grid-cols-2 grid-rows-1">
            <div className="grid grid-rows-2 grid-cols-1 bg-center bg-cover bg-no-repeat border-t border-l border-black" style={{ backgroundImage: `url(${project?.tuktukImage || '/images/project/2/tuktuk.png'})` }}></div>
            <div className="grid grid-rows-2 grid-cols-1">
              <ExtraSmallTile title={`Asset Id`} value={`${asset.assetId}`} />
              <ExtraSmallTile title={`Vehicle model`} value={`${asset.carModel}`} />
            </div>
          </div>
          <div className="grid grid-cols-1 grid-rows-2">
            <div className="grid grid-cols-2 grid-rows-1">
              <ExtraSmallTile title={`Number of Payments`} value={`${asset.numberOfPaymentsMade}/${asset.totalNumberOfPayments}`} />
              <ExtraSmallTile title={`Asset type`} value={asset.assetType} />
            </div>
            <div className="grid grid-cols-2 grid-rows-1">
              <ExtraSmallTile title={`Mileage`} value={`${Math.round(totalDistance)} km`} />
              <ExtraSmallTile title={`Mileage TIME`} value={`${Math.round(totalTravelTime)} HRS`} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 grid-rows-2 xl:grid-rows-1 xl:grid-cols-2">
          <ExtraSmallTile
            title={`History`}
          >
            <div className="flex flex-col items-center justify-center text-lg xl:text-base gap-3 xl:min-h-32">
              {asset.history}
            </div>
          </ExtraSmallTile>
          <ExtraSmallTile
            title={`Driver Profile`}
          >
            <div className="flex gap-6 items-center p-[35px]">
              <div className="w-[56px] xl:w-[80px] shrink-0">
                <DriverAvatar />
              </div>
              <div className="flex flex-col justify-center gap-0">
                <p className="text-base">Name: {asset.driverName}</p>
                <p className="text-base">Sex: {asset.driverSex}</p>
                <p className="text-base">Driver Since: {asset.driverSince? asset.driverSince: "-"}</p>
                <p className="text-base">Location: {asset.driverLocation}</p>
              </div>
            </div>
          </ExtraSmallTile>
        </div>
      </div>
    </div>
  );
};

export default AssetOverviewSection;
