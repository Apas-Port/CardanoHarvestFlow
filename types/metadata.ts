export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface HarvestFlowNFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
}

export const HARVEST_FLOW_METADATA: HarvestFlowNFTMetadata = {
  name: "HARVEST FLOW NFT",
  description: "HARVEST FLOWプロジェクトのNFTコレクション",
  image: "ipfs://QmRzicpReutwCkM6aotuKjErFCUD213DpwPq6ByuzMJaua",
  attributes: [
    {
      trait_type: "シリーズ",
      value: "Series 1"
    }
  ]
};