import { NextRequest, NextResponse } from 'next/server';
import { GmsCache, GmsDailyCacheEntry } from '@/db/gms-cache';

// --- 型定義 ---
interface LocationData {
  lat: number;
  lon: number;
  timestamp: number; // Unixタイムスタンプ (秒)
}

interface ApiResponse {
  data: LocationData[];
  next?: string; // 次のページがある場合に使用
}

interface DailySummary {
  date: string; // YYYY-MM-DD形式
  dailyDistanceKm: number; // 走行距離 (km)
  dailyTravelTimeHours: number; // 走行時間 (時間)
}

// --- ユーティリティ関数 ---

/**
 * 2つの地理座標間のハバーシン距離をキロメートル単位で計算します。
 * @param lat1 始点の緯度
 * @param lon1 始点の経度
 * @param lat2 終点の緯度
 * @param lon2 終点の経度
 * @returns 距離 (km)
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 地球の半径 (キロメートル)

  const toRadians = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * APIから位置データを全て取得します（キャッシュ機能付き）
 * @param deviceId デバイスID
 * @param accessToken 認証トークン
 * @param useCache キャッシュを使用するかどうか
 * @returns 全てのLocationDataの配列
 */
async function fetchAllLocationData(
  deviceId: string,
  accessToken: string,
  useCache: boolean = true
): Promise<LocationData[]> {
  let allData: LocationData[] = [];
  
  // 全期間のデータを取得するため、十分に古い日付を設定
  const now = new Date();
  const startDate = new Date('2024-09-01'); // 十分に古い開始日
  
  // キャッシュを使用する場合、最新のキャッシュ日付を取得
  let cacheStartDate = startDate;
  if (useCache) {
    const latestCachedDate = await GmsCache.getLatestCachedDate(deviceId);
    if (latestCachedDate) {
      // キャッシュがある場合は、その翌日から取得開始
      cacheStartDate = new Date(latestCachedDate);
      cacheStartDate.setDate(cacheStartDate.getDate() + 1);
      console.log(`Using cache. Fetching from ${cacheStartDate.toISOString()} instead of ${startDate.toISOString()}`);
    }
  }
  
  // APIは1週間を超える期間を拒否するため、1週間ごとに分割して取得
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000; // 7日間のミリ秒
  let currentStartDate = new Date(cacheStartDate);
  
  while (currentStartDate < now) {
    // 終了日を計算（1週間後または現在時刻のいずれか早い方）
    const currentEndDate = new Date(Math.min(currentStartDate.getTime() + oneWeekMs - 1, now.getTime()));
    
    // ISO 8601形式の日時文字列に変換
    const fromDateTime = currentStartDate.toISOString();
    const toDateTime = currentEndDate.toISOString();
        
    // この期間のデータを取得
    const periodData = await fetchLocationDataForPeriod(
      deviceId,
      accessToken,
      fromDateTime,
      toDateTime
    );
    
    allData = allData.concat(periodData);
    
    // 次の期間へ移動
    currentStartDate = new Date(currentEndDate.getTime() + 1); // 1ミリ秒追加して重複を防ぐ
  }
  
  console.log(`Total data points fetched: ${allData.length}`);
  return allData;
}

/**
 * 指定期間の位置データを取得します（ページネーション対応）
 * @param deviceId デバイスID
 * @param accessToken アクセストークン
 * @param fromDateTime 開始日時（ISO 8601形式）
 * @param toDateTime 終了日時（ISO 8601形式）
 * @returns 位置データの配列
 */
async function fetchLocationDataForPeriod(
  deviceId: string,
  accessToken: string,
  fromDateTime: string,
  toDateTime: string
): Promise<LocationData[]> {
  let periodData: LocationData[] = [];
  let currentUrl: string | null = `https://api.cloud-gms.com/v3/devices/${deviceId}/route?from=${encodeURIComponent(fromDateTime)}&to=${encodeURIComponent(toDateTime)}`;
  let page = 1;
  const maxPages = 100; // 1週間分のデータに対する最大ページ数

  while (currentUrl && page <= maxPages) {
    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const apiResponse: ApiResponse = await response.json();
      periodData = periodData.concat(apiResponse.data);

      // ページネーション処理
      if (apiResponse.next) {
        // nextトークンをstartパラメータとして使用
        currentUrl = `https://api.cloud-gms.com/v3/devices/${deviceId}/route?from=${encodeURIComponent(fromDateTime)}&to=${encodeURIComponent(toDateTime)}&start=${encodeURIComponent(apiResponse.next)}`;
        page++;
      } else {
        currentUrl = null;
      }
    } catch (error) {
      console.error(`Error fetching data for period ${fromDateTime} to ${toDateTime} by ${deviceId}:`, error);
      currentUrl = null;
    }
  }
  
  return periodData;
}

