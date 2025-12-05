import React from "react";

import { Project } from "@/lib/project";
import { RwaAsset } from "@/lib/types";
import { useRouter } from "next/navigation";
import Image from 'next/image';

const ProjectYourNFTSection: React.FC<{
  isAccessToken?: boolean;
  project?: Project;
  asset?: RwaAsset;
}> = ({ isAccessToken = false, project, asset }) => {
  const router = useRouter();
  
  if(isAccessToken) return <></>;

  if (!project) {
    console.log('ProjectYourNFTSection: No project provided');
    return <p>Loading project data...</p>;
  }

  const handleGoToProjectPage = () => {
    router.push(`/en/?projectId=${project.id}`);
  };

  return (
    <div className="flex flex-col gap-[40px]">
      <div className="flex flex-col gap-[20px] tracking-wider font-medium text-center uppercase">
        <h2 className="text-heading5Larger xl:text-heading4_30_30 leading-none">Proof of support</h2>
        <h3 className="text-xl leading-normal">
          {project.title}
          <br />
          {project.subTitle}
        </h3>
      </div>
      <div className="block xl:flex text-center border bg-white max-w-[1200px] h-auto">
        <div className='mx-auto xl:flex-shrink-0'>
          <Image src={project.previewImage} width={400} height={200} alt='project image' style={{ display: 'block' }}/>
        </div>

        <div className='basis-3/7 flex-grow flex flex-col border-t xl:border-none'>
          {/* Description Section - 50% */}
          <div className="bg-white xl:border-l h-1/2 flex flex-col">
            <h3 className="text-lg text-gray-500 uppercase mt-2 mb-2 border-dotted border-b pb-1">Description</h3>
            <div
              className="text-left w-3/4 xl:mt-8 mb-4 mx-auto break-words whitespace-pre-wrap text-sm flex-1 overflow-auto"
            >{project.description}</div>
          </div>

          {/* Bottom Section - 50% */}
          <div className="basis-4/7 flex flex-col">
            {/* ASSET/TERM/LENDING/APR Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-0 text-center border-t xl:border-l flex-1">
              <div className="bg-white border-r py-2 flex flex-col">
                <h3 className="text-sm text-gray-500 uppercase mb-1 border-dotted border-b pb-1">ASSET</h3>
                <p className="text-xl text-gray-800 mt-auto mb-auto">{asset?.assetType || "TukTuk"}</p>
              </div>
              <div className="bg-white xl:border-r py-2 flex flex-col">
                <h3 className="text-sm text-gray-500 uppercase mb-1 border-dotted border-b pb-1">TERM</h3>
                <p className="text-xl text-gray-800 mt-auto mb-auto">
                  {project.startDate && project.lendingPeriod
                    ? (() => {
                        const startDate = new Date(project.startDate);
                        const endDate = new Date(startDate);
                        endDate.setMonth(endDate.getMonth() + project.lendingPeriod);
                        
                        const formatDate = (date: Date) => 
                          `${date.getFullYear()}.${date.getMonth() + 1}`;
                        
                        return `${formatDate(startDate)} 〜 ${formatDate(endDate)}`;
                      })()
                    : 'N/A'}
                </p>
              </div>
              <div className="bg-white border-t xl:border-t-0 border-r py-2 flex flex-col">
                <h3 className="text-sm text-gray-500 uppercase mb-1 border-dotted border-b pb-1">LENDING</h3>
                <p className="text-xl text-gray-800 mt-auto mb-auto">
                  {(project.displayUnitPrice ?? project.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} {project.displayCurrency ?? project.lendingType}
                </p>
              </div>
              <div className="bg-white border-t xl:border-t-0 py-2 flex flex-col">
                <h3 className="text-sm text-gray-500 uppercase mb-1 border-dotted border-b pb-1">APR</h3>
                <p className="text-xl text-gray-800 mt-auto mb-auto">{project.apy}%</p>
              </div>
            </div>

            {/* Go to Project Page Button */}
            <div 
              className="border-t bg-[#325AB4] cursor-pointer py-8"
              onClick={handleGoToProjectPage}
            >
              <p className="text-2xl text-white font-medium uppercase">Go to Project Page</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectYourNFTSection;
