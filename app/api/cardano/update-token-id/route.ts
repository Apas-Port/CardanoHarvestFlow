import { NextRequest, NextResponse } from 'next/server';
import { getHighestTokenId, setHighestTokenId } from '@/lib/tokenIdManager';

export interface UpdateTokenIdRequest {
  policyId: string;
  highestTokenId: number;
}

// Update the highest known token ID for a policy
export async function POST(req: NextRequest) {
  try {
    const body: UpdateTokenIdRequest = await req.json();
    const { policyId, highestTokenId } = body;

    if (!policyId || typeof highestTokenId !== 'number') {
      return NextResponse.json(
        { error: 'Policy ID and highest token ID are required' },
        { status: 400 }
      );
    }

    // Get current highest
    const currentHighest = getHighestTokenId(policyId);
    
    // Update token ID (the manager will only update if it's higher)
    setHighestTokenId(policyId, highestTokenId);
    
    if (highestTokenId > currentHighest) {
      console.log('Updated highest token ID:', {
        policyId,
        previousHighest: currentHighest,
        newHighest: highestTokenId
      });
    }

    return NextResponse.json({
      success: true,
      policyId,
      highestTokenId: Math.max(highestTokenId, currentHighest)
    });

  } catch (error) {
    console.error('Update token ID error:', error);
    return NextResponse.json(
      { error: 'Failed to update token ID' },
      { status: 500 }
    );
  }
}

// Get the current highest token ID for a policy
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const policyId = searchParams.get('policyId');

    if (!policyId) {
      return NextResponse.json(
        { error: 'Policy ID is required' },
        { status: 400 }
      );
    }

    const highestTokenId = getHighestTokenId(policyId);

    return NextResponse.json({
      policyId,
      highestTokenId,
      nextTokenId: highestTokenId + 1
    });

  } catch (error) {
    console.error('Query token ID error:', error);
    return NextResponse.json(
      { error: 'Failed to get token ID' },
      { status: 500 }
    );
  }
}