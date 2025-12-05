import React from "react";

import { ExtraSmallTile, LargeTile } from "@/components/common/DataTiles";
import RwaDataChart from "./RwaDataChart";
import { useGmsData } from "@/hooks/use-gms-data";
import { RwaAsset } from "@/lib/types";

const ProjectRWASection: React.FC<{ asset?: RwaAsset, notRwaFounded: boolean }> = ({ asset, notRwaFounded = false }) => {
  const { 
    metrics, 
    chartData
  } = useGmsData({ deviceId: asset?.deviceId ? String(asset?.deviceId) : undefined});


  if(notRwaFounded) {
    return (
      <div className="flex flex-col gap-[50px] xl:gap-[58px]">
        <h2 className="text-heading5Larger xl:text-heading4_30_30 text-center uppercase font-medium tracking-[0.35rem]">RWA DATA</h2>
        <div className="text-center">No RWA Found</div>
      </div>
    )
  }

  if(!asset) return <p>Loading...</p>

  return (
    <div className="flex flex-col gap-[50px] xl:gap-[58px]">
      <h2 className="text-heading5Larger xl:text-heading4_30_30 text-center uppercase font-medium tracking-[0.35rem]">RWA DATA</h2>
      <div className="bg-white">
        <div className="flex flex-col xl:flex-row items-stretch">
          <div className="flex flex-col flex-wrap xl:w-[40%] border-r border-black">
            <div className="flex w-full">
              <LargeTile
                title={`Total hours worked`}
                value={`${formatNumber(metrics.totalDrivingTime)} HRS`}
              />
            </div>
            <div className="flex w-full">
              <ExtraSmallTile
                title={`This week`}
                value={`${formatNumber(metrics.thisWeekHours)} HRS`}
              />
              <ExtraSmallTile
                title={`last week`}
                value={`${formatNumber(metrics.lastWeekHours)} HRS`}
              />
            </div>
            <div className="flex w-full">
              <LargeTile
                title={`total mileage`}
                value={`${formatNumber(metrics.totalMileage)} KM`}
              />
            </div>
            <div className="flex w-full border-b border-black">
              <ExtraSmallTile
                title={`This week`}
                value={`${formatNumber(metrics.thisWeekMileage)} km`}
              />
              <ExtraSmallTile
                title={`Last week`}
                value={`${formatNumber(metrics.lastWeekMileage)} km`}
              />
            </div>
          </div>
          <div className="xl:w-[60%] flex flex-col border-black border-r border-l border-b xl:border-t xl:border-l-0">
            <div className="px-3 xl:px-6 py-4 xl:py-[10px] border-b border-black border-dashed flex items-center justify-center">
              <p className="text-center uppercase text-captionMedium xl:text-caption relative">
                {`Driving Chart`}
              </p>
            </div>
            <div className="h-[800px] flex-1 flex items-center justify-center p-4">
              <RwaDataChart dailyStats={chartData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatNumber = (num: number): string => {
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

export default ProjectRWASection;
