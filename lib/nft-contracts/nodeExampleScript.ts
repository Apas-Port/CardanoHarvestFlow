// NOTE: this is for node. this is why we pull in '@types/node'. if you don't use this, you can remove both
import { Asset, AssetMetadata, BlockfrostProvider, CreateMeshWalletOptions, mConStr0, MeshTxBuilder, resolveScriptHash, UTxO } from '@meshsdk/core';
import { MeshWallet } from '@meshsdk/core';
import * as Blockfrost from '@blockfrost/blockfrost-js';
import * as fs from  'fs/promises';
import * as readline from 'readline';
import { MeshPlutusNFTContract, WalletDisjunction } from './offchain';
import { OracleData, ParamUtxo } from './type';
import { bootProtocol, mintNft } from './protocol';

/* README
  * This script contains an example of using the offchain library, stored in offchain.ts, and the protocol library.
  * The offchain library contains a comprehensive list of all operations possible.
  * The protocol library wraps around it to make it even easier to perform common operations like booting the protocol, and minting an NFT.
  
  * This script contains an easy prompt for performing multiple functions. Please read the code around the promt.
  * The prompt is intended as a working demonstration of most of the functionality.
  * This is provided as the most effective form of documentation possible, as it is a working example.
  * It can also be used to boot new NFT protocols and issue NFT metadata as-is.
  * But you will likely want to change at least the metadata logic, to suit your needs.
  
  * Before you run this script, you should make sure you have enough change UTXOs in your wallet to pay for the transaction fees and collateral.
  * One easy way to split up your UTXOs is to repeatedly send a small amount of ADA to yourself, in your wallet of choice.
  * This is good practice for all transactions on Cardano, since Cardano is a UTXO-based blockchain, not an account-based blockchain.
  
  * To build this script, run npm install, and then npm run build.

  * This script uses aiken to compile Cardano smart contracts, as it has significantly higher performance than Plutus GHC.
  * Aiken builds a javascript file in the aiken directory, which is automatically imported.
  * It is checked into version control, so you don't need to build the aiken code yourself.
  * If you edit the aiken code, please run aiken build in the aiken directory, and aiken check to make sure the tests pass.
  
  * This script is dependent on a blockfrost API. You can get a free API key at https://blockfrost.io/.
  * Blockfrost is very useful, and contains a multitude of APIs for easily querying the Cardano blockchain.
  * If there is any general-purpose Cardano operation necessary in the future that is not covered by this code, it's likely that blockfrost has an API for it.
  
  * This script is dependent on several environment variables. Please see the environment.d.ts file for a list of required environment variables.
  * Note that all, except for PARAM_UTXO_PATH, are required.
  
  * To run this script, `node dist/index.cjs`
  
  * Running this script for the first time, without a PARAM_UTXO_PATH set, will boot the protocol.
  *   - If you do not provide PARAM_UTXO_PATH, the protocol will boot with a new one, and save it to disk as paramUtxo.json
  *   - Please immediately set PARAM_UTXO_PATH to the path of the saved paramUtxo.json file, so that you don't boot the protocol again.

  * Please note that any operation that uses the blockfrost API, is best performed on a backend API for your application.
  * That is not specific to this example, but rather a general recommendation, so that nobody abuses your API key.

  * If you get a weird error from blockfrost response like "PPViewHashesDontMatch":
  *   - It is because the hash of the transaction included in the transaction does not match the calculated hash of the transaction.
  *   - This is likely because the gas cost of the transactions was calculated wrong, due to outdated protocol parameters.
  *   -Make sure cost params are updated (Mesh currently hard codes this, so bump all the mesh dependencies).
  
  * If you wish to use Gacha feature, please do not mint with "m". A standard mint will hardcode the metadata.
  * Instead, mint with "m68" to mint a token with external metadata, and "m68meta" to mint said metadata.
  * 
  
  * In the browser, you would simply create a BrowserWallet object instead of a MeshWallet, to sign transactions. The offchain code is cross-compatible.
  * Please see how to do this on Mesh documentation, it is very straightforward: https://meshjs.dev/apis/wallets/browserwallet
*/