/**
 * 取得した位置データから日ごとの走行距離と走行時間を算出します。
 * @param locationData 位置データの配列
 * @returns 日ごとの集計結果の配列
 */
function calculateDailyTravelSummary(
  locationData: LocationData[]
): DailySummary[] {
  // タイムスタンプでデータをソート
  const sortedData = [...locationData].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  if (sortedData.length === 0) {
    return [];
  }

  // 日付ごとにデータをグループ化
  const dataByDate: { [key: string]: LocationData[] } = {};
  
  sortedData.forEach(point => {
    // ローカルタイムゾーンで日付を取得（日本の場合）
    const date = new Date(point.timestamp * 1000);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!dataByDate[dateStr]) {
      dataByDate[dateStr] = [];
    }
    dataByDate[dateStr].push(point);
  });

  // 各日付のデータを処理
  const dailySummaries: DailySummary[] = [];
  
  Object.entries(dataByDate).forEach(([date, points]) => {
    if (points.length < 2) {
      // データポイントが1つ以下の場合はスキップ
      dailySummaries.push({
        date,
        dailyDistanceKm: 0,
        dailyTravelTimeHours: 0,
      });
      return;
    }

    // 走行距離の計算
    let totalDistance = 0;
    let movingTimeSeconds = 0;
    
    // 速度閾値（km/h）- 1km/h以上を移動とみなす
    const SPEED_THRESHOLD_KMH = 1;
    // 最小移動距離（m）- 10m以上を移動とみなす
    const MIN_DISTANCE_M = 10;
    // 最大単一移動距離（km）- 異常値除外
    const MAX_SINGLE_DISTANCE_KM = 50;
    
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      
      const distance = haversineDistance(
        prevPoint.lat,
        prevPoint.lon,
        currentPoint.lat,
        currentPoint.lon
      );
      
      const timeDiff = currentPoint.timestamp - prevPoint.timestamp;
      
      // 異常値を除外（距離が大きすぎる、または時間差が0）
      if (distance > MAX_SINGLE_DISTANCE_KM || timeDiff === 0) {
        continue;
      }
      
      // 速度を計算（km/h）
      const speedKmh = (distance / timeDiff) * 3600;
      
      // 移動とみなす条件：速度が閾値以上、かつ最小距離以上
      if (speedKmh >= SPEED_THRESHOLD_KMH && distance * 1000 >= MIN_DISTANCE_M) {
        totalDistance += distance;
        movingTimeSeconds += timeDiff;
      }
    }

    // 走行時間の計算（最大10時間に制限）
    const totalTimeHours = movingTimeSeconds / 3600;
    const cappedTimeHours = Math.min(totalTimeHours, 10);

    dailySummaries.push({
      date,
      dailyDistanceKm: Math.round(totalDistance * 100) / 100, // 小数点2桁に丸める
      dailyTravelTimeHours: Math.round(cappedTimeHours * 100) / 100,
    });
  });

  // 日付でソート（新しい順）
  return dailySummaries.sort((a, b) => b.date.localeCompare(a.date));
}



const getApiKey = async () => {
  try {
    const clientId = process.env.MSPF_CLIENT_ID;
    const clientSecret = process.env.MSPF_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "MSPF_CLIENT_ID and MSPF_CLIENT_SECRET must be set in environment variables" }, { status: 500 });
    }

    const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://api.cloud-gms.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error fetching token:", response.status, errorText);
      return NextResponse.json({ error: "Failed to fetch token", details: errorText }, { status: response.status });
    }

    const tokenData = await response.json();
    return tokenData['access_token'];
  } catch (e) {
    console.error("Error in POST /api/fetch-rwa:", e);
    return e
  }
}

