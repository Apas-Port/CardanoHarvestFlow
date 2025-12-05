'use client';

import { useState, useEffect, useRef, RefObject } from 'react';
// Removed wagmi imports - will use Cardano wallet connection
import CommonHeader from '@/components/common/CommonHeader';
import MailingListModal from '@/components/modal/MailingListModal';
import MailingListSuccessfulModal from '@/components/modal/MailingListSuccessfulModal'; // Import the new modal
import { Top } from './top';
import { FaQ } from './faq';
import CommonFooter from '@/components/common/CommonFooter';
import Contact from "./contact";
import Projects from './Projects';
import About from './About';
import Video from './Video';
import Ecosystem from './Ecosystem';
import PurchaseModal from '@/components/modal/PurchaseModal';
import ProjectWaitingListModal from '@/components/modal/ProjectWaitingListModal'; // Import ProjectWaitingListModal
import { getProjectData, Project } from '@/lib/project';
import { motion } from "motion/react"

import TransactionSuccessfulModal from '@/components/modal/TransactionSuccessfulModal';
import WaitingTransactionModal from '@/components/modal/WaitingTransactionModal';
import ErrorModal from '@/components/modal/ErrorModal';
// Removed EVM hooks
// import { useLendSupport } from '@/hooks/use-lend';
// import { useMailingList } from '@/hooks/use-mailing-list';
import ProofOfSupportArtists from './ProofOfSupportArtists';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/i18n/client';
import { useCardanoAPIMint } from '@/hooks/useCardanoAPIMint';

