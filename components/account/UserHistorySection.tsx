import React from "react";
import { TokenEvent } from "@/lib/types";

// Mock utility function
const middleEllipsis = (str: string, maxLength: number = 10) => {
  if (!str || str.length <= maxLength) return str;
  const start = str.slice(0, 6);
  const end = str.slice(-4);
  return `${start}...${end}`;
};

// Mock date format function
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  const getDayWithSuffix = (day: number) => {
    if (day >= 11 && day <= 13) return `${day}th`;
    switch (day % 10) {
      case 1: return `${day}st`;
      case 2: return `${day}nd`;
      case 3: return `${day}rd`;
      default: return `${day}th`;
    }
  };
  
  return `${month}.${getDayWithSuffix(day)} ${hours}:${minutes}:${seconds}`;
};

interface UserHistorySectionProps {
  tokenEvents: TokenEvent[] | null;
  lng: string;
  address: string;
  isLoadingTokenEvents?: boolean;
}

// テーブル行のスケルトンローダーコンポーネント
const TableRowSkeleton: React.FC = () => (
  <div className="flex border-b border-black border-dashed animate-pulse">
    <div className="w-[25vw] xl:w-[15%] text-center px-2 py-8 border-r border-black flex-shrink-0 flex items-center justify-center">
      <div className="h-4 bg-gray-200 rounded mx-auto w-16"></div>
    </div>
    <div className="w-[25vw] xl:w-[15%] text-center px-2 py-8 border-r border-black flex-shrink-0 flex items-center justify-center">
      <div className="h-4 bg-gray-200 rounded mx-auto w-20"></div>
    </div>
    <div className="w-[45vw] xl:w-[25%] text-center px-2 py-8 border-r border-black flex-shrink-0 flex items-center justify-center">
      <div className="h-4 bg-gray-200 rounded mx-auto w-32"></div>
    </div>
    <div className="w-[30vw] xl:w-[20%] text-center px-2 py-8 border-r border-black flex-shrink-0 flex items-center justify-center">
      <div className="h-4 bg-gray-200 rounded mx-auto w-24"></div>
    </div>
    <div className="w-[35vw] xl:w-[25%] text-center px-2 py-8 flex-shrink-0 flex items-center justify-center">
      <div className="h-4 bg-gray-200 rounded mx-auto w-28"></div>
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="text-center py-20 px-6 rounded-lg bg-white/60 backdrop-blur-md">
    <div className="mb-6">
      <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No Transaction History</h3>
    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
      Your transaction history will appear here once you participate in projects.
    </p>
  </div>
);

