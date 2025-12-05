'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from 'next/image';
import { Project } from "@/lib/project";

// Mock function to get network image
const getNetworkImage = (network: string) => {
  const networkImages: { [key: string]: string } = {
    'Polygon': '/images/networks/polygon.png',
    'Ethereum': '/images/networks/ethereum.png',
    'Base': '/images/networks/base.png'
  };
  return networkImages[network] || '/images/networks/default.png';
};

interface PolygonNFTCardProps {
  project: Project;
  token: number;
}

interface NftMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export const PolygonNFTCard: React.FC<PolygonNFTCardProps> = ({ project, token }) => {
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mock harvested amount
  const mockHarvestedAmounts = [0, 12.3456, 45.6789, 8.9012, 23.4567];
  const harvestedAmount = mockHarvestedAmounts[token % mockHarvestedAmounts.length];
  const displayCurrency = project.displayCurrency ?? project.lendingType;
  const displayUnitPrice = project.displayUnitPrice ?? project.unitPrice;

  useEffect(() => {
    // Mock loading metadata
    const loadMetadata = async () => {
      try {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock metadata
        setMetadata({
          name: `${project.title} #${token}`,
          description: `NFT for ${project.title}`,
          image: project.previewImage || '/images/default-nft.jpg',
          attributes: [
            { trait_type: "Project", value: project.title },
            { trait_type: "Token ID", value: token },
            { trait_type: "Network", value: project.network },
            { trait_type: "APR", value: `${project.apy}%` }
          ]
        });
      } catch (error) {
        console.error('Failed to load metadata for token', token, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, [token, project]);

  if (isLoading) {
    return (
      <div className="p-[13px] w-full flex flex-col gap-2 border border-slate-50 nft-card-bg rounded-[10px] animate-pulse">
        <div className="bg-gray-200 rounded-lg" style={{ aspectRatio: "2 / 3" }} />
      </div>
    );
  }

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
                  src={getNetworkImage(project.network)} alt={'coin'} height={16} width={16}
                />
                <p className={`pl-1 leading-[2em] ${harvestedAmount > 100 ? 'text-[0.5rem]' : 'text-[9px]'}`}>{project.network}</p>
              </div>
              <p className={`${harvestedAmount > 100 && 'text-[0.5rem]'}`}>
                Harvest: <span>{harvestedAmount === 0 ? "0" : harvestedAmount.toFixed(4)} {project.lendingType}</span>
              </p>
            </div>
            <div
              className="bg-no-repeat bg-center bg-cover w-full mt-[26%] opacity-80"
              style={{
                backgroundImage: `url(${metadata?.image || project.previewImage})`,
                aspectRatio: "26 / 31",
              }}
            ></div>
          </div>
        </div>
      </div>
    </Link>
  );
};
