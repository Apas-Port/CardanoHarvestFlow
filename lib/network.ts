export type Coin = "ADA"

export const getCoinImage = (coin: Coin): string => {
  if (coin == "ADA") {
    return  "/images/common/cardano-icon.png";
  }
  return ""
}

export type Network = "Cardano" | "Preprod"

export const getExploreUrl = (network: Network): string => {
  if (network == "Cardano") {
    return  'https://cardanoscan.io/'
  }
  if (network == "Preprod") {
    return  'https://preprod.cexplorer.io/'
  }
  return ""
}

export const getNetworkImage = (network: Network): string => {
  if (network == "Cardano") {
    return  '/images/common/cardano-icon.png';
  }
  if (network == "Preprod") {
    return  '/images/common/cardano-icon.png';
  }
  return ""
}
