'use client'

import React, { useState, useEffect, useMemo } from "react";

import { SidebarNavigation } from "@/components/account/SidebarNavigation";
import UserHistorySection from "@/components/account/UserHistorySection";
import YourNFTSection from "@/components/account/YourNFTSection";
import AccountDashboardSection from "@/components/account/DashboardSection";
import DesktopVideoBackground from "@/components/common/DesktopVideoBackground";
import MobileVideoBackground from "@/components/common/MobileVideoBackground";
import CommonHeader from "@/components/common/CommonHeader";
import { Project, getProjectData } from "@/lib/project";
import { TokenEvent } from "@/lib/types";
import { appendDevQuery } from "@/lib/dev-mode";
import { useWallet } from '@meshsdk/react';
import { BrowserWallet } from '@meshsdk/core';

type WalletAsset = {
  unit: string;
  quantity: string;
  policyId?: string;
  assetName?: string;
  metadata?: Record<string, unknown>;
};

type ParsedCardanoNftMetadata = {
  name?: string;
  image?: string;
  description?: string;
  project?: string;
  projectId?: string;
  serialNumber?: string;
} & Record<string, unknown>;

interface ParsedCardanoNFT {
  unit: string;
  policyId: string;
  assetNameHex: string;
  assetName: string;
  quantity: string;
  metadata: ParsedCardanoNftMetadata;
  isProjectNFT: boolean;
  projectId?: string;
  tokenId?: string;
}

const HEX_PATTERN = /^[0-9a-fA-F]+$/;

const isHexString = (value: string) => HEX_PATTERN.test(value);

const decodeHexToUtf8 = (hex: string): string => {
  if (!hex || hex.length % 2 !== 0 || !isHexString(hex)) {
    return hex;
  }

  try {
    const pairs = hex.match(/.{1,2}/g);
    if (!pairs) {
      return hex;
    }

    const bytes = new Uint8Array(pairs.map((pair) => parseInt(pair, 16)));
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch {
    return hex;
  }
};

const stripCip68Label = (hex: string): string => {
  if (hex.length >= 8) {
    const labelHex = hex.slice(0, 8);
    const labelInt = Number.parseInt(labelHex, 16);
    // CIP-68 labels occupy a small integer namespace (e.g., 0x000de140 for 222)
    if (!Number.isNaN(labelInt) && labelInt <= 0x000f4240) {
      return hex.slice(8);
    }
  }
  return hex;
};

const decodeAssetName = (rawName: string): string => {
  const withoutLabel = stripCip68Label(rawName);
  const firstPass = decodeHexToUtf8(withoutLabel);
  if (firstPass !== rawName) {
    const secondPass = decodeHexToUtf8(firstPass);
    return secondPass;
  }
  return firstPass;
};

const coerceToString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  return undefined;
};

const extractSerialNumber = (name: string): string | undefined => {
  const trimmed = name.trim();
  const matchers = [
    /#(\d+)$/i,
    /\s+#(\d+)$/i,
    /\((\d+)\)$/,
  ];

  for (const matcher of matchers) {
    const result = trimmed.match(matcher);
    if (result?.[1]) {
      return result[1];
    }
  }

  const trailingDigits = trimmed.match(/(\d+)$/);
  return trailingDigits?.[1];
};

