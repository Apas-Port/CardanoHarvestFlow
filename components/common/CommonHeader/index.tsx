import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaXTwitter, FaDiscord } from 'react-icons/fa6';
import { LuCarrot, LuWallet, LuGlobe } from "react-icons/lu";
import { IoIosArrowDown } from 'react-icons/io';
import { FaBars } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { useWallet } from '@meshsdk/react';
import WalletSelectionModal from '@/components/modal/WalletSelectionModal';
import { useWalletPersistence } from '@/hooks/useWalletPersistence';

import { useTranslation } from '@/i18n/client';
import { languages } from '@/i18n/settings';

interface CommonHeaderProps {
  lng: string;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({ lng }) => {
  const { t } = useTranslation(lng);
  const { connected, wallet } = useWallet();
  const { disconnectAndClear } = useWalletPersistence();
  const [address, setAddress] = useState<string>(() => {
    // Initialize with saved address for immediate display
    if (typeof window !== 'undefined') {
      return localStorage.getItem('walletAddress') || '';
    }
    return '';
  });
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // アニメーション状態の管理
  const [walletMenuAnimating, setWalletMenuAnimating] = useState(false);
  const [servicesMenuAnimating, setServicesMenuAnimating] = useState(false);
  const [languageMenuAnimating, setLanguageMenuAnimating] = useState(false);
  const [walletMenuClosing, setWalletMenuClosing] = useState(false);
  const [servicesMenuClosing, setServicesMenuClosing] = useState(false);
  const [languageMenuClosing, setLanguageMenuClosing] = useState(false);

  const walletButtonRef = useRef<HTMLButtonElement>(null);
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const servicesButtonRef = useRef<HTMLButtonElement>(null);
  const servicesMenuRef = useRef<HTMLDivElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  // Get wallet address when connected
  useEffect(() => {
    const getWalletInfo = async () => {
      if (connected && wallet) {
        try {
          // Try to get address
          let walletAddr = '';
          if (typeof wallet.getChangeAddress === 'function') {
            walletAddr = await wallet.getChangeAddress();
          } else if (typeof wallet.getUsedAddresses === 'function') {
            const addresses = await wallet.getUsedAddresses();
            if (addresses.length > 0) {
              walletAddr = addresses[0];
            }
          }
          
          if (walletAddr) {
            setAddress(walletAddr);
            // Save address to localStorage for quick display on refresh
            localStorage.setItem('walletAddress', walletAddr);
          }
        } catch (error) {
          console.error('Error getting wallet address:', error);
        }
      } else if (!connected) {
        // Clear address when disconnected
        localStorage.removeItem('walletAddress');
      }
    };

    getWalletInfo();
  }, [connected, wallet]);

  // Auto-reconnect saved wallet
  useEffect(() => {
    const autoConnect = async () => {
      const savedWallet = localStorage.getItem('connectedWallet');
      
      if (savedWallet && !connected) {
        // Wait for wallet extensions to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (typeof window !== 'undefined' && window.cardano && window.cardano[savedWallet]) {
          try {
            console.log(`Attempting to reconnect to ${savedWallet}...`);
            setIsWalletModalOpen(false);
          } catch (error) {
            console.error('Auto-reconnect failed:', error);
            // Clear invalid saved wallet
            localStorage.removeItem('connectedWallet');
          }
        }
      }
    };

    autoConnect();
  }, [connected]);

  const handleMenuClose = (menuType: 'wallet' | 'services' | 'language') => {
    switch (menuType) {
      case 'wallet':
        setWalletMenuClosing(true);
        setTimeout(() => {
          setIsWalletMenuOpen(false);
          setWalletMenuClosing(false);
          setWalletMenuAnimating(false);
        }, 150);
        break;
      case 'services':
        setServicesMenuClosing(true);
        setTimeout(() => {
          setIsServicesMenuOpen(false);
          setServicesMenuClosing(false);
          setServicesMenuAnimating(false);
        }, 150);
        break;
      case 'language':
        setLanguageMenuClosing(true);
        setTimeout(() => {
          setIsLanguageMenuOpen(false);
          setLanguageMenuClosing(false);
          setLanguageMenuAnimating(false);
        }, 150);
        break;
    }
  };