// blockfrost recommends calling their API (not mesh's fetcher, powered by blockfrost) in nodeJS
// as such, the following is given as a rough outline of how you might write a backend API to enumerate all holders of a given NFT collection
// this can be used to find all the holders who need to be paid upon maturation
export async function findAllHoldersExample(contractBakedWithCollectionNameAndParamUtxo: MeshPlutusNFTContract, api: Blockfrost.BlockFrostAPI): Promise<Map<string, string[]>> {
  console.log("Finding all holders of NFTs in the collection");
  const policyID = resolveScriptHash(contractBakedWithCollectionNameAndParamUtxo.getNFTCbor(), "V3");
  const collectionAssets = await contractBakedWithCollectionNameAndParamUtxo.fetcher?.fetchCollectionAssets(policyID);
  if (!collectionAssets) {
    throw new Error('Failed to fetch collection assets');
  }
  const assets = collectionAssets.assets;
  console.log("Assets: ", assets);
  // you may implement pagination however if so desired for very large collections, whether streaming or collected all at once
  const addresses = new Map<string, string[]>(); // map from assetID (policyID concatenated with assetName) to address

  for (const asset of assets) {
    //NOTE(Elaine): it's worth looking into the blockfrost API, it will allow you to see lots of information about your users
    // for instance, there's also an assetsTransactions method, which will fetch the transactions that an asset is locked in
    const addressesForAssetWithQuantity = await api.assetsAddresses(asset.unit);
    const addressesForAsset = addressesForAssetWithQuantity.map((address) => address.address);
    addresses.set(asset.unit, addressesForAsset);
  };

  const addressesToList = Array.from(addresses.values());
  console.log("All addresses: ", addressesToList);

  return addresses;

}

