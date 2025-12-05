'use client';

import { RWAStat } from '@/components/proof/RwaDataChart';
import { DailyGMSData, GMSData } from '@/components/proof/types';
import { useState, useEffect } from 'react';

interface UseGmsDataProps {
  deviceId?: string;
}

interface GmsDataMetrics {
  totalMileage: number;
  totalDrivingTime: number;
  thisWeekHours: number;
  lastWeekHours: number;
  thisWeekMileage: number;
  lastWeekMileage: number;
}

export const useGmsData = ({ deviceId }: UseGmsDataProps) => {
  const [gmsData, setGmsData] = useState<GMSData | null>(null);
  const [metrics, setMetrics] = useState<GmsDataMetrics>({
    totalMileage: 0,
    totalDrivingTime: 0,
    thisWeekHours: 0,
    lastWeekHours: 0,
    thisWeekMileage: 0,
    lastWeekMileage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<RWAStat[]>([]);

  useEffect(() => {
    const fetchGmsData = async () => {
      if (!deviceId) {
        setGmsData(null);
        setMetrics({
          totalMileage: 0,
          totalDrivingTime: 0,
          thisWeekHours: 0,
          lastWeekHours: 0,
          thisWeekMileage: 0,
          lastWeekMileage: 0,
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/fetch-gms?deviceId=${deviceId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch GMS data');
        }
        const result = await response.json();
        
        // Handle new response format
        const data: GMSData = result.dailySummaries || result;
        const totalMileage = result.totalMileage || data.reduce((sum: number, day: DailyGMSData) => sum + day.dailyDistanceKm, 0);
        const totalDrivingTime = result.totalTime || data.reduce((sum: number, day: DailyGMSData) => sum + day.dailyTravelTimeHours, 0);
        
        setGmsData(data);

        // Calculate this week and last week metrics
        const today = new Date();
        const thisWeekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        let thisWeekHours = 0;
        let lastWeekHours = 0;
        let thisWeekMileage = 0;
        let lastWeekMileage = 0;

        data.forEach(day => {
          const dayDate = new Date(day.date);
          if (dayDate >= thisWeekStart) {
            thisWeekHours += day.dailyTravelTimeHours;
            thisWeekMileage += day.dailyDistanceKm;
          } else if (dayDate >= lastWeekStart && dayDate < thisWeekStart) {
            lastWeekHours += day.dailyTravelTimeHours;
            lastWeekMileage += day.dailyDistanceKm;
          }
        });

        setMetrics({
          totalMileage,
          totalDrivingTime,
          thisWeekHours,
          lastWeekHours,
          thisWeekMileage,
          lastWeekMileage,
        });

        // Transform data for chart
        const transformedData: RWAStat[] = data.map(day => ({
          datetime: day.date,
          mileage: day.dailyDistanceKm,
          drivingtime: day.dailyTravelTimeHours * 3600,
        }));
        setChartData(transformedData);

      } catch (err) {
        console.error("Error fetching GMS data:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setGmsData(null);
        setMetrics({
          totalMileage: 0,
          totalDrivingTime: 0,
          thisWeekHours: 0,
          lastWeekHours: 0,
          thisWeekMileage: 0,
          lastWeekMileage: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGmsData();
  }, [deviceId]);

  return {
    gmsData,
    metrics,
    chartData,
    isLoading,
    error,
  };
};