const UserHistorySection: React.FC<UserHistorySectionProps> = ({ tokenEvents, isLoadingTokenEvents = false }) => {
  
  // Use actual tokenEvents if available, otherwise use empty array (not mock data)
  const combinedHistory = tokenEvents || [];

  // Show loading skeleton when isLoadingTokenEvents is true
  if (isLoadingTokenEvents) {
    return (
      <div className="flex flex-col gap-[30px] max-w-[90%] xl:max-w-[100%] mx-auto xl:mx-0">
        <h2 className="text-heading5Larger xl:text-heading3_30_30 text-center uppercase font-medium tracking-[0.35rem] mt-12">User history</h2>
        
        {/* ローディング状態メッセージ */}
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-gray-600 font-medium">Loading your transaction history...</span>
        </div>
        
        <div className="w-full bg-white border border-black overflow-x-scroll xl:overflow-x-auto overflow-y-auto max-h-[60vh]">
          {/* ヘッダー */}
          <div className="flex border-b border-black border-dashed bg-white sticky top-0 z-10">
            <div className="w-[25vw] xl:w-[15%] text-caption uppercase text-center font-normal px-2 py-[10px] border-r border-black flex-shrink-0">Type</div>
            <div className="w-[25vw] xl:w-[15%] text-caption uppercase text-center font-normal px-2 py-[10px] border-r border-black flex-shrink-0">Amount</div>
            <div className="w-[45vw] xl:w-[25%] text-caption uppercase text-center font-normal px-2 py-[10px] border-r border-black flex-shrink-0">Project</div>
            <div className="w-[30vw] xl:w-[20%] text-caption uppercase text-center font-normal px-2 py-[10px] border-r border-black flex-shrink-0">Tx</div>
            <div className="w-[35vw] xl:w-[25%] text-caption uppercase text-center font-normal px-2 py-[10px] flex-shrink-0">Time</div>
          </div>
          
          {/* ボディ（スケルトン） */}
          {[...Array(5)].map((_, index) => (
            <TableRowSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // エンプティステート：combinedHistoryが空配列の場合
  if (combinedHistory.length === 0) {
    return (
      <div className="flex flex-col gap-[30px] max-w-[90%] xl:max-w-[100%] mx-auto xl:mx-0">
        <h2 className="text-heading5Larger xl:text-heading3_30_30 text-center uppercase font-medium tracking-[0.35rem] mt-12">User history</h2>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[30px] max-w-[90%] xl:max-w-[100%] mx-auto xl:mx-0">
      <h2 className="text-heading5Larger xl:text-heading3_30_30 text-center uppercase font-medium tracking-[0.35rem] mt-12">User history</h2>
      
      <div className="w-full bg-white border border-black overflow-x-scroll xl:overflow-x-auto overflow-y-auto max-h-[50vh]">
        {/* ヘッダー */}
        <div className="flex border-b border-black border-dashed bg-white sticky top-0 z-10">
          <div className="w-[25vw] xl:w-[15%] text-caption uppercase text-center font-normal px-2 py-[10px] border-r border-black flex-shrink-0">Type</div>
          <div className="w-[25vw] xl:w-[15%] text-caption uppercase text-center font-normal px-2 py-[10px] border-r border-black flex-shrink-0">Amount</div>
          <div className="w-[45vw] xl:w-[25%] text-caption uppercase text-center font-normal px-2 py-[10px] border-r border-black flex-shrink-0">Project</div>
          <div className="w-[30vw] xl:w-[20%] text-caption uppercase text-center font-normal px-2 py-[10px] border-r border-black flex-shrink-0">Tx</div>
          <div className="w-[35vw] xl:w-[25%] text-caption uppercase text-center font-normal px-2 py-[10px] flex-shrink-0">Time</div>
        </div>
        
        {/* ボディ */}
        {combinedHistory.map((row: any, index: number) => (
          <div 
            className={`flex ${index < combinedHistory.length - 1 ? 'border-b border-black border-dashed' : ''}`} 
            key={index}
          >
            <div className="w-[25vw] xl:w-[15%] text-body xl:text-body17 uppercase text-center px-2 py-8 border-r border-black bg-secondary text-white flex-shrink-0 flex items-center justify-center">{row.event}</div>
            <div className="w-[25vw] xl:w-[15%] text-body xl:text-body17 uppercase text-center px-2 py-8 border-r border-black flex-shrink-0 flex items-center justify-center">{row.amount} {row.payable}</div>
            <div className="w-[45vw] xl:w-[25%] text-body xl:text-body17 uppercase text-center px-2 py-8 border-r border-black whitespace-nowrap xl:whitespace-normal flex-shrink-0 flex items-center justify-center">{row.project?.title}</div>
            <div className="w-[30vw] xl:w-[20%] text-body xl:text-body17 uppercase text-center px-2 py-8 border-r border-black flex-shrink-0 flex items-center justify-center">
              {row.tx_hash ? (
                <a 
                  target="_blank" 
                  rel="noreferrer" 
                  href={`https://cardanoscan.io/transaction/${row.tx_hash}`} 
                  className="hover:underline text-blue-600"
                >
                  {middleEllipsis(row.tx_hash)}
                </a>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
            <div className="w-[35vw] xl:w-[25%] text-body xl:text-body17 uppercase text-center px-2 py-8 flex-shrink-0 flex items-center justify-center">{formatDate(row.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserHistorySection;