  const toggleWalletMenu = () => {
    if (isWalletMenuOpen) {
      handleMenuClose('wallet');
    } else {
      setIsServicesMenuOpen(false);
      setIsLanguageMenuOpen(false);
      setIsWalletMenuOpen(true);
      setWalletMenuAnimating(true);
    }
  };

  const toggleServicesMenu = () => {
    if (isServicesMenuOpen) {
      handleMenuClose('services');
    } else {
      setIsWalletMenuOpen(false);
      setIsLanguageMenuOpen(false);
      setIsServicesMenuOpen(true);
      setServicesMenuAnimating(true);
    }
  };

  const toggleLanguageMenu = () => {
    if (isLanguageMenuOpen) {
      handleMenuClose('language');
    } else {
      setIsWalletMenuOpen(false);
      setIsServicesMenuOpen(false);
      setIsLanguageMenuOpen(true);
      setLanguageMenuAnimating(true);
    }
  };

  const handleDisconnect = () => {
    disconnectAndClear();
    setAddress('');
    handleMenuClose('wallet');
    handleMenuClose('language');
  };

  const handleConnect = () => {
    setIsWalletModalOpen(true);
  };

  const handleWalletConnected = () => {
    setIsWalletModalOpen(false);
  };

  // Effect to handle clicks outside menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close wallet menu if click is outside
      if (
        walletButtonRef.current &&
        !walletButtonRef.current.contains(event.target as Node) &&
        walletMenuRef.current &&
        !walletMenuRef.current.contains(event.target as Node)
      ) {
        if (isWalletMenuOpen) {
          handleMenuClose('wallet');
        }
      }
      // Close services menu if click is outside
      if (
        servicesButtonRef.current &&
        !servicesButtonRef.current.contains(event.target as Node) &&
        servicesMenuRef.current &&
        !servicesMenuRef.current.contains(event.target as Node)
      ) {
        if (isServicesMenuOpen) {
          handleMenuClose('services');
        }
      }
      // Close language menu if click is outside
      if (
        languageButtonRef.current &&
        !languageButtonRef.current.contains(event.target as Node) &&
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node)
      ) {
        if (isLanguageMenuOpen) {
          handleMenuClose('language');
        }
      }
    };

    if (isWalletMenuOpen || isServicesMenuOpen || isLanguageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWalletMenuOpen, isServicesMenuOpen, isLanguageMenuOpen]);

  return (
    <header className="fixed text-dark-blue top-0 left-0 right-0 z-[45] bg-white shadow-md px-2 border-b" style={{ borderBottomColor: '#BFC9D4' }}>
      {/* md以上: 従来のナビゲーション */}
      <div className="hidden md:flex justify-between items-center pl-6 pr-2">
        <Link href={`/${lng}`}>
          <Image src="/images/common/logo.png" alt="HarvestFlow Logo" width={160} height={50} className="text-xl font-bold"/>
        </Link>
        <div className="flex items-center space-x-4 h-16">
          <div className="border-l h-full" style={{ borderColor: '#BFC9D4' }}></div>
          <div className="flex items-center h-full px-2">
            <Link
              href="https://x.com/HarvestFlow_io"
              target="_blank"
              className="cursor-pointer"
            >
              <FaXTwitter className="text-xl" />
            </Link>
          </div>
          <div className="border-l h-full" style={{ borderColor: '#BFC9D4' }}></div>
          <div className="flex items-center h-full px-2">
              <Link
                href="https://discord.com/invite/harvesthall"
                target="_blank"
                className="cursor-pointer"
              >
                <FaDiscord className="text-xl" />
              </Link>
          </div>
          <div className="border-l h-full" style={{ borderColor: '#BFC9D4' }}></div>
          {/* Language Selector */}
          <div className="relative flex items-center h-full px-2">
            <button ref={languageButtonRef} onClick={toggleLanguageMenu} className="flex items-center cursor-pointer">
              <LuGlobe className="mr-1 text-xl" style={{ color: '#586789' }} /> {lng === 'en' ? 'EN' : 'JP'}
            </button>
            {/* Language Dropdown Menu */}
            {(isLanguageMenuOpen || languageMenuAnimating) && (
              <div 
                ref={languageMenuRef} 
                className={`absolute -left-4 top-full w-45 bg-white shadow-md rounded-b-md border border-gray-200 py-1 z-40 ${
                  languageMenuClosing ? 'animate-dropdown-out' : 'animate-dropdown-in'
                }`}
              >
                <ul>
                  {languages.map((language) => (
                    <li key={language}>
                      <Link
                        href={`/${language}`}
                        className={`block px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                          language === lng 
                            ? 'flex h-[51px] p-1 flex-col justify-center items-start gap-2 self-stretch' 
                            : ''
                        } ${language === 'en' ? 'border-b' : ''}`}
                        style={{
                          ...(language === lng 
                            ? { background: 'linear-gradient(92deg, rgba(233, 241, 255, 0.40) 0%, rgba(186, 206, 233, 0.40) 99.7%)' }
                            : {}),
                          ...(language === 'en' ? { borderBottomColor: '#BFC9D4' } : {})
                        }}
                        onClick={() => handleMenuClose('language')}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span>{language === 'en' ? 'English' : '日本語'}</span>
                          {language === lng && (
                            <div 
                              className="flex px-[6px] py-[2px] justify-center items-center gap-2 text-sm text-white rounded"
                              style={{ background: 'linear-gradient(95deg, #95CAFF 0%, #83A6FF 95.81%)' }}
                            >
                              Selected
                            </div>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="border-l h-full" style={{ borderColor: '#BFC9D4' }}></div>
          {/* Services Button and Dropdown */}
          <div className="relative flex items-center h-full px-2">
            <button ref={servicesButtonRef} onClick={toggleServicesMenu} className="flex items-center cursor-pointer">
              {t('header.services', 'Services')} <IoIosArrowDown className={`ml-1 transition-transform duration-200 ${isServicesMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {/* Services Dropdown Menu */}
            {(isServicesMenuOpen || servicesMenuAnimating) && (
              <div 
                ref={servicesMenuRef} 
                className={`absolute -left-4 top-full w-56 bg-white rounded-b-lg shadow-lg border border-gray-200 py-1 z-40 ${
                  servicesMenuClosing ? 'animate-dropdown-out' : 'animate-dropdown-in'
                }`}
              >
                <ul>
                  <li>
                    <Link
                      href={'https://harvestflow.io/'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <button className="block px-4 py-4 text-sm hover:bg-gray-100 w-full text-left cursor-pointer">
                        {t('header.cryptoLending', 'Crypto Lending')}
                      </button>
                    </Link>
                  </li>
                  <li>
                    <Link href={'https://customwraps.harvestflow.io'} target="_blank" rel="noopener noreferrer">
                      <button className="block px-4 py-4 text-sm hover:bg-gray-100 w-full text-left border-t border-gray-200 cursor-pointer">
                        {t('header.customWrapping', 'Custom Wrapping')}
                      </button>
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>
          <div className="border-l h-full" style={{ borderColor: '#BFC9D4' }}></div>

          {/* Wallet Button and Dropdown */}
          {connected ? (
            <div className="relative flex items-center h-full px-2">
              <button ref={walletButtonRef} onClick={toggleWalletMenu} className="flex items-center cursor-pointer">
                {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'Connected'} <IoIosArrowDown className={`ml-1 transition-transform duration-200 ${isWalletMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {/* Wallet Dropdown Menu */}
              {(isWalletMenuOpen || walletMenuAnimating) && (
                <div 
                  ref={walletMenuRef} 
                  className={`absolute -right-4 top-full w-56 bg-white rounded-b-lg shadow-lg border border-gray-200 py-1 z-40 ${
                    walletMenuClosing ? 'animate-dropdown-out' : 'animate-dropdown-in'
                  }`}
                >
                  <ul>
                    <li>
                      <Link href={`/${lng}/account`} className="flex items-center px-4 py-4 text-sm hover:bg-gray-100 w-full text-left cursor-pointer" onClick={() => handleMenuClose('wallet')}>
                        <LuCarrot className="mr-3 w-6 h-6 text-[#586789]" /> {t('header.myAccount', 'My Account')}
                      </Link>
                    </li>
                    {/* <li>
                      <Link href={`/${lng}/workshop`} className="flex items-center px-4 py-4 text-sm hover:bg-gray-100 w-full border-t border-gray-200 text-left cursor-pointer" onClick={() => handleMenuClose('wallet')}>
                        <LuWheat className="mr-3 w-6 h-6 text-[#586789]" /> {t('header.wrapWorkshop', 'Wrap Workshop')}
                      </Link>
                    </li> */}
                    <li>
                      <button
                        onClick={handleDisconnect}
                        className="flex items-center px-4 py-4 text-sm hover:bg-gray-100 w-full text-left border-t border-gray-200 mt-1 cursor-pointer"
                      >
                        <LuWallet className="mr-3 w-6 h-6 text-[#586789]" /> {t('header.disconnectWallet', 'Disconnect Wallet')}
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ): (
            <div className="relative flex items-center h-full px-2">
              <button 
                onClick={handleConnect} 
                className="px-6 py-2 rounded-md text-dark-blue font-regular bg-gradient-to-b from-[#F9D78C] to-[#E7B45A] hover:opacity-80 transition-opacity duration-200 cursor-pointer"
              >
                {t('header.connectWallet', 'Connect Wallet')}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* md未満: ロゴ＋ハンバーガー */}
      <div className="flex md:hidden justify-between items-center h-16 px-4">
        <Link href={`/${lng}`}>
          <Image src="/images/common/logo.png" alt="HarvestFlow Logo" width={160} height={50} className="text-xl font-bold"/>
        </Link>
        <button
          aria-label="Open menu"
          tabIndex={0}
          onClick={() => setIsMobileMenuOpen(true)}
          className="focus:outline-none cursor-pointer"
        >
          <FaBars className="w-7 h-7" />
        </button>
      </div>
      {/* モバイルメニューオーバーレイ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#e9eff8] bg-opacity-95 flex flex-col items-center justify-between py-8 px-6 animate-fadeIn">
          {/* 閉じるボタン */}
          <button
            aria-label="Close menu"
            tabIndex={0}
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 text-2xl cursor-pointer"
          >
            <IoMdClose />
          </button>
          {/* 上部ロゴとタイトル */}
          <div className="flex flex-col items-center mt-8">
            <Image src="/images/common/logo-2.png" alt="HarvestFlow Logo" width={240} height={80} />
          </div>
          {/* メニュー本体 */}
          <div className="flex flex-col items-center gap-8 mt-8 w-full">
            {/* Language Selector for Mobile */}
            <div className="flex items-center gap-4">
              {languages.map((language) => (
                <Link
                  key={language}
                  href={`/${language}`}
                  className={`text-dark-blue font-function-pro font-medium text-[18px] tracking-[1.1px] uppercase px-3 py-2 rounded cursor-pointer ${
                    language === lng ? 'bg-[#586789] text-white' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {language === 'en' ? 'EN' : 'JP'}
                </Link>
              ))}
            </div>
            {connected ? (
              <>
                <Link
                  href={`/${lng}/account`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-dark-blue font-function-pro font-medium text-[22px] tracking-[1.1px] uppercase cursor-pointer"
                >
                  {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'CONNECTED'}
                </Link>
                <button
                  onClick={() => { handleDisconnect(); setIsMobileMenuOpen(false); }}
                  className="mt-2 text-dark-blue font-function-pro font-medium text-[22px] tracking-[1.1px] uppercase cursor-pointer"
                  aria-label="Disconnect Wallet"
                >
                  DISCONNECT WALLET
                </button>
              </>
            ) : (
              <button
                onClick={() => { handleConnect(); }}
                className="text-dark-blue font-function-pro font-medium text-[22px] tracking-[1.1px] uppercase cursor-pointer"
                aria-label="Connect Wallet"
              >
                CONNECT WALLET
              </button>
            )}
            <div className="flex items-center gap-8 mt-4">
              <Link href="https://x.com/HarvestFlow_io" target="_blank" aria-label="X(Twitter)" className="cursor-pointer">
                <FaXTwitter className="w-6 h-6" />
              </Link>
              <Link href="https://discord.com/invite/harvesthall" target="_blank" aria-label="Discord" className="cursor-pointer">
                <FaDiscord className="w-6 h-6" />
              </Link>
            </div>
          </div>
          {/* フッター */}
          <div className="flex flex-col items-center mb-2 w-full">
            <div className="flex items-center justify-center w-full">
              <Image src="/images/common/produced-by-apasport-black.png" alt="Produced by Apas Port" width={120} height={24} />
            </div>
          </div>
        </div>
      )}
      
      {/* Wallet Selection Modal */}
      <WalletSelectionModal 
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onWalletConnected={handleWalletConnected}
      />
    </header>
  );
};

export default CommonHeader;