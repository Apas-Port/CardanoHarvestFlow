"use client";

import React, { useEffect, useMemo, useState } from "react";

import ProjectYourNFTSection from "@/components/proof/ProjectYourNFTSection";
import ProjectRWASection from "@/components/proof/ProjectRWASection";
import ProjectNavigation, { ProjectNavigationLink } from "@/components/proof/ProjectNavigation";
import DesktopVideoBackground from "@/components/common/DesktopVideoBackground";
import MobileVideoBackground from "@/components/common/MobileVideoBackground";
import CommonHeader from "@/components/common/CommonHeader";
import { useRouter, useSearchParams } from "next/navigation";
import { RwaAsset } from "@/lib/types";
import { Project, getProjectData } from "@/lib/project";
import AssetOverviewSection from "@/components/proof/AssetOverviewSection";
import { useRWADetail } from "@/hooks/useRWADetail";

interface ProofPageProps {
  lng: string;
}

const ProofPage: React.FC<ProofPageProps> = ({ lng }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('projectId') || null;
  const tokenId = searchParams?.get('tokenId') || searchParams?.get('assetId') || null; // Support both tokenId and assetId params
  const accessToken = searchParams?.get('access_token') || null;

  // State data
  const [selectedAsset, setSelectedAsset] = useState<RwaAsset | undefined>(undefined);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const [notRwaFounded, setNotRwaFounded] = useState(false);
  // Redirect if no parameters provided
  useEffect(() => {
    if (!accessToken && (!projectId || !tokenId)) {
      router.push(`/en`);
    }
  }, [accessToken, projectId, tokenId, router]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Load projects data
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectsData = await getProjectData();
        console.log('Loaded projects:', projectsData);
        setProjects(projectsData);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  const selectedAssetId = useMemo(() => {
    if (!selectedProject || !selectedProject.assetId) return undefined;

    const rawAssetIds = Array.isArray(selectedProject.assetId)
      ? selectedProject.assetId
      : [selectedProject.assetId];

    const cleanedIds = rawAssetIds
      .map((value) => {
        if (value === null || value === undefined) return undefined;
        const trimmed = String(value).trim();
        if (trimmed.length === 0) return undefined;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : undefined;
      })
      .filter((value): value is number => value !== undefined);

    if (cleanedIds.length === 0) return undefined;

    if (tokenId) {
      const tokenNumeric = Number(tokenId);
      if (Number.isFinite(tokenNumeric) && tokenNumeric >= 0) {
        const index = tokenNumeric % cleanedIds.length;
        return cleanedIds[index];
      }
    }

    return cleanedIds[0];
  }, [selectedProject, tokenId]);

  // Fetch RWA asset from spreadsheet using API
  const { data: rwaAssets, isLoading: loadingAsset } = useRWADetail(selectedAssetId);

  // Set mock project
  useEffect(() => {
    console.log('Looking for project:', projectId, 'in projects:', projects);
    if(projects && projects.length > 0 && projectId){
      const foundProject = projects.find((p) => p.id === projectId);
      console.log('Found project:', foundProject);
      setSelectedProject(foundProject);
    }
  }, [projects, projectId]);

  // Set asset from API response
  useEffect(() => {
    if (rwaAssets && rwaAssets.length > 0) {
      const asset = rwaAssets[0];
      // Enhance asset with project data if available
      if (selectedProject) {
        if (selectedAssetId !== undefined) {
          asset.assetId = selectedAssetId;
        }
        asset.name = asset.name || `${selectedProject.title} Unit #${asset.assetId ?? ''}`.trim();
        asset.description = asset.description || selectedProject.description;
        asset.image = asset.image || selectedProject.previewImage;
        asset.assetImage = asset.assetImage || selectedProject.tuktukImage;
        asset.apr = asset.apr || `${selectedProject.apy}%`;
      }
      setSelectedAsset(asset);
      setNotRwaFounded(false);
    } else if (!loadingAsset && tokenId) {
      setNotRwaFounded(true);
    } else if (accessToken) {
      // For access token, fetch asset by token
      fetch(`/api/fetch-rwa?resource=assetByToken&accessToken=${accessToken}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setSelectedAsset(data);
            setNotRwaFounded(false);
          } else {
            setNotRwaFounded(true);
          }
        })
        .catch(() => setNotRwaFounded(true));
    }
  }, [rwaAssets, loadingAsset, selectedProject, selectedAssetId, tokenId, accessToken]);

  const handleGoToProjectPage = () => {
    router.push(`/en/?projectId=${selectedProject?.id}`);
  };

  // Don't show anything if no parameters provided
  if (!accessToken && (!projectId || !tokenId)) {
    return null;
  }

  return (
    <>
      <CommonHeader lng={lng} />
      <div className="w-full max-w-[1320px] mx-auto relative z-10 px-4 xl:px-0">
        <div className="flex gap-32 pt-[110px] xl:pt-[216px] pb-[150px] xl:pb-[250px]">
          <div className="flex-1 shrink-0 relative hidden xl:block">
            <div className="sticky top-32">
              <ProjectNavigation isAccessToken={accessToken !== null}/>
            </div>
          </div>
          <div className="w-full max-w-[926px] *:flex *:flex-col *:gap-24">
            <div>
              {accessToken === null && (
                <>
                  <div className="gsap-section-trigger" id={ProjectNavigationLink.YourNFT}>
                    <ProjectYourNFTSection
                      isAccessToken={accessToken !== null}
                      asset={selectedAsset}
                      project={selectedProject} />
                  </div>
                </>
              )}
              {(loadingProjects || (selectedProject == null && selectedAsset == null)) ? (
                <p>Loading...</p>
              ) : (<>
                <div className="gsap-section-trigger" id={ProjectNavigationLink.AssetOverview}>
                  <AssetOverviewSection notRwaFounded={notRwaFounded} project={selectedProject} asset={selectedAsset} />
                </div>
                <div className="gsap-section-trigger" id={ProjectNavigationLink.RWA}>
                  <ProjectRWASection notRwaFounded={notRwaFounded} asset={selectedAsset} />
                </div>
              </>)}
              <div className="px-4 xl:px-0">
                <button
                  className="bg-secondary text-white flex items-center justify-center border border-black w-full text-bodyLarge xl:text-heading4_28_44 font-medium uppercase tracking-widest p-8 xl:p-10"
                  onClick={handleGoToProjectPage}
                >
                  GO TO PROJECT PAGE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Modals are removed as they depend on wagmi/ethereum */}
      <DesktopVideoBackground />
      <MobileVideoBackground />
    </>
  );
};

export default ProofPage;