// --- Next.js App Router API ルートのハンドラ関数 ---
export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get('deviceId');
  const forceRefresh = request.nextUrl.searchParams.get('forceRefresh') === 'true';
  const accessToken = await getApiKey();

  if (!deviceId || deviceId.length < 3) {
      return NextResponse.json(
      { error: 'device id missing.' },
      { status: 400 }
    );     
  }

  try {
    console.log(`GET /api/fetch-gms - deviceId: ${deviceId}, forceRefresh: ${forceRefresh}`);

    if (!accessToken) {
      console.error('Environment variables CLOUD_GMS_ACCESS_TOKEN or CLOUD_GMS_DEVICE_ID are not set.');
      return NextResponse.json(
        { error: 'Server configuration error: API credentials missing.' },
        { status: 500 }
      );
    }

    // キャッシュからデータを取得
    const cachedData = await GmsCache.getCachedData(
      deviceId,
      new Date('2024-09-01'),
      new Date()
    );
    
    console.log(`Found ${cachedData.length} cached entries`);
    
    // 新しいデータのみAPIから取得（forceRefreshがtrueの場合はキャッシュを使用しない）
    const allLocationData = await fetchAllLocationData(deviceId, accessToken, !forceRefresh);

    let allDailySummaries: DailySummary[] = [];
    
    // キャッシュデータを日次サマリー形式に変換
    const cachedSummaries: DailySummary[] = cachedData.map(cache => ({
      date: cache.date,
      dailyDistanceKm: Number(cache.daily_distance_km),
      dailyTravelTimeHours: Number(cache.daily_travel_time_hours)
    }));
    
    if (allLocationData.length > 0) {
      // 新しいデータから日次サマリーを計算
      const newDailySummaries = calculateDailyTravelSummary(allLocationData);
      console.log(`Processed ${newDailySummaries.length} days of new data`);
      
      // キャッシュに保存
      if (newDailySummaries.length > 0) {
        const cacheEntries: GmsDailyCacheEntry[] = newDailySummaries.map(summary => ({
          device_id: deviceId,
          date: summary.date,
          daily_distance_km: summary.dailyDistanceKm,
          daily_travel_time_hours: summary.dailyTravelTimeHours
        }));
        
        await GmsCache.saveData(cacheEntries);
      }
      
      // キャッシュデータと新しいデータを結合
      allDailySummaries = [...cachedSummaries, ...newDailySummaries];
    } else {
      // 新しいデータがない場合はキャッシュのみ使用
      allDailySummaries = cachedSummaries;
    }
    
    // 日付でソート（新しい順）し、重複を除去
    const summaryMap = new Map<string, DailySummary>();
    allDailySummaries.forEach(summary => {
      summaryMap.set(summary.date, summary);
    });
    const uniqueSummaries = Array.from(summaryMap.values())
      .sort((a, b) => b.date.localeCompare(a.date));
    
    console.log(`Total unique days: ${uniqueSummaries.length}`);
    
    // 過去1週間分のデータのみを表示用に返すが、総計は全期間から計算
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const filteredSummaries = uniqueSummaries.filter(summary => {
      const summaryDate = new Date(summary.date);
      return summaryDate >= oneWeekAgo;
    });
    
    // 総走行距離と総走行時間を計算
    const totalMileage = uniqueSummaries.reduce((sum, day) => sum + day.dailyDistanceKm, 0);
    const totalTime = uniqueSummaries.reduce((sum, day) => sum + day.dailyTravelTimeHours, 0);
    
    if (uniqueSummaries.length > 0) {
      return NextResponse.json({
        dailySummaries: filteredSummaries,
        totalMileage: Math.round(totalMileage * 100) / 100,
        totalTime: Math.round(totalTime * 100) / 100,
        cacheStatus: 'enabled' // キャッシュが使用されていることを示す
      }, { status: 200 });
    } else {
      return NextResponse.json({
        dailySummaries: [],
        totalMileage: 0,
        totalTime: 0,
        cacheStatus: 'no-data'
      }, { status: 200 }); // データがない場合は空の配列を返す
    }
  } catch (error) {
    console.error('Error processing route data:', error);
    
    // データベース接続エラーの場合は、キャッシュなしで再試行
    if (error instanceof Error && error.message.includes('database')) {
      console.warn('Database error detected, retrying without cache...');
      try {
        const allLocationData = await fetchAllLocationData(deviceId, accessToken, false);
        
        if (allLocationData.length > 0) {
          const dailySummaries = calculateDailyTravelSummary(allLocationData);
          
          // 過去1週間分のデータのみを表示用に返す
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const filteredSummaries = dailySummaries.filter(summary => {
            const summaryDate = new Date(summary.date);
            return summaryDate >= oneWeekAgo;
          });
          
          // 総走行距離と総走行時間を計算
          const totalMileage = dailySummaries.reduce((sum, day) => sum + day.dailyDistanceKm, 0);
          const totalTime = dailySummaries.reduce((sum, day) => sum + day.dailyTravelTimeHours, 0);
          
          return NextResponse.json({
            dailySummaries: filteredSummaries,
            totalMileage: Math.round(totalMileage * 100) / 100,
            totalTime: Math.round(totalTime * 100) / 100,
            cacheStatus: 'disabled' // キャッシュが使用されていないことを示す
          }, { status: 200 });
        } else {
          return NextResponse.json({
            dailySummaries: [],
            totalMileage: 0,
            totalTime: 0,
            cacheStatus: 'disabled'
          }, { status: 200 });
        }
      } catch (retryError) {
        console.error('Retry without cache also failed:', retryError);
        return NextResponse.json(
          { error: retryError instanceof Error ? retryError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
