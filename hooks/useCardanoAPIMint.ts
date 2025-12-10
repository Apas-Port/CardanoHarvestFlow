import { useState, useCallback } from 'react';
import { useWallet } from '@meshsdk/react';
import { BrowserWallet, MeshTxBuilder, Transaction } from '@meshsdk/core';
import { mConStr0, stringToHex, integer } from '@meshsdk/common';
import { Project } from '@/lib/project';
import { getClientNetworkConfig } from '@/lib/network-config';
import { oracleDatum, mNftMintOrBurn, mOracleRedeemer } from '@/lib/nft-contracts/type';
import { mRBulkMint } from '@/lib/nft-contracts/type';
import { ProxiedBlockfrostProvider } from '@/lib/proxied-blockfrost-provider';
import { appendDevQuery } from '@/lib/dev-mode';

export interface APIMintStatus {
  status: 'idle' | 'preparing' | 'signing' | 'submitting' | 'confirming' | 'success' | 'error' | 'warning';
  txHash?: string;
  error?: string;
  warning?: string;
  tokenIds?: number[];
}

export interface MintResult {
  txHash: string;
  tokenIds: number[];
  policyId: string;
  mintLovelace?: number;
  txHashes?: string[];
  totalLovelace?: number;
}

export function useCardanoAPIMint() {
  const { connected, name: walletName } = useWallet();
  const [mintStatus, setMintStatus] = useState<APIMintStatus>({ status: 'idle' });
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper function to record token event with retry logic
  const recordTokenEventWithRetry = useCallback(async (
    walletAddress: string,
    projectId: string,
    tokenIds: string[],
    amount: number,
    txHash: string,
    maxRetries = 3
  ): Promise<void> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(appendDevQuery('/api/token-event'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            projectId,
            tokenIds,
            amount,
            event: 'mint',
            txHash,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Token event API returned ${response.status}`);
        }
        
        const data = await response.json();
        if (data.message === 'Token event recorded successfully') {
          console.log('Token mint event recorded successfully');
          return; // 成功
        }
        
        throw new Error('Token event API returned unsuccessful response');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Token event recording attempt ${attempt + 1} failed:`, lastError);
        
        if (attempt < maxRetries - 1) {
          // 指数バックオフ: 1秒、2秒、4秒
          const delayMs = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    // すべてのリトライが失敗した場合
    throw new Error(`Failed to record token event after ${maxRetries} attempts: ${lastError?.message}`);
  }, []);

  const mintProjectNFT = useCallback(async (
    project: Project,
    quantity: number = 1
  ): Promise<MintResult | undefined> => {
    if (!connected || !walletName) {
      setMintStatus({
        status: 'error',
        error: 'Please connect your wallet first'
      });
      throw new Error('Wallet not connected');
    }

    const totalMints = Math.max(1, Number.isFinite(quantity) ? Number(quantity) : 1);

   const executeSingleMint = async (): Promise<MintResult> => {
      setMintStatus({ status: 'preparing' });
      let lastDisplayMintAda = project.unitPrice;

      const waitForOracleUpdate = async (expectedIndex: number, timeoutMs = 120_000, intervalMs = 4_000) => {
        const start = Date.now();
        let lastError: any = null;

        while (Date.now() - start < timeoutMs) {
          try {
            const statusResponse = await fetch(appendDevQuery(`/api/cardano/status?projectId=${project.id}`));
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              const currentIndexCandidate = Number(statusData?.currentTokenId ?? statusData?.mintedCount ?? 0);
              if (Number.isFinite(currentIndexCandidate) && currentIndexCandidate >= expectedIndex) {
                return true;
              }
            }
          } catch (pollError) {
            console.warn('[useCardanoAPIMint] Failed to poll oracle status, retrying...', pollError);
            lastError = pollError;
          }

          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        console.warn(`[useCardanoAPIMint] Oracle update timed out after ${timeoutMs}ms, but transaction may have succeeded`);
        return false;
      };

      try {
        const wallet = await BrowserWallet.enable(walletName);
        const recipientAddress = await wallet.getChangeAddress();

        const prepareResponse = await fetch(appendDevQuery('/api/cardano/mint'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            quantity: 1,
            recipientAddress,
          })
        });

        if (!prepareResponse.ok) {
          const error = await prepareResponse.json();
          throw new Error(error.error || 'Failed to fetch mint data');
        }

        const mintData = await prepareResponse.json();

        if (!mintData.success) {
          throw new Error(mintData.error || 'Mint API returned an unsuccessful response');
        }

        const tokenId = Number(mintData.tokenId);
        const policyId: string = mintData.policyId;
        const lovelacePrice: number = mintData.lovelacePrice;
        const feeCollectorAddress: string = mintData.feeCollectorAddress;
        const collectionName: string = mintData.collectionName;
        const oracleData = mintData.oracleData;
        const scripts = mintData.scripts;
        const tokenMetadata = mintData.tokenMetadata;

        const utxos = await wallet.getUtxos();
        const collateralUtxos = await wallet.getCollateral();

        if (!utxos || utxos.length === 0) {
          throw new Error('No UTxOs found in wallet. Please add ADA to your wallet.');
        }

        if (!collateralUtxos || collateralUtxos.length === 0) {
          throw new Error('No collateral found in wallet. Please set up collateral in your wallet (Settings → Collateral).');
        }

        const collateral = collateralUtxos[0];

        const config = getClientNetworkConfig();
        const networkId: 0 | 1 = config.isMainnet ? 1 : 0;
        const proxiedProvider = new ProxiedBlockfrostProvider(networkId);

        const tx = new MeshTxBuilder({
          fetcher: proxiedProvider,
          submitter: proxiedProvider,
          evaluator: proxiedProvider,
        });

        const tokenName = `${collectionName} (${tokenId})`;
        const tokenNameHex = stringToHex(tokenName);

        const updatedOracleDatum = oracleDatum({
          count: Number(oracleData.nftIndex) + 1,
          lovelace_price: lovelacePrice,
          fee_address: oracleData.feeCollectorAddressObj,
          nft_mint_allowed: oracleData.nftMintAllowed,
          nft_trade_allowed: oracleData.nftTradeAllowed,
          expected_apr_numerator: Number(oracleData.expectedAprNumerator),
          expected_apr_denominator: Number(oracleData.expectedAprDenominator),
          maturation_time: BigInt(oracleData.maturationTime),
          max_mints: BigInt(oracleData.maxMints),
        });

        tx.spendingPlutusScriptV3()
          .txIn(
            oracleData.oracleUtxo.input.txHash,
            oracleData.oracleUtxo.input.outputIndex,
            oracleData.oracleUtxo.output.amount,
            oracleData.oracleUtxo.output.address,
          )
          .txInRedeemerValue(mConStr0([]))
          .txInScript(scripts.oracleCbor)
          .txInInlineDatumPresent()
          // Let Mesh SDK auto-calculate minimum lovelace for Oracle UTxO output
          // This ensures sufficient lovelace for the updated datum
          .txOut(scripts.oracleAddress, [
            { unit: oracleData.oracleNftPolicyId, quantity: '1' }
          ])
          .txOutInlineDatumValue(updatedOracleDatum, 'JSON');

        tx.txOut(feeCollectorAddress, [
          { unit: 'lovelace', quantity: lovelacePrice.toString() },
        ]);

        const mintedAssetUnit = `${policyId}${tokenNameHex}`;
        tx.mintPlutusScriptV3()
          .mint('1', policyId, tokenNameHex)
          .mintingScript(scripts.nftCbor)
          .mintRedeemerValue(mNftMintOrBurn('RMint'));

        // Let Mesh SDK auto-calculate minimum lovelace required for NFT output
        tx.txOut(recipientAddress, [
          { unit: mintedAssetUnit, quantity: '1' },
        ]);

        if (!tokenMetadata || !tokenMetadata.image) {
          throw new Error('Token metadata is missing or invalid. Please ensure project metadata.image is set in projects.json');
        }

        // Helper function to extract CID from IPFS URL for Cardano metadata (64 byte limit)
        const extractIpfsCid = (ipfsUrl: string): string => {
          if (!ipfsUrl) return ipfsUrl;
          // Remove ipfs:// prefix to save bytes (CID only fits in 64 byte limit)
          if (ipfsUrl.startsWith('ipfs://')) {
            return ipfsUrl.replace('ipfs://', '');
          }
          return ipfsUrl;
        };

        const metadata = {
          [policyId]: {
            [tokenName]: {
              ...tokenMetadata,
              image: extractIpfsCid(tokenMetadata.image), // Extract CID only (removes ipfs:// prefix)
            },
          },
        };
        tx.metadataValue('721', metadata);

        tx.changeAddress(recipientAddress);
        tx.selectUtxosFrom(utxos);
        tx.txInCollateral(
          collateral.input.txHash,
          collateral.input.outputIndex,
          collateral.output.amount,
          collateral.output.address,
        );

        console.log('[useCardanoAPIMint] Completing transaction...');
        const unsignedTx = await tx.complete();
        console.log('[useCardanoAPIMint] Transaction completed successfully');

        setMintStatus({ status: 'signing' });

        const clientSignedTx = await wallet.signTx(unsignedTx, true);

        setMintStatus({ status: 'submitting' });

        let txHash: string;
        const normalizedLovelacePrice = lovelacePrice;
        const feeAda = normalizedLovelacePrice / 1_000_000;
        lastDisplayMintAda = feeAda;

        try {
          console.log('[useCardanoAPIMint] Submitting transaction...');
          txHash = await wallet.submitTx(clientSignedTx);
          console.log('[useCardanoAPIMint] Transaction submitted:', txHash);
        } catch (walletSubmitError) {
          console.error('Wallet submission failed, trying server submission:', walletSubmitError);

          const submitResponse = await fetch(appendDevQuery('/api/cardano/submit'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signedTx: clientSignedTx,
              txId: `${project.id}-${tokenId}`,
              projectId: project.id,
              tokenId,
              alreadySubmitted: false,
            }),
          });

          if (!submitResponse.ok) {
            const submitError = await submitResponse.json().catch(() => ({}));
            throw new Error(submitError.error || 'Failed to submit transaction');
          }

          const submitData = await submitResponse.json();
          if (!submitData.success || !submitData.txHash) {
            throw new Error(submitData.error || 'Transaction submission failed');
          }

          txHash = submitData.txHash;
        }

        try {
          await fetch(appendDevQuery('/api/cardano/submit'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signedTx: clientSignedTx,
              txId: `${project.id}-${tokenId}`,
              projectId: project.id,
              tokenId,
              alreadySubmitted: true,
              txHash,
            }),
          });
        } catch (trackError) {
          console.warn('Failed to notify backend of submitted transaction', trackError);
        }

        setMintStatus({ status: 'confirming' });

        // Record token event with retry logic - must complete before returning
        await recordTokenEventWithRetry(
          recipientAddress,
          project.id,
          [tokenId.toString()],
          feeAda,
          txHash
        );

        // Start oracle update check in background (don't wait for it)
        waitForOracleUpdate(tokenId + 1).then((oracleUpdated) => {
          if (!oracleUpdated) {
            console.warn(`[useCardanoAPIMint] Oracle confirmation timed out for token ${tokenId}, but transaction ${txHash} was submitted successfully`);
            setMintStatus((prevStatus) => {
              // Only update if still in confirming or success status
              if (prevStatus.status === 'confirming' || prevStatus.status === 'success') {
                return {
                  ...prevStatus,
                  status: 'warning',
                  warning: 'Transaction submitted successfully but oracle confirmation is delayed. Your NFT should appear in your wallet soon.'
                };
              }
              return prevStatus;
            });
          }
        }).catch((error) => {
          console.warn('[useCardanoAPIMint] Oracle update check failed:', error);
        });

        return {
          txHash,
          tokenIds: [tokenId],
          policyId,
          mintLovelace: normalizedLovelacePrice,
        };
      } catch (error) {
        console.error('Minting error:', error);

        let errorMessage = 'Failed to mint NFT';

        if (error instanceof Error) {
          if (error.message.includes('UTxO Balance Insufficient') || error.message.includes('Insufficient')) {
            const totalAda = lastDisplayMintAda + 2.5;
            errorMessage = `Insufficient wallet balance. NFT minting requires approximately ${totalAda.toFixed(2)} ADA (${lastDisplayMintAda.toFixed(2)} ADA mint price + network fees). Please add more ADA to your wallet and try again.`;
          } else if (error.message.includes('User declined')) {
            errorMessage = 'Transaction cancelled by user';
          } else {
            errorMessage = error.message;
          }
        }

        setMintStatus({
          status: 'error',
          error: errorMessage
        });
        throw error;
      }
    };

    setIsProcessing(true);

    try {
      const aggregatedTokenIds: number[] = [];
      const txHashes: string[] = [];
      let aggregatedPolicyId: string | null = null;
      let aggregatedLovelace = 0;

      for (let index = 0; index < totalMints; index += 1) {
        const result = await executeSingleMint();
        aggregatedTokenIds.push(...result.tokenIds);
        txHashes.push(result.txHash);
        aggregatedPolicyId = result.policyId;
        aggregatedLovelace += result.mintLovelace ?? 0;

        setMintStatus({
          status: index === totalMints - 1 ? 'confirming' : 'preparing',
          txHash: result.txHash,
          tokenIds: aggregatedTokenIds.slice(),
        });
      }

      setMintStatus({
        status: 'success',
        txHash: txHashes[txHashes.length - 1],
        tokenIds: aggregatedTokenIds,
      });

      return {
        txHash: txHashes[txHashes.length - 1],
        tokenIds: aggregatedTokenIds,
        policyId: aggregatedPolicyId ?? '',
        mintLovelace: aggregatedLovelace,
        txHashes,
        totalLovelace: aggregatedLovelace,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [connected, walletName, setMintStatus, recordTokenEventWithRetry]);

  const mintProjectNFTBulk = useCallback(async (
    project: Project,
    quantity: number
  ): Promise<MintResult | undefined> => {
    if (!connected || !walletName) {
      setMintStatus({
        status: 'error',
        error: 'Please connect your wallet first'
      });
      throw new Error('Wallet not connected');
    }

    if (quantity <= 0 || quantity > 15) {
      setMintStatus({
        status: 'error',
        error: 'Quantity must be between 1 and 15'
      });
      throw new Error('Invalid quantity');
    }

    setIsProcessing(true);
    setMintStatus({ status: 'preparing' });

    try {
      const wallet = await BrowserWallet.enable(walletName);
      const recipientAddress = await wallet.getChangeAddress();

      // Prepare bulk mint transaction
      const prepareResponse = await fetch(appendDevQuery('/api/cardano/mint-bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          quantity,
          recipientAddress,
        })
      });

      if (!prepareResponse.ok) {
        const error = await prepareResponse.json();
        throw new Error(error.error || 'Failed to prepare bulk mint');
      }

      const mintData = await prepareResponse.json();

      if (!mintData.success) {
        throw new Error(mintData.error || 'Bulk mint API returned an unsuccessful response');
      }

      const tokenIds: number[] = mintData.tokenIds;
      const policyId: string = mintData.policyId;
      const totalLovelace: number = mintData.totalLovelace;
      const feeCollectorAddress: string = mintData.feeCollectorAddress;
      const collectionName: string = mintData.collectionName;
      const oracleData = mintData.oracleData;
      const scripts = mintData.scripts;

      // Build the bulk mint transaction
      const utxos = await wallet.getUtxos();
      const collateralUtxos = await wallet.getCollateral();

      if (!utxos || utxos.length === 0) {
        throw new Error('No UTxOs found in wallet. Please add ADA to your wallet.');
      }

      if (!collateralUtxos || collateralUtxos.length === 0) {
        throw new Error('No collateral found in wallet. Please set up collateral in your wallet (Settings → Collateral).');
      }

      const collateral = collateralUtxos[0];

      const config = getClientNetworkConfig();
      const networkId: 0 | 1 = config.isMainnet ? 1 : 0;
      const proxiedProvider = new ProxiedBlockfrostProvider(networkId);

      const tx = new MeshTxBuilder({
        fetcher: proxiedProvider,
        submitter: proxiedProvider,
        evaluator: proxiedProvider,
      });

      // Update oracle datum with new count
      const updatedOracleDatum = oracleDatum({
        count: Number(oracleData.nftIndex) + quantity,
        lovelace_price: mintData.lovelacePrice,
        fee_address: oracleData.feeCollectorAddressObj,
        nft_mint_allowed: oracleData.nftMintAllowed,
        nft_trade_allowed: oracleData.nftTradeAllowed,
        expected_apr_numerator: Number(oracleData.expectedAprNumerator),
        expected_apr_denominator: Number(oracleData.expectedAprDenominator),
        maturation_time: BigInt(oracleData.maturationTime),
        max_mints: BigInt(oracleData.maxMints),
      });

      // Spend oracle UTxO
      console.log('[useCardanoAPIMint] Building bulk mint with quantity:', quantity, 'type:', typeof quantity);
      if (quantity === undefined || quantity === null) {
        throw new Error(`Quantity is undefined or null. Expected a number, got: ${quantity}`);
      }
      tx.spendingPlutusScriptV3()
        .txIn(
          oracleData.oracleUtxo.input.txHash,
          oracleData.oracleUtxo.input.outputIndex,
          oracleData.oracleUtxo.output.amount,
          oracleData.oracleUtxo.output.address,
        )
        .txInRedeemerValue(mOracleRedeemer("BulkMintPlutusNFT", quantity))
        .txInScript(scripts.oracleCbor)
        .txInInlineDatumPresent()
        // Let Mesh SDK auto-calculate minimum lovelace for Oracle UTxO output
        // This ensures sufficient lovelace for the updated datum (which may be larger)
        .txOut(scripts.oracleAddress, [
          { unit: oracleData.oracleNftPolicyId, quantity: '1' }
        ])
        .txOutInlineDatumValue(updatedOracleDatum, 'JSON');

      // Pay total fee for all NFTs
      tx.txOut(feeCollectorAddress, [
        { unit: 'lovelace', quantity: totalLovelace.toString() },
      ]);

      // Mint all NFTs with bulk mint redeemer
      let totalMetadata: any = {};
      
      // Build mint string for all NFTs
      const mintAssets: Array<{tokenNameHex: string, tokenName: string}> = [];
      
      // Validate project metadata before bulk minting
      if (!project.metadata?.image) {
        throw new Error(`Project ${project.id} must have metadata.image (IPFS URL) set in projects.json`);
      }

      if (!project.metadata.image.startsWith('ipfs://')) {
        throw new Error(`Project ${project.id} metadata.image must be an IPFS URL (ipfs://...)`);
      }

      // Helper function to extract CID from IPFS URL for Cardano metadata (64 byte limit)
      const extractIpfsCid = (ipfsUrl: string): string => {
        if (!ipfsUrl) return ipfsUrl;
        // Remove ipfs:// prefix to save bytes (CID only fits in 64 byte limit)
        if (ipfsUrl.startsWith('ipfs://')) {
          return ipfsUrl.replace('ipfs://', '');
        }
        return ipfsUrl;
      };

      for (let i = 0; i < quantity; i++) {
        const tokenId = tokenIds[i];
        const tokenName = `${collectionName} (${tokenId})`;
        const tokenNameHex = stringToHex(tokenName);
        
        mintAssets.push({tokenNameHex, tokenName});

        // Add metadata for each NFT using project metadata
        if (!totalMetadata[policyId]) {
          totalMetadata[policyId] = {};
        }
        totalMetadata[policyId][tokenName] = {
          name: tokenName,
          image: extractIpfsCid(project.metadata.image), // Extract CID only (removes ipfs:// prefix)
          description: project.metadata.description || project.description || tokenName,
          ...(project.metadata.mediaType && { mediaType: project.metadata.mediaType }),
          ...(project.metadata.attributes && { attributes: project.metadata.attributes }),
        };
      }
      
      console.log('[useCardanoAPIMint] Building bulk mint transaction with RBulkMint redeemer');
      console.log('[useCardanoAPIMint] Current oracle count:', oracleData.nftIndex);
      console.log('[useCardanoAPIMint] Minting quantity:', quantity);
      console.log('[useCardanoAPIMint] Token IDs to mint:', tokenIds);
      console.log('[useCardanoAPIMint] Collection name:', collectionName);
      
      // For bulk minting with RBulkMint, we need to use a single mintPlutusScriptV3
      // and add all NFTs at once. Since Mesh doesn't support chaining mint() calls,
      // we'll use the mintAssets method if available, or build it manually
      const mintScript = scripts.nftCbor;
      const redeemer = mRBulkMint(quantity);
      
      // For bulk minting with RBulkMint, we need to call mintPlutusScriptV3 multiple times
      // Each call includes the script and redeemer
      for (let i = 0; i < mintAssets.length; i++) {
        console.log(`[useCardanoAPIMint] Adding mint ${i}: ${mintAssets[i].tokenName} (hex: ${mintAssets[i].tokenNameHex})`);
        tx.mintPlutusScriptV3()
          .mint('1', policyId, mintAssets[i].tokenNameHex)
          .mintingScript(mintScript)
          .mintRedeemerValue(redeemer);
      }
      
      // Add metadata that was already built above
      tx.metadataValue('721', totalMetadata);
      
      // Send all NFTs to recipient
      // Let Mesh SDK auto-calculate minimum lovelace required for NFT outputs
      // This automatically handles network differences (Preprod vs Mainnet) and
      // calculates the correct minimum based on protocol parameters
      let nftOutputs: Array<{ unit: string; quantity: string }> = [];
      for (const asset of mintAssets) {
        const mintedAssetUnit = `${policyId}${asset.tokenNameHex}`;
        nftOutputs.push({ unit: mintedAssetUnit, quantity: '1' });
      }
      // Don't specify lovelace - Mesh SDK will auto-calculate minimum required
      tx.txOut(recipientAddress, nftOutputs);
      
      // Complete transaction
      tx.changeAddress(recipientAddress);
      tx.selectUtxosFrom(utxos);
      tx.txInCollateral(
        collateral.input.txHash,
        collateral.input.outputIndex,
        collateral.output.amount,
        collateral.output.address,
      );
      
      console.log('[useCardanoAPIMint] Completing bulk mint transaction...');
      let unsignedTx: string;
      try {
        unsignedTx = await tx.complete();
        console.log('[useCardanoAPIMint] Bulk transaction completed successfully');
      } catch (completeError: any) {
        console.error('========== TRANSACTION COMPLETION ERROR ==========');
        console.error('[useCardanoAPIMint] Error type:', typeof completeError);
        console.error('[useCardanoAPIMint] Error:', completeError);
        
        // Evaluation errorの詳細を抽出
        if (completeError instanceof Error) {
          console.error('[useCardanoAPIMint] Error message:', completeError.message);
          console.error('[useCardanoAPIMint] Error stack:', completeError.stack);
          
          // Evaluation Failureのメッセージを確認
          if (completeError.message.includes('evaluation') || 
              completeError.message.includes('Script') ||
              completeError.message.includes('EvaluationFailure')) {
            console.error('[useCardanoAPIMint] This appears to be an evaluation failure');
            console.error('[useCardanoAPIMint] Full error details:', {
              message: completeError.message,
              name: completeError.name,
              stack: completeError.stack,
              ...(completeError as any)
            });
          }
        }
        
        // エラーオブジェクトの全プロパティをログ
        if (completeError && typeof completeError === 'object') {
          console.error('[useCardanoAPIMint] Error properties:', Object.keys(completeError));
          console.error('[useCardanoAPIMint] Full error object:', JSON.stringify(completeError, null, 2));
        }
        
        console.error('==================================================');
        
        // ユーザーフレンドリーなエラーメッセージを構築
        let errorMessage = 'Failed to build bulk mint transaction';
        if (completeError instanceof Error) {
          if (completeError.message.includes('evaluation') || 
              completeError.message.includes('Script')) {
            errorMessage = `Transaction validation failed: ${completeError.message}`;
          } else {
            errorMessage = completeError.message;
          }
        }
        
        setMintStatus({
          status: 'error',
          error: errorMessage
        });
        throw completeError;
      }
      
      // Sign and submit
      setMintStatus({ status: 'signing' });
      const signedTx = await wallet.signTx(unsignedTx, true);
      
      setMintStatus({ status: 'submitting' });
      const txHash = await wallet.submitTx(signedTx);
      
      console.log('[useCardanoAPIMint] Bulk mint submitted:', txHash);
      
      setMintStatus({ status: 'confirming' });
      
      // Record token event with retry logic - must complete before returning
      const feeAda = totalLovelace / 1_000_000;
      const tokenIdsString = tokenIds.map(id => id.toString());
      await recordTokenEventWithRetry(
        recipientAddress,
        project.id,
        tokenIdsString,
        feeAda,
        txHash
      );
      
      setMintStatus({ status: 'success', txHash, tokenIds });
      
      return {
        txHash: txHash,
        tokenIds: tokenIds,
        policyId: policyId,
        totalLovelace: totalLovelace
      };
      
    } catch (error) {
      console.error('========== BULK MINTING ERROR ==========');
      console.error('Bulk minting error:', error);
      
      // エラーの詳細を抽出
      if (error && typeof error === 'object') {
        console.error('Error type:', error.constructor?.name);
        console.error('Error properties:', Object.keys(error));
        
        // TxSendErrorの詳細を確認
        if ('info' in error) {
          console.error('Error info:', error.info);
          try {
            const infoStr = String(error.info);
            console.error('Error info (string):', infoStr);
            
            if (infoStr.includes('BAD_REQUEST')) {
              // BAD_REQUESTメッセージを抽出
              const badRequestMatch = infoStr.match(/BAD_REQUEST\s*\(([^)]+)\)/);
              if (badRequestMatch) {
                console.error('BAD_REQUEST content:', badRequestMatch[1]);
                try {
                  const badRequestJson = JSON.parse(badRequestMatch[1]);
                  console.error('BAD_REQUEST parsed:', JSON.stringify(badRequestJson, null, 2));
                  
                  if (badRequestJson.message) {
                    console.error('Error message from BAD_REQUEST:', badRequestJson.message);
                    try {
                      const messageJson = JSON.parse(badRequestJson.message);
                      console.error('Parsed message JSON:', JSON.stringify(messageJson, null, 2));
                    } catch (e) {
                      console.error('Message is not JSON:', badRequestJson.message);
                    }
                  }
                } catch (e) {
                  console.error('Could not parse BAD_REQUEST as JSON:', e);
                }
              }
              
              // メッセージフィールドを直接抽出
              const messageMatch = infoStr.match(/message":"([^"]+)"/);
              if (messageMatch) {
                const message = messageMatch[1];
                console.error('Extracted message:', message);
                try {
                  const parsed = JSON.parse(message);
                  console.error('Parsed message JSON:', JSON.stringify(parsed, null, 2));
                } catch (e) {
                  console.error('Could not parse message as JSON:', message);
                }
              }
            }
            
            if (infoStr.includes('TxSubmitFail')) {
              console.error('TxSubmitFail detected - this usually means transaction size exceeds limit');
            }
          } catch (e) {
            console.error('Error parsing info:', e);
          }
        }
        
        if ('code' in error) {
          console.error('Error code:', error.code);
        }
        
        if ('message' in error) {
          console.error('Error message:', error.message);
        }
        
        if ('stack' in error) {
          console.error('Error stack:', error.stack);
        }
      }
      
      console.error('========================================');
      
      let errorMessage = 'Failed to mint NFT';
      if (error instanceof Error) {
        if (error.message.includes('Failed to record token event')) {
          errorMessage = 'Transaction submitted successfully, but failed to save to database. Please contact support with your transaction hash.';
        } else if (error.message.includes('UTxO Balance Insufficient') || error.message.includes('Insufficient')) {
          errorMessage = error.message;
        } else if (error.message.includes('User declined')) {
          errorMessage = 'Transaction cancelled by user';
        } else {
          errorMessage = error.message;
        }
      }
      
      setMintStatus({ 
        status: 'error',
        error: errorMessage
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [walletName, connected, setMintStatus, mintProjectNFT, recordTokenEventWithRetry]);

  return {
    mintProjectNFT,
    mintProjectNFTBulk,
    mintStatus,
  };
};

export default useCardanoAPIMint;
