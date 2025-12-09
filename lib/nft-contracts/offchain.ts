// ====================================
// common

import {
    BrowserWallet,
    IFetcher,
    LanguageVersion,
    MeshTxBuilder,
    MeshWallet,
    serializePlutusScript,
    UTxO,
  } from "@meshsdk/core";
  
  export type WalletDisjunction = BrowserWallet | MeshWallet;

  export type MeshTxInitiatorInput = {
    mesh: MeshTxBuilder;
    fetcher?: IFetcher;
    wallet?: WalletDisjunction;
    networkId?: number;
    stakeCredential?: string;
    version?: number;
  };
  
  export class MeshTxInitiator {
    mesh: MeshTxBuilder;
    fetcher?: IFetcher;
    wallet?: WalletDisjunction;
    stakeCredential?: string;
    networkId = 0;
    version = 2;
    languageVersion: LanguageVersion = "V2";
  
    constructor({
      mesh,
      fetcher,
      wallet,
      networkId = 0,
      stakeCredential = "c08f0294ead5ab7ae0ce5471dd487007919297ba95230af22f25e575",
      version = 2,
    }: MeshTxInitiatorInput) {
      this.mesh = mesh;
      if (fetcher) {
        this.fetcher = fetcher;
      }
      if (wallet) {
        this.wallet = wallet;
      }
  
      this.networkId = networkId;
      switch (this.networkId) {
        case 1:
          this.mesh.setNetwork("mainnet");
          break;
        default:
          this.mesh.setNetwork("preprod");
      }
  
      this.version = version;
      switch (this.version) {
        case 1:
          this.languageVersion = "V2";
          break;
        default:
          this.languageVersion = "V3";
      }
  
      if (stakeCredential) {
        this.stakeCredential = stakeCredential;
      }
    }
  
    getScriptAddress = (scriptCbor: string) => {
      const { address } = serializePlutusScript(
        { code: scriptCbor, version: this.languageVersion },
        this.stakeCredential,
        this.networkId,
      );
      return address;
    };
  
    protected signSubmitReset = async () => {
      const signedTx = this.mesh.completeSigning();
      const txHash = await this.mesh.submitTx(signedTx);
      this.mesh.reset();
      return txHash;
    };
  
    protected queryUtxos = async (walletAddress: string): Promise<UTxO[]> => {
      if (this.fetcher) {
        const utxos = await this.fetcher.fetchAddressUTxOs(walletAddress);
        return utxos;
      }
      return [];
    };
  
    protected getWalletDappAddress = async () => {
      if (this.wallet) {
        const usedAddresses = await this.wallet.getUsedAddresses();
        if (usedAddresses.length > 0) {
          return usedAddresses[0];
        }
        const unusedAddresses = await this.wallet.getUnusedAddresses();
        if (unusedAddresses.length > 0) {
          return unusedAddresses[0];
        }
      }
      return "";
    };
  
    protected getWalletCollateral = async (): Promise<UTxO | undefined> => {
      if (this.wallet) {
        const utxos = await this.wallet.getCollateral();
        return utxos[0];
      }
      return undefined;
    };

    protected waitForCollateral = async (wallet: MeshWallet, attempts = 10, delayMs = 3_000): Promise<boolean> => {
      for (let i = 0; i < attempts; i += 1) {
        try {
          const collateral = await wallet.getCollateral();
          if (collateral && collateral.length > 0) {
            return true;
          }
        } catch (error) {
          console.warn('[MeshPlutusNFTContract] Failed to query collateral while waiting', error);
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      return false;
    };
  
    protected getWalletUtxosWithMinLovelace = async (
      lovelace: number,
      providedUtxos: UTxO[] = [],
    ) => {
      let utxos: UTxO[] = providedUtxos;
      if (this.wallet && (!providedUtxos || providedUtxos.length === 0)) {
        utxos = await this.wallet.getUtxos();
      }
      return utxos.filter((u) => {
        const lovelaceAmount = u.output.amount.find(
          (a: any) => a.unit === "lovelace",
        )?.quantity;
        return Number(lovelaceAmount) > lovelace;
      });
    };
  
    protected getWalletUtxosWithToken = async (
      assetHex: string,
      userUtxos: UTxO[] = [],
    ) => {
      let utxos: UTxO[] = userUtxos;
      if (this.wallet && userUtxos.length === 0) {
        utxos = await this.wallet.getUtxos();
      }
      return utxos.filter((u) => {
        const assetAmount = u.output.amount.find(
          (a: any) => a.unit === assetHex,
        )?.quantity;
        return Number(assetAmount) >= 1;
      });
    };
  
    protected getAddressUtxosWithMinLovelace = async (
      walletAddress: string,
      lovelace: number,
      providedUtxos: UTxO[] = [],
    ) => {
      let utxos: UTxO[] = providedUtxos;
      if (this.fetcher && (!providedUtxos || providedUtxos.length === 0)) {
        utxos = await this.fetcher.fetchAddressUTxOs(walletAddress);
      }
      return utxos.filter((u) => {
        const lovelaceAmount = u.output.amount.find(
          (a: any) => a.unit === "lovelace",
        )?.quantity;
        return Number(lovelaceAmount) > lovelace;
      });
    };
  
    // This only checks policy ID, therefore, the rest of the assetID (aka the asset name) can vary
    protected getAddressUtxosWithPolicyID = async (
      walletAddress: string,
      policyHex: string,
      userUtxos: UTxO[] = [],
    ) => {
      let utxos: UTxO[] = userUtxos;
      if (this.fetcher && userUtxos.length === 0) {
        utxos = await this.fetcher.fetchAddressUTxOs(walletAddress);
      }

      return utxos.filter((u) => {
        const assetAmount = u.output.amount.find(
          (a) => a.unit.substring(0, 56) === policyHex,
        )?.quantity;
        return Number(assetAmount) >= 1;
      });
    };

    protected getAddressUtxosWithToken = async (
      walletAddress: string,
      assetHex: string,
      userUtxos: UTxO[] = [],
    ) => {
      let utxos: UTxO[] = userUtxos;
      if (this.fetcher && userUtxos.length === 0) {
        // Pass assetHex to fetcher if it's CustomBlockfrostFetcher to use asset-specific endpoint
        if (typeof (this.fetcher as any).fetchAddressUTxOs === 'function') {
          try {
            utxos = await (this.fetcher as any).fetchAddressUTxOs(walletAddress, assetHex);
          } catch (error) {
            // Fallback to fetching all UTxOs if asset-specific fetch fails
            console.warn('[getAddressUtxosWithToken] Asset-specific fetch failed, falling back to all UTxOs:', error);
            utxos = await (this.fetcher as any).fetchAddressUTxOs(walletAddress);
          }
        } else {
          utxos = await this.fetcher.fetchAddressUTxOs(walletAddress);
        }
      }
      // utxos.forEach(utxo => {
      //   utxo.output.amount.forEach(amount => {
      //     if (amount.unit != "lovelace" ){
      //     console.log("amount.unit", amount.unit);
      //     console.log("amount.quantity", amount.quantity);
      //     }
      //   });
      // });
      

      return utxos.filter((u) => {
        const assetAmount = u.output.amount.find(
          (a: any) => a.unit === assetHex,
        )?.quantity;
        return Number(assetAmount) >= 1;
      });
    };
  
    protected getWalletInfoForTx = async () => {
      const utxos = await this.wallet?.getUtxos();
      let collateral = await this.getWalletCollateral();
      const walletAddress = await this.getWalletDappAddress();
      if (!utxos || utxos?.length === 0) {
        throw new Error("No utxos found");
      }
      if (!collateral) {
        // Create collateral if it doesn't exist (only for MeshWallet)
        if (this.wallet && 'createCollateral' in this.wallet) {
          console.log("No collateral found. Creating collateral...");
          try {
            // Check wallet balance before creating collateral
            const walletUtxos = await this.wallet.getUtxos();
            if (!walletUtxos || walletUtxos.length === 0) {
              throw new Error("Cannot create collateral: Wallet has no UTxOs. Please add ADA to your wallet first.");
            }
            
            const txHash = await (this.wallet as MeshWallet).createCollateral();
            console.log(`Collateral transaction submitted: ${txHash}`);
            
            const collateralReady = await this.waitForCollateral(this.wallet as MeshWallet);
            if (!collateralReady) {
              throw new Error("Collateral creation transaction submitted but collateral UTxO not available yet. Try again once the transaction is confirmed.");
            }
            
            console.log("Collateral UTxO confirmed.");
            collateral = await this.getWalletCollateral();
            
            if (!collateral) {
              throw new Error("Collateral creation was submitted but UTxO not detected yet. Try again once the transaction is confirmed.");
            }
          } catch (error) {
            // If it's already our custom error, propagate it as-is
            if (error instanceof Error && (
              error.message.includes("Collateral creation") ||
              error.message.includes("Cannot create collateral") ||
              error.message.includes("not available yet")
            )) {
              throw error;
            }
            // For other errors (like transaction validation errors), provide more context
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorDetails = error instanceof Error && 'data' in error 
              ? JSON.stringify((error as any).data, null, 2) 
              : '';
            throw new Error(
              `Failed to create collateral: ${errorMessage}${errorDetails ? `\nDetails: ${errorDetails}` : ''}`
            );
          }
        } else {
          throw new Error("No collateral found. Please set up collateral in your wallet (Settings → Collateral) or use MeshWallet to auto-create it.");
        }
      }
      if (!walletAddress) {
        throw new Error("No wallet address found");
      }
      return { utxos, collateral, walletAddress };
    };
  
    protected _getUtxoByTxHash = async (
      txHash: string,
      scriptCbor?: string,
    ): Promise<UTxO | undefined> => {
      if (this.fetcher) {
        const utxos = await this.fetcher?.fetchUTxOs(txHash);
        let scriptUtxo = utxos[0];
  
        if (scriptCbor) {
          const scriptAddr = serializePlutusScript(
            { code: scriptCbor, version: this.languageVersion },
            this.stakeCredential,
            this.networkId,
          ).address;
          scriptUtxo =
            utxos.filter((utxo) => utxo.output.address === scriptAddr)[0] ||
            utxos[0];
        }
  
        return scriptUtxo;
      }
  
      return undefined;
    };
  }




// ====================================
//mesh offchain

import {
  Asset,
    AssetMetadata,
    bool,
    CIP68_100,
    CIP68_222,
    conStr0,
    Data,
    integer,
    mBool,
    mConStr,
    mConStr0,
    metadataToCip68,
    mOutputReference,
    mPubKeyAddress,
    stringToHex,
  } from "@meshsdk/common";
  import {
    deserializeAddress,
    resolveScriptHash,
    serializeAddressObj,
  } from "@meshsdk/core";
  import {
    applyCborEncoding,
    applyParamsToScript,
    parseDatumCbor,
  } from "@meshsdk/core-csl";
  
  import blueprint from "./aiken/plutus.json";
  import { mNftMintOrBurn, mOracleDatum, mOracleRedeemer, mRMintCip68, mRBulkMint, OracleData, oracleDatum, OracleDatum,} from "./type";

  export interface MintManyPlutusNFTRequest {
    metadata?: AssetMetadata;
    mint100TokenForIndex?: number;
    mint222Token?: boolean;
  }
  
  /**
   * Mesh Plutus NFT contract class
   * 
   * This NFT minting script enables users to mint NFTs with an automatically incremented index, which increases by one for each newly minted NFT. 
   * 
   * To facilitate this process, the first step is to set up a one-time minting policy by minting an oracle token. This oracle token is essential as it holds the current state and index of the NFTs, acting as a reference for the minting sequence. 
   * 
   * With each new NFT minted, the token index within the oracle is incremented by one, ensuring a consistent and orderly progression in the numbering of the NFTs.
   */
  // Helper function to extract value from Integer type
  function getIntegerValue(value: any): number | bigint {
    if (typeof value === 'object' && 'int' in value) {
      return value.int;
    }
    return value;
  }

  export class MeshPlutusNFTContract extends MeshTxInitiator {
    collectionName: string;
    paramUtxo: UTxO["input"] = { outputIndex: 0, txHash: "" };
    oracleAddress: string;
  
    getOracleCbor = () => {
      return applyCborEncoding(blueprint.validators[0]!.compiledCode);
    };
  
    getOracleNFTCbor = () => {
      console.log("getOracleNFTCbor called");
      console.log("this.paramUtxo");
      console.log(this.paramUtxo);
      console.log("this.paramUtxo.txHash", this.paramUtxo.txHash);
      console.log("this.paramUtxo.txHash.length", this.paramUtxo.txHash.length);
      const param = mOutputReference(this.paramUtxo.txHash, this.paramUtxo.outputIndex);
      const params = [
        param
      ]
      console.log("params", params);

      return applyParamsToScript(blueprint.validators[2]!.compiledCode, params);
    };
  
    getNFTCbor = () => {
      const oracleNftPolicyId = resolveScriptHash(this.getOracleNFTCbor(), "V3");
      return applyParamsToScript(blueprint.validators[4]!.compiledCode, [
        stringToHex(this.collectionName),
        oracleNftPolicyId,
      ]);
    };
  
    constructor(
      inputs: MeshTxInitiatorInput,
      contract: {
        collectionName: string;
        paramUtxo?: UTxO["input"];
      },
    ) {
      super(inputs);
      this.collectionName = contract.collectionName;
      if (contract.paramUtxo) {
        this.paramUtxo = contract.paramUtxo;
      }
      this.oracleAddress = serializePlutusScript(
        {
          code: applyCborEncoding(blueprint.validators[0]!.compiledCode),
          version: "V3",
        },
        inputs.stakeCredential,
        inputs.networkId,
      ).address;
    }
  
    /**
     * Set up a one-time minting policy by minting an oracle token. This oracle token is essential as it holds the current state and index of the NFTs, acting as a reference for the minting sequence.
     * @param lovelacePrice - Price of the NFT in lovelace
     * @returns - Transaction hex and paramUtxo
     *
     * @example
     * ```typescript
     * const { tx, paramUtxo } = await contract.setupOracle(lovelacePrice);
     * ```
     */
    setupOracle = async (lovelacePrice: number, expectedApr: [aprNumerator: number, aprDenominator: number], maturation_time: bigint, max_mints: bigint) => {
      const { utxos, collateral, walletAddress } =
        await this.getWalletInfoForTx();
      if (utxos?.length <= 0) {
        throw new Error("No UTxOs found");
      }
      const paramUtxo = utxos[0]!;
      const script = blueprint.validators[2]!.compiledCode;
      const param: Data = mOutputReference(
        paramUtxo.input.txHash,
        paramUtxo.input.outputIndex,
      );
      const paramScript = applyParamsToScript(script, [param]);
      const policyId = resolveScriptHash(paramScript, "V3");
      const tokenName = "";
      const { pubKeyHash, stakeCredentialHash } =
        deserializeAddress(walletAddress);
  
      const txHex = await this.mesh
        .txIn(
          paramUtxo.input.txHash,
          paramUtxo.input.outputIndex,
          paramUtxo.output.amount,
          paramUtxo.output.address,
        )
        .mintPlutusScriptV3()
        .mint("1", policyId, tokenName)
        .mintingScript(paramScript)
        .mintRedeemerValue(mConStr0([]))
        .txOut(this.oracleAddress, [{ unit: policyId, quantity: "1" }])
        .txOutInlineDatumValue(
          mOracleDatum(
            0,
            lovelacePrice,
            pubKeyHash,
            stakeCredentialHash,
            true,
            true,
            expectedApr[0],
            expectedApr[1],
            maturation_time,
            max_mints,
          ),
        )
        .txInCollateral(
          collateral.input.txHash,
          collateral.input.outputIndex,
          collateral.output.amount,
          collateral.output.address,
        )
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos)
        .complete();
  
      this.paramUtxo = paramUtxo.input;
  
      return { tx: txHex, paramUtxo: paramUtxo.input };
    };

    /**
     * Mint NFT token with an automatically incremented index, which increases by one for each newly minted NFT.
     * @param assetMetadata - Asset metadata
     * @returns - Transaction hex
     *
     * @example
     * ```typescript
     * const assetMetadata = {
     *  ...demoAssetMetadata,
     * name: `Mesh Token ${oracleData.nftIndex}`,
     * };
     * const tx = await contract.mintPlutusNFT(assetMetadata);
     * ```
     */
    mintPlutusNFT = async (assetMetadata?: AssetMetadata, mint100TokenForIndex?: number, mint222Token: boolean = true) => {
      const metadataIsPresent = assetMetadata !== undefined;
      const minting100Token = mint100TokenForIndex !== undefined;

      const { utxos, collateral, walletAddress } =
        await this.getWalletInfoForTx();
      if (utxos?.length <= 0) {
        throw new Error("No UTxOs found");
      }
  
      const {
        nftIndex,
        policyId,
        lovelacePrice,
        oracleUtxo,
        oracleNftPolicyId,
        feeCollectorAddress,
        feeCollectorAddressObj,
        nftMintAllowed,
        nftTradeAllowed,
        expectedAprNumerator,
        expectedAprDenominator,
        maturationTime,
        maxMints,
      } = await this.getOracleData();

      const maxMintsValue = Number(getIntegerValue(maxMints));
      if ((nftIndex as number) + 1 > maxMintsValue) {
        throw new Error("Max mints reached, mint transaction would have failed");
      }

      const cip68ScriptAddress = feeCollectorAddress
      const baseTokenName = `${this.collectionName} (${mint100TokenForIndex ?? nftIndex})`;
      const baseTokenNameHex = stringToHex(baseTokenName);

      const updatedOracleDatum: OracleDatum =
        oracleDatum(
            { count: (nftIndex as number) + 1,
              lovelace_price: lovelacePrice,
              fee_address: feeCollectorAddressObj,
              nft_mint_allowed: nftMintAllowed,
              nft_trade_allowed: nftTradeAllowed,
              expected_apr_numerator: getIntegerValue(expectedAprNumerator),
              expected_apr_denominator: getIntegerValue(expectedAprDenominator),
              maturation_time: getIntegerValue(maturationTime) as bigint,
              max_mints: getIntegerValue(maxMints) as bigint
            });
  
      const tx = this.mesh;
      if (mint100TokenForIndex) {
        const _ = 
        tx
          .readOnlyTxInReference(
            oracleUtxo.input.txHash,
            oracleUtxo.input.outputIndex,
            // oracleUtxo.output.amount,
            // oracleUtxo.output.address,
          )
      } else{
        const _ = tx
          .spendingPlutusScriptV3()
          .txIn(
            oracleUtxo.input.txHash,
            oracleUtxo.input.outputIndex,
            oracleUtxo.output.amount,
            oracleUtxo.output.address,
          )
          .txInRedeemerValue(mConStr0([]))
          .txInScript(this.getOracleCbor())
          .txInInlineDatumPresent()
          .txOut(this.oracleAddress, [{ unit: oracleNftPolicyId, quantity: "1" }])
          .txOutInlineDatumValue(updatedOracleDatum, "JSON")

      }

      if (!minting100Token) {
        // pay the fee necessary to mint
        tx.txOut(feeCollectorAddress, [
          { unit: "lovelace", quantity: lovelacePrice.toString() },
        ])

        // then we're minting either a regular nft or a 222 matching "real token" to a 100 "reference" token
        const regularOr222TokenNameHex = mint222Token ? CIP68_222(baseTokenNameHex) : baseTokenNameHex;

        tx
          .mintPlutusScriptV3()
          .mint("1", policyId, regularOr222TokenNameHex)
          .mintingScript(this.getNFTCbor())
          .mintRedeemerValue(mNftMintOrBurn("RMint"))
          // .mintRedeemerValue(mNftMintPolarityRedeemer("RMintCip68"))

        if (metadataIsPresent && !mint222Token) {
          const metadata = { [policyId]: { [baseTokenName]: { ...assetMetadata } } };
          tx.metadataValue("721", metadata);
        }
      }

      if (minting100Token && metadataIsPresent) {
        const referenceTokenNameHex = CIP68_100(baseTokenNameHex);
        tx
          .mintPlutusScriptV3()
          .mint("1", policyId, referenceTokenNameHex)
          .mintingScript(this.getNFTCbor())
          .mintRedeemerValue(mRMintCip68(mint100TokenForIndex))
          // .mintRedeemerValue(mNftMintPolarityRedeemer("RMintCip68"))
          .txOut(cip68ScriptAddress, [{ unit: policyId + referenceTokenNameHex, quantity: "1"}])
          .txOutInlineDatumValue(metadataToCip68(assetMetadata), "Mesh");
      }



      tx
        .txInCollateral(
          collateral.input.txHash,
          collateral.input.outputIndex,
          collateral.output.amount,
          collateral.output.address,
        )
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos);

      const txHex = await tx.complete();
      console.log("Built tx to mint nft");//FIXME(Elaine): remove this

      return txHex;
    };

    /**
     * Helper to mint multiple NFTs sequentially. Each request is processed using mintPlutusNFT,
     * ensuring the oracle datum is updated between transactions.
     * The function returns the transaction hexes in order. Execution stops on first failure.
     */
    mintManyPlutusNFT = async (requests: MintManyPlutusNFTRequest[]): Promise<string[]> => {
      if (!Array.isArray(requests) || requests.length === 0) {
        throw new Error('mintManyPlutusNFT requires at least one request');
      }

      const results: string[] = [];

      for (let index = 0; index < requests.length; index += 1) {
        const request = requests[index] ?? {};

        try {
          const txHex = await this.mintPlutusNFT(
            request.metadata,
            request.mint100TokenForIndex,
            request.mint222Token ?? true,
          );

          results.push(txHex);
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`[mintManyPlutusNFT] Request ${index} failed: ${error.message}`);
          }
          throw new Error(`[mintManyPlutusNFT] Request ${index} failed: ${String(error)}`);
        }
      }

      return results;
    };

    /**
     * Mint multiple NFTs in a single transaction using bulk minting.
     * This is more efficient than sequential minting as it requires only one transaction.
     * @param quantity - Number of NFTs to mint
     * @param metadataList - Optional array of metadata for each NFT
     * @returns - Transaction hex
     */
    mintBulkPlutusNFT = async (quantity: number, metadataList?: AssetMetadata[]): Promise<string> => {
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      const { utxos, collateral, walletAddress } = await this.getWalletInfoForTx();
      if (utxos?.length <= 0) {
        throw new Error("No UTxOs found");
      }

      const {
        nftIndex,
        policyId,
        lovelacePrice,
        oracleUtxo,
        oracleNftPolicyId,
        feeCollectorAddress,
        feeCollectorAddressObj,
        nftMintAllowed,
        nftTradeAllowed,
        expectedAprNumerator,
        expectedAprDenominator,
        maturationTime,
        maxMints,
      } = await this.getOracleData();

      // Check if bulk mint would exceed max mints
      const maxMintsValue = Number(getIntegerValue(maxMints));
      if ((nftIndex as number) + quantity > maxMintsValue) {
        throw new Error(`Bulk mint would exceed max mints. Current: ${nftIndex}, Requested: ${quantity}, Max: ${maxMintsValue}`);
      }

      // Check if minting is allowed (handle different Bool formats)
      let mintingAllowedFlag = false;
      if (typeof nftMintAllowed === 'boolean') {
        mintingAllowedFlag = nftMintAllowed;
      } else if (nftMintAllowed && typeof nftMintAllowed === 'object') {
        mintingAllowedFlag = (nftMintAllowed as any).bool === true;
      }
      
      if (!mintingAllowedFlag) {
        throw new Error("NFT minting is not allowed");
      }

      // Update oracle datum with new count
      const updatedOracleDatum: OracleDatum = oracleDatum({
        count: (nftIndex as number) + quantity,
        lovelace_price: lovelacePrice,
        fee_address: feeCollectorAddressObj,
        nft_mint_allowed: nftMintAllowed,
        nft_trade_allowed: nftTradeAllowed,
        expected_apr_numerator: expectedAprNumerator.int,
        expected_apr_denominator: expectedAprDenominator.int,
        maturation_time: maturationTime.int as bigint,
        max_mints: maxMints.int as bigint
      });

      const tx = this.mesh
        .spendingPlutusScriptV3()
        .txIn(
          oracleUtxo.input.txHash,
          oracleUtxo.input.outputIndex,
          oracleUtxo.output.amount,
          oracleUtxo.output.address,
        )
        .txInRedeemerValue(mOracleRedeemer("BulkMintPlutusNFT", quantity))
        .txInScript(this.getOracleCbor())
        .txInInlineDatumPresent()
        .txOut(this.oracleAddress, [{ unit: oracleNftPolicyId, quantity: "1" }])
        .txOutInlineDatumValue(updatedOracleDatum, "JSON");

      // Pay the total fee for all NFTs
      const lovelacePriceValue = BigInt(getIntegerValue(lovelacePrice));
      const totalFee = lovelacePriceValue * BigInt(quantity);
      tx.txOut(feeCollectorAddress, [
        { unit: "lovelace", quantity: totalFee.toString() },
      ]);

      // Mint all NFTs
      for (let i = 0; i < quantity; i++) {
        const currentIndex = (nftIndex as number) + i;
        const tokenName = `${this.collectionName} (${currentIndex})`;
        const tokenNameHex = stringToHex(tokenName);

        tx
          .mintPlutusScriptV3()
          .mint("1", policyId, tokenNameHex)
          .mintingScript(this.getNFTCbor())
          .mintRedeemerValue(mRBulkMint(quantity)); // RBulkMint with quantity

        // Add metadata if provided
        if (metadataList && metadataList[i]) {
          const metadata = { 
            [policyId]: { 
              [tokenName]: { ...metadataList[i] } 
            } 
          };
          tx.metadataValue("721", metadata);
        }
      }

      tx
        .txInCollateral(
          collateral.input.txHash,
          collateral.input.outputIndex,
          collateral.output.amount,
          collateral.output.address,
        )
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos);

      const txHex = await tx.complete();
      console.log("Built bulk mint transaction for", quantity, "NFTs");

      return txHex;
    };


    setNFTMinting = async (onOrOff: boolean): Promise<string> => {
      const { utxos, collateral, walletAddress } =
      await this.getWalletInfoForTx();
      if (utxos?.length <= 0) {
        throw new Error("No UTxOs found");
      }

      const {
        nftIndex,
        policyId,
        lovelacePrice,
        oracleUtxo,
        oracleNftPolicyId,
        feeCollectorAddress,
        feeCollectorAddressObj,
        nftMintAllowed,
        nftTradeAllowed,
        expectedAprNumerator,
        expectedAprDenominator,
        maturationTime,
        maxMints,
      } = await this.getOracleData();

      const updatedOracleDatum: OracleDatum =
        oracleDatum(
            { count: nftIndex as number,
              lovelace_price: lovelacePrice,
              fee_address: feeCollectorAddressObj,
              nft_mint_allowed: bool(onOrOff),
              nft_trade_allowed: nftTradeAllowed,
              expected_apr_numerator: getIntegerValue(expectedAprNumerator),
              expected_apr_denominator: getIntegerValue(expectedAprDenominator),
              maturation_time: getIntegerValue(maturationTime) as bigint,
              max_mints: getIntegerValue(maxMints) as bigint
            });

      // Extract lovelace from oracleUtxo.output.amount to preserve it in the output
      const oracleLovelace = oracleUtxo.output.amount.find(
        (asset: { unit: string; quantity: string }) => asset.unit === "lovelace"
      );
      
      const oracleOutputAmount = [{ unit: oracleNftPolicyId, quantity: "1" }];
      if (oracleLovelace) {
        oracleOutputAmount.push(oracleLovelace);
      }

      const tx = this.mesh
        .spendingPlutusScriptV3()
        .requiredSignerHash(deserializeAddress(feeCollectorAddress).pubKeyHash)
        .txIn(
          oracleUtxo.input.txHash,
          oracleUtxo.input.outputIndex,
          oracleUtxo.output.amount,
          oracleUtxo.output.address,
        )
        .txInRedeemerValue(mOracleRedeemer(onOrOff ? "EnableNFTMinting" : "DisableNFTMinting"))
        .txInScript(this.getOracleCbor())
        .txInInlineDatumPresent()
        .txOut(this.oracleAddress, oracleOutputAmount)
        .txOutInlineDatumValue(updatedOracleDatum, "JSON")

      tx
        .txInCollateral(
          collateral.input.txHash,
          collateral.input.outputIndex,
          collateral.output.amount,
          collateral.output.address,
        )
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos);

      console.log("Built tx to toggle minting circuit-breaker");//FIXME(Elaine): remove this

      const txHex = await tx.complete();
      return txHex;
    };

    setNFTTrading = async (onOrOff: boolean): Promise<string> => {
      const { utxos, collateral, walletAddress } =
      await this.getWalletInfoForTx();
      if (utxos?.length <= 0) {
        throw new Error("No UTxOs found");
      }

      console.log("Building tx to toggle trading circuit-breaker");//FIXME(Elaine): remove this

      const {
        nftIndex,
        policyId,
        lovelacePrice,
        oracleUtxo,
        oracleNftPolicyId,
        feeCollectorAddress,
        feeCollectorAddressObj,
        nftMintAllowed,
        nftTradeAllowed,
        expectedAprNumerator,
        expectedAprDenominator,
        maturationTime,
        maxMints,
      } = await this.getOracleData();

      console.log("Got oracle UTXO for toggling trading: ", oracleUtxo);//FIXME(Elaine): remove this

      const updatedOracleDatum: OracleDatum =
        oracleDatum(
            { count: nftIndex as number,
              lovelace_price: lovelacePrice,
              fee_address: feeCollectorAddressObj,
              nft_mint_allowed: nftMintAllowed,
              nft_trade_allowed: bool(onOrOff),
              expected_apr_numerator: getIntegerValue(expectedAprNumerator),
              expected_apr_denominator: getIntegerValue(expectedAprDenominator),
              maturation_time: getIntegerValue(maturationTime) as bigint,
              max_mints: getIntegerValue(maxMints) as bigint
            });

      // Extract lovelace from oracleUtxo.output.amount to preserve it in the output
      const oracleLovelace = oracleUtxo.output.amount.find(
        (asset: { unit: string; quantity: string }) => asset.unit === "lovelace"
      );
      
      const oracleOutputAmount = [{ unit: oracleNftPolicyId, quantity: "1" }];
      if (oracleLovelace) {
        oracleOutputAmount.push(oracleLovelace);
      }

      const tx = this.mesh
        .spendingPlutusScriptV3()
        .requiredSignerHash(deserializeAddress(feeCollectorAddress).pubKeyHash)
        .txIn(
          oracleUtxo.input.txHash,
          oracleUtxo.input.outputIndex,
          oracleUtxo.output.amount,
          oracleUtxo.output.address,
        )
        .txInRedeemerValue(mOracleRedeemer(onOrOff ? "EnableNFTTrading" : "DisableNFTTrading"))
        .txInScript(this.getOracleCbor())
        .txInInlineDatumPresent()
        .txOut(this.oracleAddress, oracleOutputAmount)
        .txOutInlineDatumValue(updatedOracleDatum, "JSON")

      tx
        .txInCollateral(
          collateral.input.txHash,
          collateral.input.outputIndex,
          collateral.output.amount,
          collateral.output.address,
        )
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos);

      console.log("Built tx to toggle trading circuit-breaker");//FIXME(Elaine): remove this
      console.log("toggle trading circuit breaker tx: ", JSON.stringify(tx));//FIXME(Elaine): remove this

      const txHex = await tx.complete();
      return txHex;
      
    }

    getAllPlutusNFTUTxOsAtAddress = async (walletAddress: string): Promise<UTxO[]> => {
      return await this.getAddressUtxosWithPolicyID(
        walletAddress,
        resolveScriptHash(this.getNFTCbor(), "V3"),
      );
    };

    // Given an address, this will return all the NFTs of this series at that address, in the form of a triple which is UTxO info, assetID, and the metadata
    getAllPlutusNFTsAtAddress = async (walletAddress: string): Promise<{ [key: string]: { utxo: UTxO; assetID: string; assetMetadata: AssetMetadata; }; }> => {
      console.log("getAllPlutusNFTsAtAddress called");//FIXME(Elaine): remove this
      const utxos = await this.getAllPlutusNFTUTxOsAtAddress(walletAddress);
      // console.log("getAllPlutusNFTsAtAddress called, utxos: ", utxos)

      const utxoMetadataBreakdown: {[key:string] : {utxo: UTxO, assetID: string, assetMetadata: AssetMetadata}} = {};

      for (const utxo of utxos) {
        const assetIDsToQuery = utxo.output.amount.filter((a) => a.unit !== "lovelace").map((a) => a.unit);

        for (const assetID of assetIDsToQuery) {
          const assetMetadata: AssetMetadata = await this.fetcher?.fetchAssetMetadata(assetID);
          utxoMetadataBreakdown[utxo.output.address] = {
            utxo: utxo,
            assetID: assetID,
            assetMetadata: assetMetadata,
          };
        }
      };

      return utxoMetadataBreakdown;
      };

    /**
     * Get the current oracle data.
     *
     * @returns - Oracle data
     *
     * @example
     * ```typescript
     * const oracleData = await contract.getOracleData();
     * ```
     */
    getOracleData = async (): Promise<OracleData> => {
      const oracleNftPolicyId = resolveScriptHash(this.getOracleNFTCbor(), "V3");
      const utxos = await this.getAddressUtxosWithToken(this.oracleAddress, oracleNftPolicyId);
      
      if (!utxos || utxos.length === 0) {
        throw new Error(
          `Oracle UTxO not found at address ${this.oracleAddress} with policy ID ${oracleNftPolicyId}. ` +
          `The oracle might not be initialized for this project.`
        );
      }
      
      const oracleUtxo = utxos[0];
      if (!oracleUtxo || !oracleUtxo.output || !oracleUtxo.output.plutusData) {
        throw new Error(
          `Oracle UTxO found but missing required data at address ${this.oracleAddress}. ` +
          `The oracle might be corrupted or not properly initialized.`
        );
      }
      
      const oracleDatum: OracleDatum = parseDatumCbor(
        oracleUtxo.output.plutusData,
      );
  
      const nftIndex = oracleDatum.fields[0].int;
      const lovelacePrice = oracleDatum.fields[1].int;

      const feeCollectorAddressObj = oracleDatum.fields[2];
      const feeCollectorAddress = serializeAddressObj(
        feeCollectorAddressObj,
        this.networkId,
      );

      const nftMintAllowed = oracleDatum.fields[3];
      const nftTradeAllowed = oracleDatum.fields[4];

      const expectedAprNumerator = oracleDatum.fields[5];
      const expectedAprDenominator = oracleDatum.fields[6];

      const maturationTime = oracleDatum.fields[7];
      const maxMints = oracleDatum.fields[8];
  
      const policyId = resolveScriptHash(this.getNFTCbor(), "V3");

      const returnObj = {
        nftIndex,
        policyId,
        lovelacePrice,
        oracleUtxo,
        oracleNftPolicyId,
        feeCollectorAddress,
        feeCollectorAddressObj,
        nftMintAllowed,
        nftTradeAllowed,
        expectedAprNumerator,
        expectedAprDenominator,
        maturationTime,
        maxMints,
      };
  
      return returnObj;
    };
  
    getUtxoByTxHash = async (txHash: string): Promise<UTxO | undefined> => {
      return await this._getUtxoByTxHash(txHash);
    };
  }