export const TopPage = ({ lng, onLoaded }: { lng: string; onLoaded?: () => void }) => {
  const router = useRouter();
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isProjectWaitingListModalOpen, setIsProjectWaitingListModalOpen] = useState(false);
  const [isTransactionSuccessModalOpen, setIsTransactionSuccessModalOpen] = useState(false);
  const [isMailingListSuccessModalOpen, setIsMailingListSuccessModalOpen] = useState(false);
  const [isWaitingTransactionModalOpen, setIsWaitingTransactionModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState({ title: '', message: '' });

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isMailingListModalOpen, setIsMailingListModalOpen] = useState(false);
  const [isLendingProgress, setIsLendingProgress] = useState(false);
  const [modalInitialEmail, setModalInitialEmail] = useState('');
  const [pendingLendSupport, setPendingLendSupport] = useState<{ project: Project | null; quantity: number }>({ project: null, quantity: 0 });
  const [mintedTokenIds, setMintedTokenIds] = useState<bigint[]>([]);

  // Use Cardano API minting hook (user wallet only)
  const { mintProjectNFT: apiMint, mintProjectNFTBulk: apiMintBulk } = useCardanoAPIMint();
  
  // TODO: Replace with Cardano wallet connection
  const initialWalletAddress: string | undefined = undefined;
  const isConnected = true; // Temporarily set to true for testing
  
  // TODO: Replace with Cardano implementations
  const register = async (email: string, name: string, language: string, walletAddress: string, projectId: string) => { 
    console.log('Register - to be implemented', { email, name, language, walletAddress, projectId }); 
  };
  const registerStatus = null;
  const registerError = null;

  const execLendSupport = async (params: { project: Project; quantity: number }) => { 
    console.log('execLendSupport called', params);
    
    try {
      // IMPORTANT: Bulk minting in single tx not supported due to oracle validator limitation
      // Always use sequential minting
      console.log(`Minting ${params.quantity} NFT(s) sequentially...`);
      
      let result;
      if (params.quantity > 1) {
        // Sequential minting for multiple NFTs
        const allTokenIds: number[] = [];
        let lastTxHash = '';
        let totalLovelace = 0;
        
        for (let i = 0; i < params.quantity; i++) {
          console.log(`Minting NFT ${i + 1} of ${params.quantity}...`);
          const singleResult = await apiMint(params.project, 1);
          
          if (singleResult && singleResult.txHash) {
            lastTxHash = singleResult.txHash;
            allTokenIds.push(...(singleResult.tokenIds || []));
            totalLovelace += singleResult.mintLovelace || 0;
            
            // Wait 3 seconds between mints to ensure oracle is updated
            if (i < params.quantity - 1) {
              console.log('Waiting 3 seconds before next mint...');
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          }
        }
        
        result = {
          txHash: lastTxHash,
          tokenIds: allTokenIds,
          policyId: '',
          mintLovelace: totalLovelace,
        };
      } else {
        // Single mint
        result = await apiMint(params.project, 1);
      }
        
      console.log('Minting result:', result);
      
      if (result && result.txHash) {
        console.log('Transaction successful! Hash:', result.txHash);
        console.log('NFTs minted with token IDs:', result.tokenIds);

        // Store minted token IDs (convert number[] to bigint[])
        const tokenIdsBigInt = (result.tokenIds || []).map(id => BigInt(id));
        setMintedTokenIds(tokenIdsBigInt);

        // Close waiting modal and show success modal
        setIsWaitingTransactionModalOpen(false);
        setIsLendingProgress(false);

        // Set up success data for TransactionSuccessfulModal
        // Show success modal
        setIsTransactionSuccessModalOpen(true);
      } else {
        console.error('Minting failed - no result');
        throw new Error('Minting failed');
      }
    } catch (error) {
      console.error('execLendSupport error:', error);
      throw error;
    }
  };

  const execStatus = null;

  const handleOpenMailingListModal = (email: string) => {
    setModalInitialEmail(email);
    setIsMailingListModalOpen(true);
  };

  const handleCloseMailingListModal = () => {
    setIsMailingListModalOpen(false);
    setModalInitialEmail('');
  };

  const handleCloseMailingListSuccessModal = () => {
    setIsMailingListSuccessModalOpen(false);
  };

  const handleMailingListSubscribe = async (data: { email: string; name: string; walletAddress: string, projectId: string }) => {
    console.log('Mailing List Subscription Data:', data);
    await register(data.email, data.name, 'en', data.walletAddress, data.projectId);
  };

  // Effect to handle mailing list registration status
  useEffect(() => {
    if (registerStatus === 'registered') {
      setIsMailingListSuccessModalOpen(true);
      setIsMailingListModalOpen(false);
    }
    if (registerStatus === 'error') {
      console.error('Mailing List Subscription Error:', registerError);
      // Optionally handle error display here
    }
  }, [registerStatus, registerError]);

    // Effect to handle mailing list registration status
  useEffect(() => {
    if (execStatus === 'minted') {
      setIsLendingProgress(false);
      setIsTransactionSuccessModalOpen(true);
    }
    console.log("execStatus", execStatus)
  }, [execStatus]);


  // Get search params for projectId
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  useEffect(() => {
    const fetchData = async () => {
      const projects = await getProjectData()
      setProjects(projects);
      
      // Check if there's a projectId in the URL and open the corresponding modal
      if (projectIdParam && projects.length > 0) {
        const project = projects.find(p => p.id === projectIdParam);
        if (project) {
          openPurchaseModal(project);
        }
      }
    };
    fetchData();
  }, [projectIdParam]);

  const openPurchaseModal = (project: Project) => {
    setSelectedProject(project);
    setQuantity(1); // プロジェクトが変わった時に数量を1にリセット
    if (project.status === 'coming_soon') {
      setIsProjectWaitingListModalOpen(true);
    } else {
      setIsPurchaseModalOpen(true);
    }
  };

  const closePurchaseModal = () => {
    setIsPurchaseModalOpen(false);
    setSelectedProject(null);
  };

  const closeProjectWaitingListModal = () => { // Add function to close waiting list modal
    setIsProjectWaitingListModalOpen(false);
    setSelectedProject(null);
  };

  const handleJoinMailingList = () => {
    setIsMailingListModalOpen(true);
    closeProjectWaitingListModal();
  };

  const closeTransactionSuccessModal = () => {
    setIsTransactionSuccessModalOpen(false);
  };

  const handleContinue = async () => {
    console.log('handleContinue called', { selectedProject, quantity });
    
    if (!selectedProject) {
      console.error('No project selected');
      return;
    }
    
    setIsLendingProgress(true);
    
    try {
      await execLendSupport({
        project: selectedProject,
        quantity
      });
    } catch (error) {
      // ウォレットキャンセルなどのエラー処理
      console.error('Transaction failed:', error);
      setIsLendingProgress(false);

      // Display error message to user
      let errorMessage = 'Transaction failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('UTxO Balance Insufficient') || error.message.includes('Insufficient')) {
          const totalCost = selectedProject.unitPrice * quantity;
          const estimatedTotal = totalCost + 2.5; // Adding estimated transaction fees
          errorMessage = quantity > 1 
            ? `Insufficient wallet balance. Bulk minting ${quantity} NFTs requires approximately ${estimatedTotal.toFixed(2)} ADA (${totalCost.toFixed(2)} ADA for NFTs + network fees).`
            : `Insufficient wallet balance. You need approximately ${estimatedTotal.toFixed(2)} ADA total (${selectedProject.unitPrice} ADA for the NFT + network fees).`;
          setErrorModalContent({ title: 'Insufficient Balance', message: errorMessage });
          // Close all other modals before showing error modal
          setIsPurchaseModalOpen(false);
          setIsWaitingTransactionModalOpen(false);
          setIsTransactionSuccessModalOpen(false);
          setIsMailingListModalOpen(false);
          setIsMailingListSuccessModalOpen(false);
          setIsProjectWaitingListModalOpen(false);
          setIsErrorModalOpen(true);
        } else if (error.message.includes('User declined') || error.message.includes('cancelled')) {
          // User cancelled - just close the progress indicator
        } else {
          setErrorModalContent({ title: 'Transaction Failed', message: error.message });
          // Close all other modals before showing error modal
          setIsPurchaseModalOpen(false);
          setIsWaitingTransactionModalOpen(false);
          setIsTransactionSuccessModalOpen(false);
          setIsMailingListModalOpen(false);
          setIsMailingListSuccessModalOpen(false);
          setIsProjectWaitingListModalOpen(false);
          setIsErrorModalOpen(true);
        }
      }
      // エラー時はモーダルは開いたままにする
    }
  };

  const handleGoToAccountPage = () => {
    console.log("TransactionSuccessfulModal")
    router.push('/en/account');
    closeTransactionSuccessModal();
  };

  const handleJoinDiscord = () => {
    window.open('https://discord.com/invite/harvesthall', '_blank');
    closeTransactionSuccessModal();
  };

  const handleBackToPurchaseModal = () => {
    setIsWaitingTransactionModalOpen(false);
    setIsPurchaseModalOpen(true);
  };

  const handleLendSupport = async (project: Project, quantity: number) => {
    // Check if wallet is connected
    if (!isConnected) {
      // Store pending lend support data
      setPendingLendSupport({ project, quantity });
      // TODO: Trigger Cardano wallet connection
      console.log('Connect wallet - to be implemented');
      return;
    }
    
    setQuantity(quantity);
    setSelectedProject(project);
    setIsPurchaseModalOpen(false);
    setIsWaitingTransactionModalOpen(true);
  };

  const scrollToSection = (ref: RefObject<HTMLElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const projectsButtonRef = useRef<HTMLButtonElement>(null);
  const aboutButtonRef = useRef<HTMLButtonElement>(null);
  const howButtonRef = useRef<HTMLButtonElement>(null);
  const artistsButtonRef = useRef<HTMLButtonElement>(null); // 追加
  const faqButtonRef = useRef<HTMLButtonElement>(null);

  const projectsSectionRef = useRef<HTMLDivElement>(null);
  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const howSectionRef = useRef<HTMLDivElement>(null);
  const artistsSectionRef = useRef<HTMLDivElement>(null); // 追加
  const faqSectionRef = useRef<HTMLDivElement>(null);

  // Navigation container ref for scrolling
  const navigationContainerRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<string | null>(null);

  const [position, setPosition] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 250;
      if (projectsSectionRef.current && scrollPosition >= projectsSectionRef.current.offsetTop && (!aboutSectionRef.current || scrollPosition < aboutSectionRef.current.offsetTop)) {
        setActiveSection('Projects');
      } else if (aboutSectionRef.current && scrollPosition >= aboutSectionRef.current.offsetTop && (!howSectionRef.current || scrollPosition < howSectionRef.current.offsetTop)) {
        setActiveSection('About initiative');
      } else if (howSectionRef.current && scrollPosition >= howSectionRef.current.offsetTop && (!artistsSectionRef.current || scrollPosition < artistsSectionRef.current.offsetTop)) {
        setActiveSection('How it works');
      } else if (artistsSectionRef.current && scrollPosition >= artistsSectionRef.current.offsetTop && (!faqSectionRef.current || scrollPosition < faqSectionRef.current.offsetTop)) {
        setActiveSection('Artists');
      } else if (faqSectionRef.current && scrollPosition >= faqSectionRef.current.offsetTop) {
        setActiveSection('FAQs');
      } else {
        setActiveSection(null);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [projectsSectionRef, aboutSectionRef, howSectionRef, artistsSectionRef, faqSectionRef]);

  useEffect(() => {
    if (activeSection === 'Projects' && projectsButtonRef.current) {
      const button = projectsButtonRef.current;
      setPosition({
        left: button.offsetLeft,
        width: button.offsetWidth,
        opacity: 1,
      });
    } else if (activeSection === 'About initiative' && aboutButtonRef.current) {
      const button = aboutButtonRef.current;
      setPosition({
        left: button.offsetLeft,
        width: button.offsetWidth,
        opacity: 1,
      });
    } else if (activeSection === 'How it works' && howButtonRef.current) {
      const button = howButtonRef.current;
      setPosition({
        left: button.offsetLeft,
        width: button.offsetWidth,
        opacity: 1,
      });
    } else if (activeSection === 'Artists' && artistsButtonRef.current) {
      const button = artistsButtonRef.current;
      setPosition({
        left: button.offsetLeft,
        width: button.offsetWidth,
        opacity: 1,
      });
    } else if (activeSection === 'FAQs' && faqButtonRef.current) {
      const button = faqButtonRef.current;
      setPosition({
        left: button.offsetLeft,
        width: button.offsetWidth,
        opacity: 1,
      });
    } else {
      setPosition((pv) => ({
        ...pv,
        opacity: 0,
      }));
    }
  }, [activeSection, projectsButtonRef, aboutButtonRef, howButtonRef, artistsButtonRef, faqButtonRef]);

  // Auto-scroll active button to center on mobile
  useEffect(() => {
    if (window.innerWidth >= 768) return; // Skip on desktop (md breakpoint)
    
    if (!navigationContainerRef.current) return;

    let activeButtonRef: React.RefObject<HTMLButtonElement | null> | null = null;
    
    switch (activeSection) {
      case 'Projects':
        activeButtonRef = projectsButtonRef;
        break;
      case 'About initiative':
        activeButtonRef = aboutButtonRef;
        break;
      case 'How it works':
        activeButtonRef = howButtonRef;
        break;
      case 'Artists':
        activeButtonRef = artistsButtonRef;
        break;
      case 'FAQs':
        activeButtonRef = faqButtonRef;
        break;
      default:
        return;
    }

    if (activeButtonRef?.current && navigationContainerRef.current) {
      const container = navigationContainerRef.current;
      const button = activeButtonRef.current;
      
      const containerWidth = container.clientWidth;
      const buttonLeft = button.offsetLeft;
      const buttonWidth = button.clientWidth;
      
      // Calculate scroll position to center the button
      const scrollLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [activeSection, projectsButtonRef, aboutButtonRef, howButtonRef, artistsButtonRef, faqButtonRef]);

  // Handle wallet connection for pending lend support
  useEffect(() => {
    if (isConnected && pendingLendSupport.project && pendingLendSupport.quantity > 0) {
      // Execute the pending lend support
      setQuantity(pendingLendSupport.quantity);
      setSelectedProject(pendingLendSupport.project);
      setIsPurchaseModalOpen(false);
      setIsWaitingTransactionModalOpen(true);
      
      // Clear the pending state
      setPendingLendSupport({ project: null, quantity: 0 });
    }
  }, [isConnected, pendingLendSupport]);

  const { t } = useTranslation(lng);

  useEffect(() => {
    if (onLoaded) {
      onLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white min-h-screen"> {/* Changed default background */}
      <CommonHeader lng={lng} />
      <Top lng={lng} projects={projects}/>
      <div className="sticky top-[88px] left-0 right-0 flex justify-center z-[42] mt-18 pointer-events-none">
        <div className="w-full max-w-none md:max-w-fit px-4 md:px-0">
          <div
            ref={navigationContainerRef}
            className="relative bg-white shadow rounded-full pl-1 pr-0 py-1 flex space-x-2 text-black items-center font-function-pro overflow-x-auto scrollbar-hide md:overflow-x-visible w-full md:w-auto max-w-[300px] md:max-w-none mx-auto pointer-events-auto"
          >
            <button
              ref={projectsButtonRef}
              onClick={() => scrollToSection(projectsSectionRef)} 
              className={`cursor-pointer relative z-10 px-3 md:px-6 py-2 rounded-full transition-colors duration-300 ${activeSection === 'Projects' ? 'bg-dark-blue text-white' : 'text-gray-400'} flex items-center space-x-2 font-function-pro whitespace-nowrap flex-shrink-0`}>
              <span className="font-function-pro text-sm md:text-base">{t('top.nav.projects')}</span>
            </button>
            <button
              ref={aboutButtonRef}
              onClick={() => scrollToSection(aboutSectionRef)} 
              className={`cursor-pointer relative z-10 px-3 md:px-6 py-2 rounded-full transition-colors duration-300 ${activeSection === 'About initiative' ? 'bg-dark-blue text-white' : 'text-gray-400'} flex items-center space-x-2 font-function-pro whitespace-nowrap flex-shrink-0`}>
              <span className="font-function-pro text-sm md:text-base">{t('top.nav.about')}</span>
            </button>
            <button
              ref={howButtonRef}
              onClick={() => scrollToSection(howSectionRef)} 
              className={`cursor-pointer relative z-10 px-3 md:px-6 py-2 rounded-full transition-colors duration-300 ${activeSection === 'How it works' ? 'bg-dark-blue text-white' : 'text-gray-400'} flex items-center space-x-2 font-function-pro whitespace-nowrap flex-shrink-0`}>
              <span className="font-function-pro text-sm md:text-base">{t('top.nav.how')}</span>
            </button>
            <button
              ref={artistsButtonRef}
              onClick={() => scrollToSection(artistsSectionRef)} 
              className={`cursor-pointer relative z-10 px-3 md:px-6 py-2 rounded-full transition-colors duration-300 ${activeSection === 'Artists' ? 'bg-dark-blue text-white' : 'text-gray-400'} flex items-center space-x-2 font-function-pro whitespace-nowrap flex-shrink-0`}>
              <span className="font-function-pro text-sm md:text-base">{t('top.nav.artists')}</span>
            </button>
            <button
              ref={faqButtonRef}
              onClick={() => scrollToSection(faqSectionRef)} 
              className={`cursor-pointer relative z-10 px-3 md:px-6 py-2 rounded-full transition-colors duration-300 ${activeSection === 'FAQs' ? 'bg-dark-blue text-white' : 'text-gray-400'} flex items-center space-x-2 font-function-pro whitespace-nowrap flex-shrink-0`}>
              <span className='ml-2 font-function-pro text-sm md:text-base'>{t('top.nav.faqs')}</span>
            </button>
            <motion.li
              animate={{
                ...position,
              }}
              className="absolute z-0 h-10 list-none rounded-full bg-dark-blue"
            />
          </div>
        </div>
      </div>
      <Projects ref={projectsSectionRef} projects={projects} onProjectClick={openPurchaseModal} lng={lng} />
      <Video lng={lng} />
      <About ref={aboutSectionRef} lng={lng} />
      <Ecosystem ref={howSectionRef} lng={lng} />
      <ProofOfSupportArtists ref={artistsSectionRef} lng={lng} />
      <FaQ ref={faqSectionRef} lng={lng} />
      <Contact onOpenModal={handleOpenMailingListModal} lng={lng} />
      <CommonFooter lng={lng} />

      {isPurchaseModalOpen && selectedProject && (
        <PurchaseModal
          lng={lng}
          project={selectedProject}
          quantity={quantity}
          setQuantity={setQuantity}
          onClose={closePurchaseModal}
          onLendSupport={handleLendSupport}
        />
      )}
      {isProjectWaitingListModalOpen && selectedProject && ( // Render waiting list modal
        <ProjectWaitingListModal
          lng={lng}
          project={selectedProject}
          onClose={closeProjectWaitingListModal}
          onJoinMailingList={handleJoinMailingList}
        />
      )}
      {isTransactionSuccessModalOpen && selectedProject && (
        <TransactionSuccessfulModal
          lng={lng}
          isOpen={isTransactionSuccessModalOpen}
          onClose={closeTransactionSuccessModal}
          onGoToAccountPage={handleGoToAccountPage}
          onJoinDiscord={handleJoinDiscord}
          projectId={selectedProject.id}
          transactionData={{
            date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            totalLent: `${quantity * Number(selectedProject.unitPrice)} ADA`,
            tokenIds: mintedTokenIds
          }}
        />
      )}

      <MailingListModal
        lng={lng}
        isOpen={isMailingListModalOpen}
        onClose={handleCloseMailingListModal}
        initialEmail={modalInitialEmail}
        initialWalletAddress={initialWalletAddress}
        initialProject={selectedProject!}
        onSubscribe={handleMailingListSubscribe}
      />

      {isMailingListSuccessModalOpen && (
        <MailingListSuccessfulModal
          lng={lng}
          isOpen={isMailingListSuccessModalOpen}
          onClose={handleCloseMailingListSuccessModal}
        />
      )}

      {isWaitingTransactionModalOpen && (
        <WaitingTransactionModal
          lng={lng}
          isOpen={isWaitingTransactionModalOpen}
          isLendingProgress={isLendingProgress}
          onContinue={handleContinue}
          onBackToPurchaseModal={handleBackToPurchaseModal}
          project={selectedProject!}
          amount={quantity}
          onClose={() => setIsWaitingTransactionModalOpen(false)}
        />
      )}

      {/* Error Modal */}
      <ErrorModal
        lng={lng}
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        errorTitle={errorModalContent.title}
        errorMessage={errorModalContent.message}
      />

      {/* {isMobileBannerVisible && (
        <div className="fixed top-0 left-0 right-0 bg-secondary text-white text-center py-1 px-4 z-50 shadow-lg">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="flex-1">
              <p className="text-sm font-function-pro">
              Best viewed on a PC for optimal performance.
              </p>
            </div>
            <button 
              onClick={handleCloseMobileBanner} 
              className="ml-4 p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors duration-200"
              aria-label="Close banner"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )} */}
    </div>
  );
};
