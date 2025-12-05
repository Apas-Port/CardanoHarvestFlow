import React from 'react';

interface SidebarNavigationProps {
  activeSection: string;
  scrollToSection: (sectionId: string) => void;
  hasUserHistory?: boolean;
  hasRepaymentHistory?: boolean;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeSection,
  scrollToSection
}) => {
  return (
    <div className="w-full lg:w-64">
      <nav>
        <ul className="p-4 font-bold text-lg uppercase flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible lg:space-y-2">
          <li className="whitespace-nowrap">
            <a
              href="#dashboard"
              className={`block py-2 px-4 hover:bg-gray-100 ${activeSection === 'dashboard' ? 'text-[#325AB4] font-bold' : 'text-gray-700'}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('dashboard');
              }}
            >
              Dashboard
            </a>
          </li>
          <li className="whitespace-nowrap">
            <a
              href="#user-history"
              className={`block py-2 px-4 hover:bg-gray-100 ${activeSection === 'user-history' ? 'text-[#325AB4] font-bold' : 'text-gray-700'}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('user-history');
              }}
            >
              User History
            </a>
          </li>
          {/*
          <li className="whitespace-nowrap hidden">
            <a
              href="#repayment-history"
              className={`block py-2 px-4 hover:bg-gray-100 ${activeSection === 'repayment-history' ? 'text-[#325AB4] font-bold' : 'text-gray-700'}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('repayment-history');
              }}
            >
              Repayment History
            </a>
          </li>
          */}
          <li className="whitespace-nowrap">
            <a
              href="#proof-of-support"
              className={`block py-2 px-4 hover:bg-gray-100 ${activeSection === 'proof-of-support' ? 'text-[#325AB4] font-bold' : 'text-gray-700'}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('proof-of-support');
              }}
            >
              Proof of Support
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
};