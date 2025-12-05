import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

// Create a new token event (mint/harvest/claim)
export async function POST(request: Request) {
  try {
    const { walletAddress, projectId, tokenIds, amount, event, txHash } = await request.json();

    if (!walletAddress || !projectId || !tokenIds || !amount || !event) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate event type
    const validEvents = ['mint', 'harvest', 'claim'];
    if (!validEvents.includes(event)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Insert token event into the database
    await sql`
      INSERT INTO token_event (
        wallet_address, 
        project_id, 
        token_ids, 
        amount, 
        event,
        tx_hash,
        created_at
      ) VALUES (
        ${walletAddress.toLowerCase()}, 
        ${projectId}, 
        ${JSON.stringify(tokenIds)}, 
        ${amount}, 
        ${event},
        ${txHash || null},
        CURRENT_TIMESTAMP
      )
    `;

    console.log('Token event recorded:', {
      walletAddress,
      projectId,
      tokenIds,
      amount,
      event,
      txHash
    });

    return NextResponse.json({ 
      message: 'Token event recorded successfully',
      event: {
        walletAddress: walletAddress.toLowerCase(),
        projectId,
        tokenIds,
        amount,
        event
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error recording token event:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Get token events for a wallet address
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');
    const projectId = request.nextUrl.searchParams.get('projectId');
    const eventType = request.nextUrl.searchParams.get('event');

    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    let result;
    
    // Build query based on filters
    if (projectId && eventType) {
      result = await sql`
        SELECT * FROM token_event 
        WHERE wallet_address = ${address.toLowerCase()}
        AND project_id = ${projectId}
        AND event = ${eventType}
        ORDER BY created_at DESC
      `;
    } else if (projectId) {
      result = await sql`
        SELECT * FROM token_event 
        WHERE wallet_address = ${address.toLowerCase()}
        AND project_id = ${projectId}
        ORDER BY created_at DESC
      `;
    } else if (eventType) {
      result = await sql`
        SELECT * FROM token_event 
        WHERE wallet_address = ${address.toLowerCase()}
        AND event = ${eventType}
        ORDER BY created_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM token_event 
        WHERE wallet_address = ${address.toLowerCase()}
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({
      events: result.rows,
      count: result.rows.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching token events:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}