import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import ConfettiModal from '@/components/modal/ConfettiModal';
import { Project, getProjectData } from '@/lib/project';
import { useTranslation } from '@/i18n/client';

interface TransactionSuccessfulModalProps {
  lng: string;
  isOpen: boolean;
  onClose: () => void;
  onGoToAccountPage: () => void;
  onJoinDiscord: () => void;
  projectId: string;
  transactionData?: {
    date: string;
    totalLent: string;
    tokenIds: bigint[];
  };
}

const TransactionSuccessfulModal: React.FC<TransactionSuccessfulModalProps> = ({ lng, isOpen, onClose, onGoToAccountPage, onJoinDiscord, projectId, transactionData }) => {
  const { t } = useTranslation(lng, 'common');
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (isOpen && projectId) {
        const projects = await getProjectData();
        const foundProject = projects.find(p => p.id === projectId);
        setProject(foundProject || null);
      } else {
        setProject(null); // Reset project when modal is closed
      }
    };

    fetchProject();
  }, [isOpen, projectId]);

  // Format totalLent to round up to 2 decimal places
  const formatTotalLent = (totalLent: string | undefined): string => {
    if (!totalLent) return '';
    
    // Extract numeric value from string like "4.9999999 ADA"
    const match = totalLent.match(/^([\d.]+)\s*(.*)$/);
    if (!match) return totalLent;
    
    const numericValue = parseFloat(match[1]);
    const unit = match[2] || 'ADA';
    
    // Round up to 2 decimal places
    const roundedValue = Math.ceil(numericValue * 100) / 100;
    
    // Format to 2 decimal places
    return `${roundedValue.toFixed(2)} ${unit}`;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ConfettiModal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center z-[99] p-4 md:p-0" onClick={onClose}>
        <div className="bg-white rounded-t-3xl rounded-b-none md:rounded-t-lg p-4 md:p-8 w-full max-w-[900px] max-h-[90vh] md:max-h-none flex flex-col md:flex-row overflow-y-auto md:overflow-hidden animate-modal-in" onClick={(e) => e.stopPropagation()}>
          {/* Left side */}
          <div className="flex flex-col items-center justify-center w-full md:w-1/2 pr-0 md:pr-4 mb-6 md:mb-0">
            <Image height={60} width={60} className="h-[60px] w-[60px] md:h-[72px] md:w-[72px]" src="/images/top/successful-icon.png" alt="icon" />
            <h2 className="text-xl md:text-2xl font-medium text-center mt-4 md:mt-4">
              {t('modals.transactionSuccess.title')}
              {transactionData?.tokenIds && transactionData.tokenIds.length > 1 && (
                <span className="block text-sm mt-2 text-green-600 font-normal">
                  Successfully minted {transactionData.tokenIds.length} NFTs!
                </span>
              )}
            </h2>
            <p className="text-gray-600 text-center mt-4 md:mt-4 text-sm md:text-base px-4 md:px-0">
              {t('modals.transactionSuccess.description')}
            </p>
            <p className="text-gray-600 text-center mt-4 md:mt-4 text-sm md:text-base px-4 md:px-0">
              {t('modals.transactionSuccess.description2')}
            </p>
            <button className={`
              text-center
              px-6 md:px-8 text-black font-medium text-base md:text-lg
              bg-gradient-to-b from-[#F9D78C] to-[#E7B45A]
              hover:opacity-80 transition-opacity duration-200
              mt-6 md:mt-6 w-full py-6 md:py-6 text-base md:text-lg font-medium`}
             onClick={onGoToAccountPage}>
              {t('modals.transactionSuccess.goToAccount')}
            </button>
            <button className="mt-4 md:mt-4 w-full border border-gray-300 text-gray-800 py-6 md:py-6 text-base md:text-lg font-medium hover:bg-gray-50 transition-colors duration-200" onClick={onJoinDiscord}>
              {t('modals.transactionSuccess.joinDiscord')}
            </button>
          </div>

          {/* Right side (NFT details) */}
          <div className="w-full md:w-1/2">
            {project && (
              <div className='bg-[#F5F5F5] rounded border-y border-x border-[#BFC9D490] p-2 md:p-3'>
                <div className='bg-gradient-to-b from-[#ECECEC] to-[#E4E4E4] h-90 rounded py-4 md:py-4 px-6 md:px-8'>
                  <Image width={280} height={300} src={project.previewImage} alt={project.title} className="rounded-lg mb-4 md:mb-4 w-full h-auto max-w-[280px] mx-auto" />
                </div>
                <div className="mt-4 md:mt-4 bg-white px-4 md:px-4">
                  <div className="flex justify-between border-b border-gray-200 py-3 md:py-2">
                    <span className="text-gray-600 text-sm md:text-base">NAME</span>
                    <span className="font-medium text-sm md:text-base">{project.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 py-3 md:py-2">
                    <span className="text-gray-600 text-sm md:text-base">DATE</span>
                    <span className="font-medium text-sm md:text-base">{transactionData?.date}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 py-3 md:py-2">
                    <span className="text-gray-600 text-sm md:text-base">TOTAL LENT</span>
                    <span className="font-medium text-sm md:text-base">{formatTotalLent(transactionData?.totalLent)}</span>
                  </div>
                  <div className="flex justify-between py-3 md:py-2">
                    <span className="text-gray-600 text-sm md:text-base">TOKEN ID</span>
                    <span className="font-medium text-sm md:text-base">{transactionData?.tokenIds?.map(id => id.toString()).join(', ')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ConfettiModal>
  );
};

export default TransactionSuccessfulModal;
