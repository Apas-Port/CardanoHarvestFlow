import { AssetMetadata, BlockfrostProvider, mConStr0, MeshTxBuilder } from '@meshsdk/core';
import { MeshWallet } from '@meshsdk/core';
import { MeshPlutusNFTContract, WalletDisjunction } from './offchain';
import { OracleData, ParamUtxo } from './type';

export const bootProtocol = async (wallet: WalletDisjunction, contractBakedWithCollectionName: MeshPlutusNFTContract, lovelacePrice: number, expectedApr: [number, number], maturationTime: bigint, maxMints: bigint): Promise<{ paramUtxo: ParamUtxo; }> => {
    const { tx: oracleTx, paramUtxo } = await contractBakedWithCollectionName.setupOracle(lovelacePrice, expectedApr, maturationTime, maxMints); // price in lovelace
    console.log('tx to be submitted: ', oracleTx);
    console.log('associated paramUtxo: ', paramUtxo);

    try {
      console.log("Submitting oracle/settings UTXO setup transaction");
      const signedTx = await wallet.signTx(oracleTx);
      const oracleTxHash = await wallet.submitTx(signedTx);
      console.log('Submitted oracle mint tx hash: ', oracleTxHash);
    } catch (err){
      console.log("Oracle/settings UTXO setup transaction submission failed. Error: ", err);
    }

    return {
        paramUtxo
    };
}
// paramUtxo MUST be saved in order to mint NFTs in the future

export async function getOracleData(contractBakedWithCollectionNameAndParamUtxo: MeshPlutusNFTContract): Promise<OracleData> {
  const oracleData = await contractBakedWithCollectionNameAndParamUtxo.getOracleData();
  console.log('Oracle data: ', oracleData);

  return oracleData;
}

export const mintNft = async (wallet: WalletDisjunction, contractBakedWithCollectionNameAndParamUtxo: MeshPlutusNFTContract, generateNftMetadata: ((x: OracleData) => AssetMetadata | undefined), mintCip68TokenForIndex?: number, mint222Token: boolean = true): Promise<string | undefined> => {
  console.log('Minting NFT');

  const oracleData = await contractBakedWithCollectionNameAndParamUtxo.getOracleData();

  const assetMetadata: AssetMetadata = generateNftMetadata(oracleData);

  try {
    const tx = await contractBakedWithCollectionNameAndParamUtxo.mintPlutusNFT(assetMetadata, mintCip68TokenForIndex, mint222Token);
    console.log('NFT mint tx to be submitted: ', tx);
    const signedTx = await wallet.signTx(tx);
    const txHash = await wallet.submitTx(signedTx);
    console.log('Submitted nft mint tx hash: ', txHash);
    return txHash;
  } catch (err){
    console.log("Transaction submission failed. Error: ", err);
  }
}