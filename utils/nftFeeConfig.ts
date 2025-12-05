import feeConfig from '@/config/nft-minting-fees.json';

export interface FeeAmount {
  amount: number;
  unit: string;
  description: string;
}

export interface NetworkFees {
  baseFee: FeeAmount;
  minUtxo: FeeAmount;
  transactionFee: FeeAmount;
  totalRequired: FeeAmount;
}

export interface CollectionFees {
  specialFee: FeeAmount;
  discount?: {
    percentage: number;
    description: string;
  };
}

export interface BulkDiscount {
  minQuantity: number;
  maxQuantity: number | null;
  discountPercentage: number;
}

export interface NFTMintingConfig {
  minting: {
    description: string;
    networks: {
      mainnet: NetworkFees;
      preprod: NetworkFees;
    };
    collections: {
      [key: string]: CollectionFees;
    };
    bulkMinting: {
      enabled: boolean;
      discounts: BulkDiscount[];
    };
  };
}

export const getNFTMintingFees = (network: 'mainnet' | 'preprod' = 'preprod'): NetworkFees => {
  return feeConfig.minting.networks[network];
};

export const getCollectionFees = (collectionName: string = 'default'): CollectionFees => {
  return (feeConfig.minting.collections as any)[collectionName] || feeConfig.minting.collections.default;
};

export const calculateTotalFee = (
  network: 'mainnet' | 'preprod' = 'preprod',
  collectionName?: string,
  quantity: number = 1
): number => {
  const networkFees = getNFTMintingFees(network);
  const collectionFees = collectionName ? getCollectionFees(collectionName) : getCollectionFees('default');
  
  let baseFee = networkFees.totalRequired.amount;
  
  // Add collection special fee
  if (collectionFees.specialFee.amount > 0) {
    baseFee += collectionFees.specialFee.amount;
  }
  
  // Apply collection discount
  if (collectionFees.discount && collectionFees.discount.percentage > 0) {
    baseFee = baseFee * (100 - collectionFees.discount.percentage) / 100;
  }
  
  // Calculate bulk fee with discounts
  let totalFee = baseFee * quantity;
  
  if (feeConfig.minting.bulkMinting.enabled && quantity > 1) {
    const discount = getBulkDiscount(quantity);
    if (discount > 0) {
      totalFee = totalFee * (100 - discount) / 100;
    }
  }
  
  return Math.floor(totalFee);
};

export const getBulkDiscount = (quantity: number): number => {
  if (!feeConfig.minting.bulkMinting.enabled) return 0;
  
  const discount = feeConfig.minting.bulkMinting.discounts.find(d => 
    quantity >= d.minQuantity && 
    (d.maxQuantity === null || quantity <= d.maxQuantity)
  );
  
  return discount ? discount.discountPercentage : 0;
};

export const formatLovelaceToADA = (lovelace: number): string => {
  return (lovelace / 1_000_000).toFixed(6).replace(/\.?0+$/, '');
};

export const getFeeBreakdown = (
  network: 'mainnet' | 'preprod' = 'preprod',
  collectionName?: string,
  quantity: number = 1
): {
  baseFee: number;
  minUtxo: number;
  transactionFee: number;
  specialFee: number;
  bulkDiscount: number;
  total: number;
} => {
  const networkFees = getNFTMintingFees(network);
  const collectionFees = collectionName ? getCollectionFees(collectionName) : getCollectionFees('default');
  
  const baseFee = networkFees.baseFee.amount;
  const minUtxo = networkFees.minUtxo.amount;
  const transactionFee = networkFees.transactionFee.amount;
  const specialFee = collectionFees.specialFee.amount;
  
  const subtotal = (baseFee + minUtxo + transactionFee + specialFee) * quantity;
  const bulkDiscount = feeConfig.minting.bulkMinting.enabled ? 
    Math.floor(subtotal * getBulkDiscount(quantity) / 100) : 0;
  
  return {
    baseFee: baseFee * quantity,
    minUtxo: minUtxo * quantity,
    transactionFee: transactionFee * quantity,
    specialFee: specialFee * quantity,
    bulkDiscount,
    total: subtotal - bulkDiscount
  };
};