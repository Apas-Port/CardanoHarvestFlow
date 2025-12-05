import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for minted counts (in production, use a database)
const mintedCounts: Record<string, number> = {};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    const count = mintedCounts[projectId] || 0;
    
    return NextResponse.json({
      success: true,
      projectId,
      mintedCount: count
    });
    
  } catch (error) {
    console.error('Error getting minted count:', error);
    return NextResponse.json(
      { error: 'Failed to get minted count' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, increment } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Initialize if not exists
    if (!mintedCounts[projectId]) {
      mintedCounts[projectId] = 0;
    }
    
    // Increment the count
    if (increment) {
      mintedCounts[projectId] += increment;
    }
    
    return NextResponse.json({
      success: true,
      projectId,
      mintedCount: mintedCounts[projectId]
    });
    
  } catch (error) {
    console.error('Error updating minted count:', error);
    return NextResponse.json(
      { error: 'Failed to update minted count' },
      { status: 500 }
    );
  }
}