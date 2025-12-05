import { NextRequest, NextResponse } from 'next/server';
import { getServerNetworkConfig } from '@/lib/network-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Blockfrost API Proxy
 *
 * This endpoint proxies Blockfrost API requests from the client to avoid CORS issues.
 * The client can build transactions locally and use this proxy for Blockfrost API calls.
 */
export async function POST(req: NextRequest) {
  try {
    const { endpoint, method = 'GET', body, contentType } = await req.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
      );
    }

    const config = getServerNetworkConfig(req);
    const blockfrostUrl = config.blockfrostUrl;
    const blockfrostApiKey = config.blockfrostApiKey;

    console.log('[blockfrost-proxy] Proxying request:', {
      endpoint,
      method,
      network: config.network,
      hasBody: !!body,
      bodyType: typeof body,
    });

    const url = `${blockfrostUrl}${endpoint}`;

    // Determine content type based on endpoint
    const isCborEndpoint = endpoint.includes('/tx/submit') || endpoint.includes('/txs/evaluate');
    const defaultContentType = isCborEndpoint ? 'application/cbor' : 'application/json';

    console.log('[blockfrost-proxy] Content-Type:', contentType || defaultContentType, 'isCborEndpoint:', isCborEndpoint);

    const options: RequestInit = {
      method,
      headers: {
        'project_id': blockfrostApiKey,
        'Content-Type': contentType || defaultContentType,
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      // For CBOR endpoints, body is already CBOR string
      if (isCborEndpoint || contentType === 'application/cbor') {
        options.body = body;
      } else {
        options.body = JSON.stringify(body);
      }
    }

    const response = await fetch(url, options);

    // Try to parse as JSON, fallback to text
    let data;
    const responseText = await response.text();
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    if (!response.ok) {
      console.error('[blockfrost-proxy] Error response:', {
        status: response.status,
        statusText: response.statusText,
        data,
      });
      return NextResponse.json(
        typeof data === 'string' ? { error: data } : data,
        { status: response.status }
      );
    }

    console.log('[blockfrost-proxy] Success response for:', endpoint, 'data type:', typeof data, 'is array:', Array.isArray(data));

    // For evaluate endpoint, log the structure
    if (endpoint.includes('/txs/evaluate')) {
      console.log('[blockfrost-proxy] Evaluate response structure:', JSON.stringify(data, null, 2).substring(0, 500));
    }

    // Return data as-is for JSON responses, or wrap strings
    if (typeof data === 'string') {
      // Plain text response (like tx hash from submit)
      return NextResponse.json({ result: data });
    } else {
      // JSON response - return as-is without wrapping
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('[blockfrost-proxy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
      );
    }

    const config = getServerNetworkConfig(req);
    const blockfrostUrl = config.blockfrostUrl;
    const blockfrostApiKey = config.blockfrostApiKey;

    console.log('[blockfrost-proxy] Proxying GET request:', {
      endpoint,
      network: config.network,
    });

    const url = `${blockfrostUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'project_id': blockfrostApiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[blockfrost-proxy] Error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[blockfrost-proxy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy error' },
      { status: 500 }
    );
  }
}
