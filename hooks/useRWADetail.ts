import { useQuery } from '@tanstack/react-query';
import { RwaAsset, RepaymentHistory } from '@/lib/types'; // Import types from lib

export function useRWADetail(assetId?: number) {
  return useQuery<RwaAsset[], Error>({
    queryKey: ['rwaDetail', assetId],
    queryFn: async () => {
      console.log('Fetching RWA detail for assetId:', assetId);
      const response = await fetch(`/api/fetch-rwa?resource=asset${assetId !== undefined ? `&assetId=${assetId}` : ''}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch RWA detail:', errorText);
        throw new Error('Failed to fetch RWA detail');
      }
      const data = await response.json();
      console.log('Fetched RWA data:', data);
      return data;
    },
    enabled: assetId !== undefined && assetId !== 0,
  });
}

export function useRepaymentHistories() {
  return useQuery<RepaymentHistory[], Error>({
    queryKey: ['repaymentHistories'],
    queryFn: async () => {
      // Assuming a new endpoint or modification to handle repayment histories
      const response = await fetch('/api/fetch-rwa?resource=repayment-history');
      if (!response.ok) {
        throw new Error('Failed to fetch repayment histories');
      }
      return response.json();
    },
  });
}