export const nodeExampleScript = async () => {
    console.log('BLOCKFROST_API_KEY: ', process.env.BLOCKFROST_API_KEY);
    const blockchainProvider = new BlockfrostProvider(process.env.BLOCKFROST_API_KEY);


    const blockFrostAPI = new Blockfrost.BlockFrostAPI({
      projectId: process.env.BLOCKFROST_API_KEY
    });

    const paymentMnemonic: string[] | undefined = process.env.PAYMENT_MNEMONIC?.split(" ");
    if (paymentMnemonic === undefined) {
      throw new Error("PAYMENT_MNEMONIC is undefined, but required.");
    }

    const paramUtxoPath = process.env.PARAM_UTXO_PATH;

    const meshWalletOptions : CreateMeshWalletOptions = {
    networkId: 0, // 0: testnet (preprod), 1: mainnet
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
        type: 'mnemonic',
        words: paymentMnemonic,
      }
    }

    console.log('meshWalletOptions: ', meshWalletOptions);

    const wallet = new MeshWallet(meshWalletOptions);


    const meshTxBuilder = new MeshTxBuilder({
        fetcher: blockchainProvider,
        submitter: blockchainProvider,
        verbose: true,
      });

    const collectionName = process.env.COLLECTION_NAME;
    if (collectionName === undefined) {
      throw new Error("COLLECTION_NAME is undefined, but required.");
    }

    console.log('paramUtxoPath: ', paramUtxoPath)
    // if we PARAM_UTXO_PATH is unset, then we boot the protocol
    // if it is set then we load the paramUtxo from the file
    // if it's set and the file doesn't exist, we crash
    if (!paramUtxoPath) {
      console.log("Booting protocol")
      const expectedAprNumeratorString = process.env.EXPECTED_APR_NUMERATOR;
      if (expectedAprNumeratorString === undefined) {
        throw new Error("EXPECTED_APR_NUMERATOR is undefined, but required.");
      }
      const expectedAprNumerator = parseInt(expectedAprNumeratorString);
      if (Number.isNaN(expectedAprNumerator)) {
        throw new Error("EXPECTED_APR_NUMERATOR parsed as NaN.");
      }

      const expectedAprDenominatorString = process.env.EXPECTED_APR_DENOMINATOR;
      if (expectedAprDenominatorString === undefined) {
        throw new Error("EXPECTED_APR_DENOMINATOR is undefined, but required.");
      }
      const expectedAprDenominator = parseInt(expectedAprDenominatorString);
      if (Number.isNaN(expectedAprDenominator)) {
        throw new Error("EXPECTED_APR_DENOMINATOR parsed as NaN.");
      }

      const expectedApr: [number, number] = [expectedAprNumerator, expectedAprDenominator]

      // bake the parameters into the contracts
      const contractBakedWithCollectionName = new MeshPlutusNFTContract(
        {
          mesh: meshTxBuilder,
          fetcher: blockchainProvider,
          wallet: wallet,
          networkId: 0,
        },
        {
          collectionName, // your nft collection name
        },
      );
      // 7 days as an example  
      const maturationTimeString = process.env.MATURATION_TIME;
      if (maturationTimeString === undefined) {
        throw new Error("MATURATION_TIME is undefined, but required.");
      }
      const maturationTime: bigint = BigInt(maturationTimeString);
      if (Number.isNaN(maturationTime)) {
        throw new Error("MATURATION_TIME parsed as NaN.");
      }

      const feeLovelaceString = process.env.FEE_PRICE_LOVELACE;
      if (feeLovelaceString === undefined) {
        throw new Error("FEE_PRICE_LOVELACE is undefined, but required.");
      }
      const feeLovelace: number = parseInt(feeLovelaceString);
      if (Number.isNaN(feeLovelace)) {
        throw new Error("FEE_PRICE_LOVELACE parsed as NaN.");
      }

      const maxMintsString = process.env.MAX_MINTS;
      if (maxMintsString === undefined) {
        throw new Error("MAX_MINTS is undefined, but required.");
      }
      const maxMints: bigint = BigInt(maxMintsString);
      if (Number.isNaN(maxMints)) {
        throw new Error("MAX_MINTS parsed as NaN.");
      }


      console.log("feeLovelace for boot: ", feeLovelace);
      console.log("expectedApr for boot: ", expectedApr);
      console.log("maturationTime for boot: ", maturationTime);
      console.log("maxMints for boot: ", maxMints);

      console.log("feeLovelace type: ", typeof feeLovelace);
      console.log("expectedApr type: ", typeof expectedApr);
      console.log("maturationTime type: ", typeof maturationTime);
      console.log("maxMints type: ", typeof maxMints);

      const { paramUtxo } = await bootProtocol(wallet, contractBakedWithCollectionName, feeLovelace, expectedApr, maturationTime, maxMints );
      await fs.writeFile('paramUtxo.json', JSON.stringify(paramUtxo));
      console.log("paramUtxo saved to disk. Don't forget to set PARAM_UTXO_PATH.");

    }

    const paramUtxo = JSON.parse(await fs.readFile('paramUtxo.json', {encoding: 'utf-8'}));
    console.log('paramUtxo loaded from disk: ', paramUtxo);

    // by now, everything should be initialized, and we can start minting NFTs
    // bake the parameters into the contracts
    const contractBakedWithCollectionNameAndParamUtxo = new MeshPlutusNFTContract(
      {
        mesh: meshTxBuilder,
        fetcher: blockchainProvider,
        wallet: wallet,
        networkId: 0,
      },
      {
        collectionName, // your nft collection name
        paramUtxo,
      },
    );

    console.log("q to quit, m to mint, m68 to mint token with external metadata (CIP-68), m68meta to mint said metadata, o to read oracle, l to list NFTs, lh to list holders, em to enable mint, dm to disable mint")
    console.log("Please note: attempting to mint twice in one session can lead to bugs with Mesh. Please quit after each mint.")
    process.stdin.setEncoding('utf8');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.on('line', async (line) => {
      if (line === 'q') {
        rl.close();
        return;
      } else if (line === 'm') {
        mintNft(wallet, contractBakedWithCollectionNameAndParamUtxo, ((oracleData): AssetMetadata => {
          return {
            ...metadataJson,
            name: `${metadataJson.name}${oracleData.nftIndex}`,
          }
        }), undefined, false);
      } else if (line === 'm68') {
        mintNft(wallet, contractBakedWithCollectionNameAndParamUtxo, (_x) => undefined, undefined, true);
      } else if (line === 'm68meta') {
        rl.question('Enter the reference NFT index. The NFT does not have to already be minted. CIP-68 does not allow for minting multiple reference NFTs, the behavior is unspecified. Please do not mint more than one reference NFT for a given index, and instead, spend it and create a new UTXO with updated metadata: ', (answer) => {
          // convert answer to integer
          const referenceNftIndex: number = parseInt(answer);
          if (isNaN(referenceNftIndex)) {
            console.log('Invalid reference NFT index');
            return;
          }

          mintNft(wallet, contractBakedWithCollectionNameAndParamUtxo, ((oracleData): AssetMetadata => {
            return {
              ...metadataJson,
              name: `${metadataJson.name}${oracleData.nftIndex}`,
            }
          }), referenceNftIndex);

        });
      } else if (line === 'o') {
        const oracleData = contractBakedWithCollectionNameAndParamUtxo.getOracleData();
        console.log('Oracle data: ', await oracleData);
      } else if (line === 'em') {
        // contractBakedWithCollectionNameAndParamUtxo.enableNFTMinting();
        contractBakedWithCollectionNameAndParamUtxo.setNFTMinting(true);
      } else if (line === 'dm') {
        // contractBakedWithCollectionNameAndParamUtxo.disableNFTMinting();
        contractBakedWithCollectionNameAndParamUtxo.setNFTMinting(false);
      } else if (line === 'l') {
        const nfts = await contractBakedWithCollectionNameAndParamUtxo.getAllPlutusNFTsAtAddress(wallet.getUsedAddress().toBech32());
        console.log('NFTs: ', JSON.stringify(nfts));
      } else if (line === 'lh') {
        const holders = await findAllHoldersExample(contractBakedWithCollectionNameAndParamUtxo, blockFrostAPI);
        console.log('Holders: ', holders)
        }
    });
}

if (require.main === module) {
    nodeExampleScript();
}
