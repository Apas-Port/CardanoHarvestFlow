'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getNetworkImage } from '@/lib/network';
import { Project } from '@/lib/project';

interface CardanoNFTCardProps {
  nft: {
    unit: string;
    policyId: string;
    assetName: string;
    quantity: string;
    metadata?: {
      name?: string;
      image?: string;
      description?: string;
      project?: string;
      projectId?: string;
      serialNumber?: string | number;
      attributes?: Array<{ trait_type: string; value: string | number | boolean }>;
      [key: string]: unknown;
    };
    isProjectNFT?: boolean;
    projectId?: string;
    tokenId?: string;
  };
  project?: Project | null; // Project data from policy ID
}

const CardanoNFTCard: React.FC<CardanoNFTCardProps> = ({ nft, project }) => {
  // Extract serial number from various sources
  let serialNumber = nft.metadata?.serialNumber || nft.metadata?.name?.split("#")[1] || '9';
  
  console.log("CardanoNFTCard", project)

  // If serialNumber is empty string, try to extract from name
  if (serialNumber === '' || !serialNumber) {
    if (nft.metadata?.name) {
      const nameMatch = nft.metadata.name.match(/Harvestflow\s+#(\d+)/i);
      if (nameMatch) {
        serialNumber = nameMatch[1];
      }
    }
  }
  
  // Ensure serialNumber is a string
  serialNumber = serialNumber.toString() || '1';
  
  const projectName = project?.title || nft.metadata?.project || 'Harvestflow';
  const imageUrl = "/images/project/1/preview.jpg"; // project?.previewImage || nft.metadata?.image || nft.metadata?.files?.[0]?.src || null;
  
  // Use project data if available, otherwise use defaults
  const apr = project?.apy;
  const lendingAmount = project?.unitPrice;
  const lendingType = 'ADA';
  
  // Create proof link with projectId and tokenId
  const proofLink = project?.id
    ? `/en/proof/?projectId=${project.id}&tokenId=${serialNumber}`
    : nft.metadata?.projectId 
    ? `/en/proof/?projectId=${nft.metadata.projectId}&tokenId=${serialNumber}`
    : '#';
  
  return (
    <Link href={proofLink}>
      <div className="p-[13px] w-full flex flex-col gap-2 border border-slate-50 nft-card-bg rounded-[10px] hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex flex-col bg-no-repeat bg-cover rounded-lg effect-shine font-medium" style={{ backgroundImage: `url('/images/account/card-cover.jpg')`, aspectRatio: "2 / 3" }}>
          <div className="flex flex-col pt-[13.5%] px-[13.5%] text-[11.5px] leading-[1.4em] uppercase">
            <div className="flex items-end justify-between">
              <p className="truncate max-w-[150px]">{projectName}</p>
              <p>#{serialNumber}</p>
            </div>
            <div className="flex items-end justify-between">
              <p>APR: {apr}%</p>
              <p>
                LENDING: {lendingAmount} {lendingType}
              </p>
            </div>
            <div className="flex justify-between">
              <div className="flex items-center">
                <Image
                  src={getNetworkImage('Cardano')} alt={'coin'} height={18} width={18}
                />
                <p className="pl-2 leading-[2em] text-[9px]">Cardano</p>
              </div>
            </div>
            <div
              className="bg-no-repeat bg-center bg-cover w-full mt-[26%] opacity-80 relative overflow-hidden"
              style={{
                backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                backgroundColor: !imageUrl ? '#f3f4f6' : 'transparent',
                aspectRatio: "26 / 31",
              }}
            >
              {!imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl mb-2 opacity-50">🌾</div>
                    <div className="text-xs font-medium text-gray-500">{projectName}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CardanoNFTCard;
