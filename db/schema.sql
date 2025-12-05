-- テーブル作成スクリプト
-- Vercel Postgresで実行する

-- GMSデータキャッシュテーブル
CREATE TABLE IF NOT EXISTS gms_daily_cache (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  daily_distance_km DECIMAL(10, 2) NOT NULL,
  daily_travel_time_hours DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- デバイスIDと日付の組み合わせで一意
  UNIQUE(device_id, date)
);

-- インデックスの作成（クエリパフォーマンスの向上）
CREATE INDEX idx_gms_daily_cache_device_date ON gms_daily_cache(device_id, date DESC);
CREATE INDEX idx_gms_daily_cache_created_at ON gms_daily_cache(created_at);

-- 更新時刻を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gms_daily_cache_updated_at BEFORE UPDATE
  ON gms_daily_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();