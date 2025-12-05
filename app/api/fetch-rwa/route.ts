import { NextRequest, NextResponse } from 'next/server';
import { RwaAsset, RepaymentHistory } from '@/lib/types'; // Import RepaymentHistory

export interface RWAStat {
  mileage: number,
  drivingtime: number,
  datetime: string,
}

interface RawAsset {
  "no.": number;
  assetID: number;
  assetType: string;
  deviceID: number;
  status: string;
  carModel: string;
  color: string;
  year: number;
  vehiclePrice: number | string;
  customerName: string;
  sex: string;
  living: string;
  releaseDate: string;
  totalNumberOfPayments: number | string;
  numberOfPaymentsMade: number | string;
  hISTORY: string;
  accessUrlParams: string;
}

function mapRawAssetToAsset(raw: RawAsset): RwaAsset {
  return {
    no: raw["no."],
    assetId: raw.assetID,
    assetType: raw.assetType,
    deviceId: raw.deviceID,
    status: raw.status,
    carModel: raw.carModel,
    color: raw.color,
    year: raw.year,
    vehiclePrice: raw.vehiclePrice,
    customerName: raw.customerName,
    sex: raw.sex,
    living: raw.living,
    releaseDate: raw.releaseDate,
    totalNumberOfPayments: raw.totalNumberOfPayments,
    numberOfPaymentsMade: raw.numberOfPaymentsMade,
    history: raw.hISTORY,
    name: raw.customerName,
    description: '',
    image: '',
    assetImage: '',
    apr: '',
    mileageTime: '',
    driverName: raw.customerName,
    driverSex: raw.sex,
    driverSince: raw.releaseDate,
    driverLocation: raw.living,
    accessUrlParams: raw.accessUrlParams,
  };
}

async function fetchRWADetail(assetId?: number): Promise<RwaAsset[]> {
  const GAS_ENDPOINT = process.env.GAS_ENDPOINT || ''
  const response = await fetch(GAS_ENDPOINT+ "?sheet=Asset")
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const rawAssets = await response.json() as RawAsset[];
  const assets = rawAssets.map(mapRawAssetToAsset);
  if (assetId !== undefined) {
    return assets.filter(asset => asset.assetId === assetId);
  }
  return assets;
}

async function fetchAssetByToken(param: string): Promise<RwaAsset[]> {
  const GAS_ENDPOINT = process.env.GAS_ENDPOINT || ''
  const response = await fetch(GAS_ENDPOINT+ "?sheet=Asset")
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const rawAssets = await response.json() as RawAsset[];
  const assets = rawAssets.map(mapRawAssetToAsset);
  if (param !== undefined) {
    return assets.filter(asset => asset.accessUrlParams === param);
  }
  return assets
}

async function fetchRepaymentHistories(): Promise<RepaymentHistory[]> {
  const GAS_ENDPOINT = process.env.GAS_ENDPOINT || ''
  const response = await fetch(GAS_ENDPOINT + "?sheet=RepaymentHistory")
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return await response.json() as RepaymentHistory[];
}


export async function GET(request: NextRequest) {  try {
    const resource = request.nextUrl.searchParams.get('resource');
    if (resource === 'repayment-history') {
      try {
        const repaymentHistories = await fetchRepaymentHistories();
        return NextResponse.json(repaymentHistories);
      } catch (error) {
        console.error("Error fetching repayment histories:", error);
        return NextResponse.json({ error: "Failed to fetch repayment histories" }, { status: 500 });
      }
    } else if (resource === 'asset') {
      const assetId = request.nextUrl.searchParams.get('assetId');
      const id = assetId ? parseInt(assetId, 10) : undefined;
      try {
        const rwaDetail = await fetchRWADetail(id);
        return NextResponse.json(rwaDetail);
      } catch (error) {
        console.error("Error fetching RWA detail:", error);
        return NextResponse.json({ error: "Failed to fetch RWA detail" }, { status: 500 });
      }
    } else if (resource === 'assetByToken') {
      const accessToken = request.nextUrl.searchParams.get('accessToken');
      
      if (!accessToken) {
        return NextResponse.json({ error: "Access token is required" }, { status: 400 });
      }
      
      try {
        const assets = await fetchAssetByToken(accessToken);
        if (assets.length === 0) {
          return NextResponse.json({ error: "No asset found for the provided access token" }, { status: 404 });
        }
        return NextResponse.json(assets[0]); // Return the first matching asset
      } catch (error) {
        console.error("Error fetching asset by token:", error);
        return NextResponse.json({ error: "Failed to fetch asset by token" }, { status: 500 });
      }
    } else if (resource === 'devices') {
      try {
        const clientId = process.env.MSPF_CLIENT_ID;
        const clientSecret = process.env.MSPF_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          return NextResponse.json({ error: "MSPF_CLIENT_ID and MSPF_CLIENT_SECRET must be set in environment variables" }, { status: 500 });
        }

        const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const tokenResponse = await fetch('https://api.cloud-gms.com/v1/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': authHeader,
          },
          body: 'grant_type=client_credentials',
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error("Error fetching token for devices:", tokenResponse.status, errorText);
          return NextResponse.json({ error: "Failed to fetch token for devices", details: errorText }, { status: tokenResponse.status });
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        const devicesResponse = await fetch('https://api.cloud-gms.com/v3/devices', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!devicesResponse.ok) {
          const errorText = await devicesResponse.text();
          console.error("Error fetching devices:", devicesResponse.status, errorText);
          return NextResponse.json({ error: "Failed to fetch devices", details: errorText }, { status: devicesResponse.status });
        }

        const devicesData = await devicesResponse.json();
        return NextResponse.json(devicesData);

      } catch (error) {
        console.error("Error fetching devices:", error);
        return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
      }
    }
     else {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
  } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Error" }, { status: 400 });
  }
}