import React from 'react';
import { Project } from '@/lib/project';
import Image from 'next/image';
import { useTranslation } from '@/i18n/client';
import { getNetworkImage } from '@/lib/network';

interface ProjectWaitingListModalProps {
  project: Project;
  lng: string;
  onClose: () => void;
  onJoinMailingList: () => void;
}

const ProjectWaitingListModal: React.FC<ProjectWaitingListModalProps> = ({ project, lng, onClose, onJoinMailingList }) => {
  const { t } = useTranslation(lng, 'common');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade" onClick={onClose}>
      <div className="bg-white p-2 max-w-4xl w-full flex animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="w-1/2 pr-4">
          <Image width={422} height={500} src={project.previewImage} alt={project.title} className="rounded-3xl" />
        </div>
        <div className="w-1/2 pl-1 pr-1">
          <h2 className="text-base mt-2">No.{String(project.num).padStart(3, '0')}</h2>
          <h2 className="text-3xl font-medium">{project.title}</h2>

          <div className="flex items-center mb-4">
            <span className="text-gray-700 mr-4 mt-1">
              <Image
                src={getNetworkImage(project.network)}
                alt={project.lendingType} width={20} height={20} className="inline mr-1 mb-1" />
              {project.lendingType} Lending
            </span>
            <span className="text-gray-700 mr-4 mt-1">
              <Image
                src={getNetworkImage(project.network)}
                alt={project.network} width={20} height={20} className="inline mr-1 mb-1" />
              {project.network} Network
            </span>
          </div>

          <div className="p-4 mb-4 bg-[#F5F5F5] text-center">
            <p className="text-sm text-[#1D1E1F80] whitespace-pre-line">
              {t('modals.projectWaitingList.description')}
              <br />
              {t('modals.projectWaitingList.description2')}
            </p>
            <div className="flex justify-center my-4">
              <div className={`
                flex
                px-8 py-2 rounded-full text-black font-normal text-lg
                bg-gradient-to-b from-[#F9D78C] to-[#E7B45A]
                hover:opacity-80 transition-opacity duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              `}  
                onClick={onJoinMailingList}>
                {t('modals.projectWaitingList.joinButton')}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectWaitingListModal;
