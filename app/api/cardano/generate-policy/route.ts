import { NextRequest, NextResponse } from 'next/server';
import { ForgeScript, resolveScriptHash } from '@meshsdk/core';
import { getNetworkConfig } from '@/lib/network-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Use a fixed treasury address for the unified policy
    // This ensures all NFTs are minted under the same policy
    const { treasuryAddress } = getNetworkConfig(request);
    
    // Create a time-locked policy (optional - for limited minting period)
    const currentSlot = Date.now(); // In production, get actual slot from blockchain
    const expirySlot = currentSlot + (365 * 24 * 60 * 60 * 1000); // 1 year from now
    
    // Option 1: Simple signature-based policy (always valid)
    const simpleScript = ForgeScript.withOneSignature(treasuryAddress);
    const simplePolicyId = resolveScriptHash(simpleScript);
    
    // Option 2: Time-locked policy (expires after certain time)
    const timelockScript = ForgeScript.fromNativeScript({
      type: 'all',
      scripts: [
        {
          type: 'sig',
          keyHash: treasuryAddress.slice(-56), // Extract key hash from address
        },
        {
          type: 'before',
          slot: expirySlot.toString(),
        },
      ],
    });
    const timelockPolicyId = resolveScriptHash(timelockScript);
    
    // Option 3: Multi-signature policy (requires multiple signers)
    // Useful for team-controlled minting
    const multiSigScript = ForgeScript.fromNativeScript({
      type: 'atLeast',
      required: 1, // Require at least 1 signature
      scripts: [
        {
          type: 'sig',
          keyHash: treasuryAddress.slice(-56),
        },
        // Add more signers here if needed
      ],
    });
    const multiSigPolicyId = resolveScriptHash(multiSigScript);
    
    return NextResponse.json({
      success: true,
      policies: {
        simple: {
          policyId: simplePolicyId,
          script: simpleScript,
          description: 'Simple signature-based policy - always valid',
        },
        timeLocked: {
          policyId: timelockPolicyId,
          script: timelockScript,
          expirySlot,
          description: 'Time-locked policy - expires after 1 year',
        },
        multiSig: {
          policyId: multiSigPolicyId,
          script: multiSigScript,
          description: 'Multi-signature policy - requires team approval',
        },
      },
      recommendation: 'Use the simple policy for most cases, or time-locked for limited editions',
      treasuryAddress,
    });
    
  } catch (error) {
    console.error('Error generating policy:', error);
    return NextResponse.json(
      { error: 'Failed to generate policy ID' },
      { status: 500 }
    );
  }
}