const buildNameCandidates = (raw?: string | null): Set<string> => {
  const candidates = new Set<string>();
  if (!raw) return candidates;

  const normalized = raw.trim().toLowerCase();
  if (!normalized) return candidates;

  candidates.add(normalized);

  const withoutSuffix = normalized.replace(/[\s_-]*(?:[#(].*|\d+\s*$)/, '').trim();
  if (withoutSuffix) {
    candidates.add(withoutSuffix);
  }

  const collapsedWhitespace = normalized.replace(/\s+/g, ' ');
  if (collapsedWhitespace) {
    candidates.add(collapsedWhitespace);
  }

  return candidates;
};

interface AccountProps {
  lng: string;
}

const Account: React.FC<AccountProps> = ({ lng }) => {
  // Cardano wallet connection
  const { connected: isConnected, wallet, name: walletName } = useWallet();
  const [address, setAddress] = useState<string>('');
  const [cardanoNFTs, setCardanoNFTs] = useState<ParsedCardanoNFT[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [browserWallet, setBrowserWallet] = useState<BrowserWallet | null>(null);
  
  const activeSection = "dashboard"; // Mock active section
  const scrollToSection = () => {}; // Mock scroll function
  
  // Mock refs
  const dashboardRef = React.useRef(null);
  const userHistoryRef = React.useRef(null);
  const proofOfSupportRef = React.useRef(null);
  
  // Mock token events - will be populated after projects load
  const [tokenEvents, setTokenEvents] = useState<TokenEvent[]>([]);
  
  // Dynamic hasToken map based on loaded projects
  const [hasToken, setHasToken] = useState<Map<string, number[]>>(new Map());
  
  const claimableAmounts = new Map([
    ["USDC", 150.5],
    ["USDT", 200.0],
    ["DAI", 100.75],
    ["pUSD", 50.25],
  ]);
  
  const totalHarvestedAmount = 500.75;
  
  const normalizedProjects = useMemo(() => {
    return projects.map((project) => {
      const policyIds = [
        project.policyId,
        ...(Array.isArray(project.legacyPolicyIds) ? project.legacyPolicyIds : []),
      ]
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map((id) => id.toLowerCase());

      const nameCandidates = new Set<string>();
      const pushName = (value?: string | null) => {
        buildNameCandidates(value).forEach((entry) => nameCandidates.add(entry));
      };

      pushName(project.collectionName);
      pushName(project.title);

      return {
        project,
        policyIds,
        idLower: project.id?.toLowerCase() ?? '',
        nameCandidates,
      };
    });
  }, [projects]);
  
  const { totalValue: totalEquityAmount, apr: aprAmount } = useMemo(() => {
    const summary = {
      totalValue: 0,
      weightedApr: 0,
    };

    const addContribution = (project: Project, units: number) => {
      const pricePerUnitRaw = project?.displayUnitPrice ?? project?.unitPrice;
      const pricePerUnit = Number(pricePerUnitRaw);
      if (!Number.isFinite(pricePerUnit)) {
        return;
      }

      const amount = units * pricePerUnit;
      if (amount <= 0) {
        return;
      }

      summary.totalValue += amount;

      const aprSourceRaw = typeof project.apy === 'number'
        ? project.apy
        : (typeof project.interestRate === 'number' ? project.interestRate : 0);
      const aprSource = Number(aprSourceRaw);

      if (Number.isFinite(aprSource)) {
        summary.weightedApr += amount * aprSource;
      }
    };

    // hasTokenはcardanoNFTsから生成されているため、cardanoNFTsのみから計算して重複を避ける
    const projectCardanoNFTs = cardanoNFTs.filter(
      (nft) => nft.isProjectNFT && nft.projectId,
    );

    projectCardanoNFTs.forEach((nft) => {
      const project = projects.find((p) => p.id === nft.projectId);
      if (project) {
        addContribution(project, 1);
      }
    });

    const legacyHarvestflowNFTs = cardanoNFTs.filter((nft) => {
      return (
        !nft.isProjectNFT &&
        typeof nft.metadata?.name === 'string' &&
        /^Harvestflow\s+#\d+$/i.test(nft.metadata.name)
      );
    });

    legacyHarvestflowNFTs.forEach((nft) => {
      const project = projects.find((p) => {
        if (p.policyId && p.policyId === nft.policyId) {
          return true;
        }
        if (Array.isArray(p.legacyPolicyIds)) {
          return p.legacyPolicyIds.includes(nft.policyId);
        }
        return false;
      });

      if (project) {
        addContribution(project, 1);
      }
    });

    const apr = summary.totalValue > 0
      ? summary.weightedApr / summary.totalValue
      : 0;

    return {
      totalValue: summary.totalValue,
      apr,
    };
  }, [projects, cardanoNFTs]);

  const totalLendingAmount = totalEquityAmount; // These are the same value
  const [isLoadingTokenEvents, setIsLoadingTokenEvents] = useState(false);
  
  const openHarvestModal = () => console.log("Opening harvest modal");

  // Mock checkbox states
  const isUsdcChecked = true;
  const isUsdtChecked = true;
  const isDaiChecked = false;
  const isPusdChecked = false;
  const setIsUsdcChecked = () => {};
  const setIsUsdtChecked = () => {};
  const setIsDaiChecked = () => {};
  const setIsPusdChecked = () => {};
  const totalClaimableAmount = 501.5;
  
  // Fetch projects data
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const projectsData = await getProjectData();
        setProjects(projectsData);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  // Fetch token events from database
  useEffect(() => {
    const fetchTokenEvents = async () => {
      if (!address || projects.length === 0) return;

      setIsLoadingTokenEvents(true);
      try {
        const response = await fetch(`/api/token-event?address=${address}`);
        if (response.ok) {
          const data = await response.json();
          
          // projects.jsonに存在するプロジェクトのみをフィルタリング
          const filteredEvents = data.events.filter((event: any) => {
            const project = projects.find(p => p.id === event.project_id);
            if (!project) {
              console.log(`Filtering out token event with project_id ${event.project_id} - not found in projects.json`);
            }
            return project !== undefined;
          });
          
          // Enrich token events with project data
          const enrichedEvents: TokenEvent[] = filteredEvents.map((event: any) => {
            const project = projects.find(p => p.id === event.project_id);
            return {
              ...event,
              project: project || null,
              payable: project?.lendingType || 'ADA',
              tx_hash: event.tx_hash || '' // Ensure tx_hash is included
            };
          });
          
          setTokenEvents(enrichedEvents);
          console.log('Fetched token events (filtered):', enrichedEvents);
        }
      } catch (error) {
        console.error('Error fetching token events:', error);
      } finally {
        setIsLoadingTokenEvents(false);
      }
    };

    fetchTokenEvents();
  }, [address, projects]);

  // Update hasToken when projects change and NFTs are loaded
  useEffect(() => {
    if (projects.length > 0 && cardanoNFTs.length > 0) {
      const newHasToken = new Map<string, number[]>();
      
      // isProjectNFT: trueのNFTのみを考慮（projects.jsonにマッチしたNFTのみ）
      cardanoNFTs.forEach((nft) => {
        if (nft.isProjectNFT && nft.projectId && nft.tokenId) {
          const project = projects.find((p) => p.id === nft.projectId);
          if (project) {
            const currentTokens = newHasToken.get(project.id) || [];
            const tokenNumber = Number.parseInt(nft.tokenId, 10);
            if (!Number.isNaN(tokenNumber)) {
              currentTokens.push(tokenNumber);
              newHasToken.set(project.id, currentTokens);
            }
          }
        }
      });
      
      setHasToken(newHasToken);
      console.log('Updated hasToken map:', Array.from(newHasToken.entries()));
    }
  }, [projects, cardanoNFTs]);

  // Get wallet address and create BrowserWallet instance
  useEffect(() => {
    const getWalletInfo = async () => {
      if (isConnected && walletName) {
        try {
          // Create a BrowserWallet instance
          const bw = await BrowserWallet.enable(walletName);
          setBrowserWallet(bw);
          
          // Get wallet address
          const addr = await bw.getChangeAddress();
          setAddress(addr);
          console.log('Wallet connected:', walletName, 'Address:', addr);
        } catch (error) {
          console.error('Error getting wallet info:', error);
          
          // Fallback to using the wallet from context
          if (wallet) {
            try {
              if (typeof wallet.getChangeAddress === 'function') {
                const addr = await wallet.getChangeAddress();
                setAddress(addr);
              } else if (typeof wallet.getUsedAddresses === 'function') {
                const addresses = await wallet.getUsedAddresses();
                if (addresses.length > 0) {
                  setAddress(addresses[0]);
                }
              }
            } catch (fallbackError) {
              console.error('Fallback error:', fallbackError);
            }
          }
        }
      }
    };

    getWalletInfo();
  }, [isConnected, wallet, walletName]);

  // Fetch NFTs from Cardano wallet
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!isConnected || !browserWallet) {
        return;
      }

      setIsLoadingNFTs(true);
      console.log('Starting to fetch NFTs from wallet...');
      console.log('BrowserWallet object:', browserWallet);
      console.log('Available projects for matching:', normalizedProjects.map(entry => ({
        projectId: entry.project.id,
        title: entry.project.title,
        policyIds: entry.policyIds
      })));

      try {
        const assets = (await browserWallet.getAssets()) as WalletAsset[];
        console.log('Raw assets from wallet:', assets);

        const nonAdaAssets = assets.filter((asset) => asset.unit !== 'lovelace');
        console.log('Filtered NFTs (non-ADA assets):', nonAdaAssets);

        const nftResults: (ParsedCardanoNFT | null)[] = await Promise.all(
          nonAdaAssets.map(async (asset): Promise<ParsedCardanoNFT | null> => {
            try {
              const unit = asset.unit;
              const quantity = asset.quantity ?? '1';

              if (!unit || unit.length <= 56) {
                throw new Error('Invalid asset unit encountered');
              }

              const policyIdRaw = (coerceToString(asset.policyId) ?? unit.slice(0, 56)).toLowerCase();
              const assetNameHex = unit.slice(56);
              const rawAssetName = coerceToString(asset.assetName) ?? assetNameHex;
              const decodedAssetName = decodeAssetName(rawAssetName);

              const onChainMetadata = (asset.metadata ?? {}) as Record<string, unknown>;
              const metadataSerial = coerceToString(onChainMetadata.serialNumber ?? onChainMetadata.tokenId);
              const metadataName = coerceToString(onChainMetadata.name);
              const metadataImage = coerceToString(onChainMetadata.image);
              const metadataDescription = coerceToString(onChainMetadata.description);

              // projects.jsonを正として、そこに定義されたプロジェクトのpolicyIdにマッチするNFTのみを処理
              const matchingEntry = normalizedProjects.find((entry) =>
                entry.policyIds.includes(policyIdRaw),
              );

              const matchingProject = matchingEntry?.project;

              if (!matchingProject) {
                // projects.jsonに存在しないプロジェクトのNFTはスキップ
                console.log(`Skipping NFT with policyId ${policyIdRaw} - not found in projects.json`);
                return null;
              }

              console.log(`Matched NFT with policyId ${policyIdRaw} to project ${matchingProject.id} (${matchingProject.title})`);

              const serialFromName = extractSerialNumber(decodedAssetName);
              const serialNumber = metadataSerial ?? serialFromName ?? undefined;
              const tokenId = serialNumber ?? undefined;
              const defaultImage = '/images/default-nft.png';

              let metadata: ParsedCardanoNftMetadata = {
                name: decodedAssetName || 'Cardano NFT',
                image: defaultImage,
                description: decodedAssetName ? `Cardano NFT: ${decodedAssetName}` : 'Cardano NFT',
              };

              const projectSerial = serialNumber ?? '0';
              const projectImage = metadataImage ?? matchingProject.previewImage ?? matchingProject.mainImage ?? defaultImage;
              const displayNameBase = matchingProject.collectionName ?? matchingProject.title;

              metadata = {
                ...metadata,
                name: metadataName ?? `${displayNameBase} #${projectSerial}`,
                image: projectImage,
                description:
                  metadataDescription ?? `Proof of Support NFT for ${matchingProject.title}`,
                project: matchingProject.title,
                projectId: matchingProject.id,
                serialNumber: projectSerial,
              };

              if (Array.isArray(onChainMetadata.attributes)) {
                metadata.attributes = onChainMetadata.attributes;
              }

              return {
                unit,
                policyId: policyIdRaw,
                assetNameHex,
                assetName: decodedAssetName,
                quantity,
                metadata,
                isProjectNFT: true,
                projectId: matchingProject.id,
                tokenId,
              } satisfies ParsedCardanoNFT;
            } catch (error) {
              console.error('Error processing NFT:', error);
              return null;
            }
          }),
        );

        const processedNFTs = nftResults.filter(
          (nft): nft is ParsedCardanoNFT => nft !== null,
        );

        const sortedNFTs = processedNFTs.sort((a, b) => {
          if (a.isProjectNFT && !b.isProjectNFT) return -1;
          if (!a.isProjectNFT && b.isProjectNFT) return 1;

          const aSerial = Number.parseInt(a.metadata?.serialNumber ?? a.tokenId ?? '0', 10);
          const bSerial = Number.parseInt(b.metadata?.serialNumber ?? b.tokenId ?? '0', 10);

          const safeASerial = Number.isNaN(aSerial) ? 0 : aSerial;
          const safeBSerial = Number.isNaN(bSerial) ? 0 : bSerial;

          return safeASerial - safeBSerial;
        });

        setCardanoNFTs(sortedNFTs);
        console.log('Fetched Cardano NFTs:', sortedNFTs);
        console.log('Number of NFTs found:', sortedNFTs.length);

        const tokenIdsByPolicy = new Map<string, number>();
        sortedNFTs.forEach((nft) => {
          if (nft.isProjectNFT && nft.policyId) {
            const serialValue = Number.parseInt(
              nft.metadata?.serialNumber ?? nft.tokenId ?? '0',
              10,
            );
            if (!Number.isNaN(serialValue)) {
              const existing = tokenIdsByPolicy.get(nft.policyId) ?? 0;
              tokenIdsByPolicy.set(nft.policyId, Math.max(existing, serialValue));
            }
          }
        });

        if (tokenIdsByPolicy.size > 0) {
          try {
            const knownNFTs = sortedNFTs
              .filter((nft) => nft.isProjectNFT && nft.policyId && nft.tokenId)
              .map((nft) => ({
                policyId: nft.policyId,
                tokenId: nft.tokenId,
                serialNumber: nft.metadata?.serialNumber ?? nft.tokenId,
              }));

            if (knownNFTs.length > 0) {
              await fetch(appendDevQuery('/api/cardano/init'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ knownNFTs }),
              });
              console.log('Initialized token IDs with', knownNFTs.length, 'NFTs');
            }
          } catch (error) {
            console.error('Failed to initialize token IDs:', error);
          }

          for (const [policyId, highestTokenId] of tokenIdsByPolicy.entries()) {
            try {
              await fetch(appendDevQuery('/api/cardano/update-token-id'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ policyId, highestTokenId }),
              });
              console.log('Updated highest token ID for policy:', policyId, highestTokenId);
            } catch (error) {
              console.error('Failed to update token ID:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching NFTs:', error);
      } finally {
        setIsLoadingNFTs(false);
      }
    };

    if (isConnected && browserWallet) {
      fetchNFTs();
    }
  }, [browserWallet, isConnected, normalizedProjects]);

  // Manual refresh function
  const refreshNFTs = async () => {
    if (browserWallet && walletName) {
      console.log('Manually refreshing NFTs...');
      setIsLoadingNFTs(true);
      
      try {
        // Re-enable wallet to get fresh data
        const newBrowserWallet = await BrowserWallet.enable(walletName);
        setBrowserWallet(newBrowserWallet);
        
        // Force immediate re-fetch
        setTimeout(async () => {
          try {
            const assets = await newBrowserWallet.getAssets();
            console.log('Fresh assets fetched:', assets.length);
          } catch (error) {
            console.error('Error fetching fresh assets:', error);
          }
        }, 100);
      } catch (error) {
        console.error('Error refreshing wallet connection:', error);
        setIsLoadingNFTs(false);
      }
    }
  };

  return (
    <>
      <CommonHeader lng={lng} />
      <div className="w-full max-w-[1320px] mx-auto relative">
        <div className="flex gap-32 pt-[200px] xl:pt-[250px] pb-[200px] xl:pb-[250px]">
          <div className="flex-1 shrink-0 relative hidden xl:block">
            <div className="sticky top-32">
              <SidebarNavigation 
                activeSection={activeSection}
                scrollToSection={scrollToSection}
              />
            </div>
          </div>

          {!isConnected && (
            <div className="w-full max-w-[926px] mx-auto *:flex *:flex-col *:gap-[100px] *:xl:gap-[85px] flex justify-center items-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Connect your wallet to view your NFTs</h2>
                <p className="text-gray-600 mb-6">Please connect your Cardano wallet using the button in the header</p>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="w-full max-w-[926px] *:flex *:flex-col *:gap-[100px] *:xl:gap-[85px]">
                <div className="gsap-section-trigger" id="dashboard" ref={dashboardRef}>
                  <AccountDashboardSection
                    lng={lng}
                    projects={projects ?? []}
                    address={address}
                    state={'ok'}
                    totalEquityAmount={totalEquityAmount}
                    aprAmount={aprAmount}
                    totalLendingAmount={totalLendingAmount}
                    totalHarvestedAmount={totalHarvestedAmount}
                    claimablePrincipleString={""}
                    totalClaimableAmount={totalClaimableAmount}
                                        claimableAmounts={claimableAmounts}
                    isUsdcChecked={isUsdcChecked}
                    isUsdtChecked={isUsdtChecked}
                    isDaiChecked={isDaiChecked}
                    isPusdChecked={isPusdChecked}
                    setIsUsdcChecked={setIsUsdcChecked}
                    setIsUsdtChecked={setIsUsdtChecked}
                    setIsDaiChecked={setIsDaiChecked}
                    setIsPusdChecked={setIsPusdChecked}
                    handleHarvest={openHarvestModal} />
                </div>
                <div className="gsap-section-trigger" id="user-history" ref={userHistoryRef}>
                  <UserHistorySection address={address} lng={lng} tokenEvents={tokenEvents} isLoadingTokenEvents={isLoadingTokenEvents} />
                </div>
                {/* 
                <div className="gsap-section-trigger" id="repayment-history" ref={repaymentHistoryRef}>
                  <RepaymentHistorySection lng={lng} repaymentHistories={repaymentHistories} />
                </div>
                */}
                {isConnected && (
                  <div className="gsap-section-trigger" id="proof-of-support" ref={proofOfSupportRef}>
                    <YourNFTSection 
                      projects={projects} 
                      hasToken={hasToken} 
                      isLoadingHasToken={isLoadingProjects || isLoadingNFTs}
                      cardanoNFTs={cardanoNFTs}
                      onRefreshNFTs={refreshNFTs}
                    />
                  </div>
                )}
                {/* <div className="gsap-section-trigger hidden" id="upcoming-projects">
                  
                <AccountUpcomingProjectsSection />
               
                </div> */}
            </div>
          )}
        </div>
      </div>
      {/* Modals are removed as they depend on wagmi/ethereum */}
      <DesktopVideoBackground />
      <MobileVideoBackground />
    </>
  );
};

export default Account;
