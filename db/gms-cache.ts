import { sql } from '@vercel/postgres';

export interface GmsDailyCacheEntry {
  id?: number;
  device_id: string;
  date: string; // YYYY-MM-DD
  daily_distance_km: number;
  daily_travel_time_hours: number;
  created_at?: Date;
  updated_at?: Date;
}

export class GmsCache {
  /**
   * 指定されたデバイスIDと日付範囲のキャッシュデータを取得
   */
  static async getCachedData(
    deviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<GmsDailyCacheEntry[]> {
    try {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const result = await sql<GmsDailyCacheEntry>`
        SELECT device_id, date::text, daily_distance_km, daily_travel_time_hours
        FROM gms_daily_cache
        WHERE device_id = ${deviceId}
          AND date >= ${startDateStr}
          AND date <= ${endDateStr}
        ORDER BY date DESC
      `;
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching cached GMS data:', error);
      return [];
    }
  }

  /**
   * 特定の日付のキャッシュデータが存在するかチェック
   */
  static async hasDataForDate(
    deviceId: string,
    date: string
  ): Promise<boolean> {
    try {
      const result = await sql`
        SELECT COUNT(*) as count
        FROM gms_daily_cache
        WHERE device_id = ${deviceId}
          AND date = ${date}
      `;
      
      return result.rows[0]?.count > 0;
    } catch (error) {
      console.error('Error checking cache existence:', error);
      return false;
    }
  }

  /**
   * キャッシュデータを保存（既存の場合は更新）
   */
  static async saveData(entries: GmsDailyCacheEntry[]): Promise<void> {
    if (entries.length === 0) return;

    try {
      // バッチ挿入用のクエリを構築
      for (const entry of entries) {
        await sql`
          INSERT INTO gms_daily_cache (device_id, date, daily_distance_km, daily_travel_time_hours)
          VALUES (${entry.device_id}, ${entry.date}, ${entry.daily_distance_km}, ${entry.daily_travel_time_hours})
          ON CONFLICT (device_id, date) 
          DO UPDATE SET 
            daily_distance_km = EXCLUDED.daily_distance_km,
            daily_travel_time_hours = EXCLUDED.daily_travel_time_hours,
            updated_at = CURRENT_TIMESTAMP
        `;
      }
      
      console.log(`Saved ${entries.length} entries to cache`);
    } catch (error) {
      console.error('Error saving to GMS cache:', error);
      throw error;
    }
  }

  /**
   * 最新のキャッシュ日付を取得
   */
  static async getLatestCachedDate(deviceId: string): Promise<Date | null> {
    try {
      const result = await sql`
        SELECT MAX(date) as latest_date
        FROM gms_daily_cache
        WHERE device_id = ${deviceId}
      `;
      
      const latestDate = result.rows[0]?.latest_date;
      return latestDate ? new Date(latestDate) : null;
    } catch (error) {
      console.error('Error getting latest cached date:', error);
      return null;
    }
  }

  /**
   * 古いキャッシュデータを削除（オプション）
   */
  static async cleanOldCache(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
      
      const result = await sql`
        DELETE FROM gms_daily_cache
        WHERE date < ${cutoffDateStr}
      `;
      
      console.log(`Deleted ${result.rowCount} old cache entries`);
    } catch (error) {
      console.error('Error cleaning old cache:', error);
    }
  }
}