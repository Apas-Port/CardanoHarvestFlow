import { useState, useEffect } from "react";
import { ExtraSmallTile, LargeTile } from "@/components/common/DataTiles";
import { Project } from "@/lib/project";

interface ClaimData {
  claimableAmount?: number;
  claimablePrinciple?: number;
  totalEquityAmount: number;
  totalHarvestedAmount: number;
  isLoading: boolean;
}

const ProjectEarnSection: React.FC<{
  isAccessToken?: boolean;
  project?: Project;
  state: string;
  claimData: ClaimData;
  setSelectedNftClaimableAmount?: (amount: number) => void;
  onHarvest?: () => void;
  error?: string;
}> = ({ isAccessToken = false, project, claimData, setSelectedNftClaimableAmount, onHarvest, state, error }) => {
  const [harvestbtnTxt, setHarvestbtnTxt] = useState<string | null>(null);
  useEffect(() => {
    if (state === "waiting") {
      setHarvestbtnTxt("Transaction...");
    } else if (state === "waiting") {
      setHarvestbtnTxt("Confirmation...");
    } else if (state === "success") {
      setHarvestbtnTxt("Completed!");
    } else {
      setHarvestbtnTxt("Harvest");
    }

    setSelectedNftClaimableAmount?.(claimData.claimableAmount ?? 0);
  }, [state, claimData.claimableAmount, setSelectedNftClaimableAmount]);

  if(isAccessToken) return <></>;

  if (!project || claimData.isLoading) return <p>Loading...</p>;

  const lendingType = project?.lendingType ?? 'ADA';
  const lendingAmount = project?.unitPrice ?? claimData.totalEquityAmount ?? 0;
  const apr = project?.apy ?? 0;

  return (
    <div className="flex flex-col gap-[60px] xl:gap-[58px]">
      <h2 className="text-heading5Larger xl:text-heading4_30_30 text-center uppercase font-medium tracking-[0.35rem]">Harvest</h2>
      <div className="flex flex-col xl:flex-row gap-[30px] xl:gap-[17px]">
        <div className="flex flex-col xl:flex-row border-b border-black border-r bg-white flex-1">
          <LargeTile title={`TOTAL EQUITY in USD`} value={`${Math.round(claimData.totalEquityAmount)}`} />
          <div className="xl:w-[66%] flex flex-col">
            <div className="grid grid-cols-2 grid-rows-1 flex-1">
              <ExtraSmallTile title={`Lending`} value={`${lendingAmount} ${lendingType}`} />
              <ExtraSmallTile title={`TOTAL HARVESTED`} value={`${claimData.totalHarvestedAmount} ${lendingType}`} />
            </div>
            <div className="flex w-full xl:h-[100px]">
              <ExtraSmallTile title={`APR`} value={`${apr} %`} />
            </div>
          </div>
        </div>
        <div className="xl:w-[265px] xl:px-0">
          <div className="border-l border-black border-t border-r border-b flex flex-col">
            <div className="flex flex-col items-center justify-center py-[21px] px-6 xl:p-6 gap-[14px] xl:gap-6 flex-1 bg-white">
              <p className="text-body xl:text-bodyLarge24 uppercase text-center font-normal">
                {`CLAIMABLE INTEREST`}
                <br className="hidden xl:block" />
                <span className="font-medium">${claimData.claimableAmount?.toLocaleString()}</span>
              </p>
              <p className="text-body xl:text-bodyLarge24 uppercase text-center font-normal">
                CLAIMABLE PRINCIPLE:
                <span className="xl:hidden">:</span>
                <br className="hidden xl:block" /> <span className="font-medium">${claimData.claimablePrinciple?.toLocaleString()}</span>
              </p>
            </div>
            <button onClick={onHarvest} className="p-[32px] xl:p-[37px] flex items-center justify-center flex-1 shrink-0 border-t border-black text-heading5SmallerLH26 font-medium uppercase tracking-[0.35rem] h-[80px] xl:h-[100px] cursor-pointer bg-primary">
              {harvestbtnTxt}
            </button>
          </div>
        </div>
      </div>

      {state === "successful" && (
        <div className="flex text-xs tracking-wider bg-white border-black border p-5 uppercase">
          <div className="break-all font-medium">
            <p className="text-xs opacity-70">Harvest</p>
            <p className="text-[3em] font-medium mt-4 color-primary">{claimData.claimableAmount?.toLocaleString()}</p>
            <p className="text-base mt-4">Completed! The transaction was successful.</p>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="flex text-xs tracking-wider bg-white border-black border p-5 uppercase">
          <div className="break-all">
            <p className="text-xs opacity-70 mt-3">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectEarnSection;
