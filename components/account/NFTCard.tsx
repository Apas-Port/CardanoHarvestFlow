'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Project } from '@/lib/project';

// Mock function to get network image
const getNetworkImage = (network: string) => {
  const networkImages: { [key: string]: string } = {
    'Polygon': '/images/networks/polygon.png',
    'Ethereum': '/images/networks/ethereum.png',
    'Base': '/images/networks/base.png'
  };
  return networkImages[network] || '/images/networks/default.png';
};

interface NFTCardProps {
  project: Project;
  token: number;
}

const NFTCard: React.FC<NFTCardProps> = ({ project, token }) => {
  // Mock claimed amount
  const mockClaimedAmounts = [15.5, 23.8, 42.3, 8.9, 31.2];
  const claimedAmount = mockClaimedAmounts[token % mockClaimedAmounts.length];
  const displayCurrency = project.displayCurrency ?? project.lendingType;
  const displayUnitPrice = project.displayUnitPrice ?? project.unitPrice;

  // Format the claimed amount
  const formatClaimedAmount = () => {
    return claimedAmount.toFixed(2);
  };

  return (
    <Link href={`/en/proof/?projectId=${project.id}&tokenId=${token}`}>
      <div className="p-[13px] w-full flex flex-col gap-2 border border-slate-50 nft-card-bg rounded-[10px]">
        <div className="flex flex-col bg-no-repeat bg-cover rounded-lg effect-shine font-medium" style={{ backgroundImage: `url('/images/account/card-cover.jpg')`, aspectRatio: "2 / 3" }}>
          <div className="flex flex-col pt-[13.5%] px-[13.5%] text-[11.5px] leading-[1.4em] uppercase">
            <div className="flex items-end justify-between">
              <p>{project.title}</p>
              <p>#{token}</p>
            </div>
            <div className="flex items-end justify-between">
              <p>APR: {project.apy}%</p>
              <p>
                LENDING: {displayUnitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayCurrency}
              </p>
            </div>
            <div className="flex justify-between">
              <div className="flex">
                <Image
                  src={getNetworkImage(project.network)} alt={'coin'} height={18} width={18}
                />
                <p className="pl-1 leading-[2em] text-[9px]">{project.network}</p>
              </div>
              <p>
                Harvest: <span>{formatClaimedAmount()} {displayCurrency}</span>
              </p>
            </div>
            <div
              className="bg-no-repeat bg-center bg-cover w-full mt-[26%] opacity-80"
              style={{
                backgroundImage: `url(${project.previewImage})`,
                aspectRatio: "26 / 31",
              }}
            ></div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default NFTCard;
