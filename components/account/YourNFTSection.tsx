'use client';

import React, { useState, useEffect } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { Project, matchNFTPolicyIdWithProjects } from "@/lib/project";
import Link from "next/link";
import CardanoNFTCard from "./CardanoNFTCard" 

type CardanoNft = React.ComponentProps<typeof CardanoNFTCard>["nft"]

interface YourNFTSectionProps {
  projects?: Project[];
  hasToken: Map<string,number[]>;
  isLoadingHasToken?: boolean;
  cardanoNFTs?: CardanoNft[];
  onRefreshNFTs?: () => void;
}

// スケルトンローダーコンポーネント
const NFTCardSkeleton: React.FC = () => (
  <div className="p-[13px] w-full flex flex-col gap-2 border border-slate-50 nft-card-bg rounded-[10px] animate-pulse relative">
    <div className="bg-gray-200 rounded-lg relative overflow-hidden" style={{ aspectRatio: "2 / 3" }}>
      {/* ローディングスピナーオーバーレイ */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-200/80 backdrop-blur-sm">
      </div>
      
      {/* 背景のスケルトン要素 */}
      <div className="flex flex-col pt-[13.5%] px-[13.5%] space-y-2 opacity-50">
        <div className="flex items-end justify-between">
          <div className="h-3 bg-gray-300 rounded w-20"></div>
          <div className="h-3 bg-gray-300 rounded w-8"></div>
        </div>
        <div className="flex items-end justify-between">
          <div className="h-3 bg-gray-300 rounded w-16"></div>
          <div className="h-3 bg-gray-300 rounded w-24"></div>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
            <div className="h-2 bg-gray-300 rounded w-12"></div>
          </div>
          <div className="h-3 bg-gray-300 rounded w-16"></div>
        </div>
        <div className="w-full mt-[26%] bg-gray-300 rounded" style={{ aspectRatio: "26 / 31" }}></div>
      </div>
    </div>
  </div>
);

// エンプティステートコンポーネント
const EmptyState: React.FC = () => (
  <div className="text-center py-20 px-6 rounded-lg bg-white/60 backdrop-blur-md">
    <div className="mb-6">
      <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No NFTs Found</h3>
    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
      Join projects to acquire POS NFTs, earn steady returns, and create real social impact.
    </p>
    <Link 
      href="/" 
      className="inline-flex items-center justify-center px-6 py-2 min-h-10 min-w-fit rounded-full text-sm text-black font-light bg-gradient-to-b from-[#F9D78C] to-[#E7B45A] hover:from-yellow-500 hover:to-yellow-600 whitespace-nowrap transition-colors"
    >
      View Projects
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 ml-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M14 5l7 7m0 0l-7 7m7-7H3"
        />
      </svg>
    </Link>
  </div>
);

const YourNFTSection: React.FC<YourNFTSectionProps> = ({ projects, hasToken, isLoadingHasToken = false, cardanoNFTs = [], onRefreshNFTs }) => {
  const [collapsedState, setCollapsedState] = useState<{
    [key: string]: boolean;
  }>({});
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [nftProjectMap, setNftProjectMap] = useState<Map<string, Project>>(new Map());
  
  // Debug logging
  console.log('YourNFTSection props:', {
    projects: projects?.length || 0,
    hasToken: Array.from(hasToken.entries()),
    isLoadingHasToken,
    cardanoNFTs: cardanoNFTs.length,
    cardanoNFTsDetails: cardanoNFTs,
    nftProjectMap: Array.from(nftProjectMap.entries())
  });

  const toggleCollapse = (contractId: string) => {
    setCollapsedState((prev) => ({
      ...prev,
      [contractId]: !prev[contractId],
    }));
  };

  // 10秒でタイムアウトする処理
  useEffect(() => {
    if (isLoadingHasToken) {
      setHasTimedOut(false);
      const timeoutId = setTimeout(() => {
        setHasTimedOut(true);
      }, 10000); // 10秒

      return () => clearTimeout(timeoutId);
    } else {
      setHasTimedOut(false);
    }
  }, [isLoadingHasToken]);

  // Fetch project data for each NFT based on policy ID
  useEffect(() => {
    const fetchProjectsForNFTs = async () => {
      const projectMap = new Map<string, Project>();
      
      for (const nft of cardanoNFTs) {
        if (nft.policyId && !projectMap.has(nft.unit)) {
          const project = await matchNFTPolicyIdWithProjects(nft.policyId);
          if (project) {
            projectMap.set(nft.unit, project);
          }
        }
      }
      
      setNftProjectMap(projectMap);
    };

    if (cardanoNFTs.length > 0) {
      fetchProjectsForNFTs();
    }
  }, [cardanoNFTs]);

  // ローディング状態：プロジェクトデータがない場合、またはhasTokenがロード中でタイムアウトしていない場合
  if (!projects || (isLoadingHasToken && !hasTimedOut)) {
    return (
      <div className="flex flex-col gap-[30px]">
        <h2 className="text-heading5Larger xl:text-heading3_30_30 text-center uppercase font-medium tracking-[0.35rem] mt-12">Proof of support</h2>
        
        {/* ローディング状態メッセージ */}
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-gray-600 font-medium">Loading your Proof of Support NFTs...</span>
        </div>
        
        <div className="w-full max-w-[90%] xl:max-w-[100%] xl:pl-0 mx-auto xl:mx-0">
          <div className="flex flex-col gap-14 xl:gap-[60px]">
            <div className="flex flex-col gap-10">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {[...Array(3)].map((_, index) => (
                  <NFTCardSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasTimedOut) {
    return (
    <div className="flex flex-col gap-[30px]">
      <h2 className="text-heading5Larger xl:text-heading3_30_30 text-center uppercase font-medium tracking-[0.35rem] mt-12">Proof of support</h2>
      <div className="w-full max-w-[90%] xl:max-w-[100%] xl:pl-0 mx-auto xl:mx-0">
        <div className="flex flex-col gap-14 xl:gap-[60px]">
          <div className="flex flex-col gap-10">
            <EmptyState />
          </div>
        </div>
      </div>
    </div>
    );
  } 

  // フィルタリング後のプロジェクトリストを取得
  const ownedProjects = projects.filter((project: Project) => hasToken.get(project.id) && (hasToken.get(project.id)?.length ?? 0) > 0);


  // Polygon の場合, 持っている TokenId  +https://gateway.irys.xyz/TfPczcpKc70n9fBzOIn8zEYxBG_ucquYhjN2UpW91uo
  return (
    <div className="flex flex-col gap-[30px]">
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-heading5Larger xl:text-heading3_30_30 text-center uppercase font-medium tracking-[0.35rem] mt-12">Proof of support</h2>
        {!isLoadingHasToken && (cardanoNFTs.length > 0 || onRefreshNFTs) && (
          <button 
            onClick={() => onRefreshNFTs ? onRefreshNFTs() : window.location.reload()} 
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Refresh NFTs
          </button>
        )}
      </div>
      <div className="w-full max-w-[90%] xl:max-w-[100%] xl:pl-0 mx-auto xl:mx-0">
        <div className="flex flex-col gap-14 xl:gap-[60px]">
          <div className="flex flex-col gap-10">
            {(() => {
              // Count Harvestflow format NFTs
              const harvestflowCount = cardanoNFTs.filter(nft => {
                if (nft.metadata?.name) {
                  const nameMatch = nft.metadata.name.match(/^Harvestflow\s+#\d+$/i);
                  if (nameMatch) return true;
                }
                
                if (nft.assetName) {
                  let decodedName = nft.assetName;
                  try {
                    if (/^[0-9a-fA-F]+$/.test(nft.assetName)) {
                      decodedName = Buffer.from(nft.assetName, 'hex').toString('utf8');
                    }
                  } catch {}
                  
                  const assetMatch = decodedName.match(/^Harvestflow\s+#\d+$/i);
                  if (assetMatch) return true;
                }
                
                return false;
              }).length;
              
              return ownedProjects.length === 0 && harvestflowCount === 0;
            })() ? (
              <EmptyState />
            ) : (
              <>

              {/* Cardano NFTs Section */}
              {(() => {
                // Filter NFTs to only show "Harvestflow #<number>" format
                const harvestflowNFTs = cardanoNFTs.filter(nft => {
                  // Check metadata name
                  if (nft.metadata?.name) {
                    const nameMatch = nft.metadata.name.match(/^Harvestflow\s+#\d+$/i);
                    if (nameMatch) return true;
                  }
                  
                  // Check asset name (might be hex encoded)
                  if (nft.assetName) {
                    // Try to decode hex if needed
                    let decodedName = nft.assetName;
                    try {
                      // If assetName looks like hex (all hex characters), try to decode
                      if (/^[0-9a-fA-F]+$/.test(nft.assetName)) {
                        decodedName = Buffer.from(nft.assetName, 'hex').toString('utf8');
                      }
                    } catch {
                      // If decode fails, use original
                    }
                    
                    const assetMatch = decodedName.match(/^Harvestflow\s+#\d+$/i);
                    if (assetMatch) return true;
                  }
                  
                  return false;
                });
                
                console.log("harvestflowNFTs", harvestflowNFTs)
                if (harvestflowNFTs.length === 0) return null;
                
                return (
                  <div className="flex flex-col gap-10">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleCollapse('cardano-nfts')}>
                      <h3 className="text-bodyLarge24 xl:text-heading5Larger24_30 uppercase font-medium">
                        Harvestflow ({harvestflowNFTs.length})
                      </h3>
                      {collapsedState['cardano-nfts'] ? <IoIosArrowDown /> : <IoIosArrowUp />}
                    </div>
                    {!collapsedState['cardano-nfts'] && (
                      <div className="overflow-x-auto">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                          {harvestflowNFTs
                            .sort((a, b) => {
                              // Extract number from "Harvestflow #X" format
                              const getNumber = (nft: CardanoNft) => {
                                const name = nft.metadata?.name || '';
                                const match = name.match(/Harvestflow\s+#(\d+)/i);
                                return match ? parseInt(match[1], 10) : 0;
                              };
                              
                              return getNumber(a) - getNumber(b);
                            })
                            .map((nft, index) => (
                              <CardanoNFTCard 
                                key={`cardano-${nft.unit || index}`}
                                nft={nft}
                                project={nftProjectMap.get(nft.unit) || null}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default YourNFTSection;
