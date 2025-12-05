export interface DailyGMSData {
  date: string;
  dailyDistanceKm: number;
  dailyTravelTimeHours: number;
}

export type GMSData = DailyGMSData[];

export interface RWADetail {
  deviceId: string;
  vehicleModel: string;
  name: string;
  sex: string;
  living: string;
  releaseDate: string;
  payments: number;
  paymentsMade: number;
  assetType: string;
  totalMileage: number;
  totalDrivingTime: number;
  histories: {
    eventTime: number;
    eventDescription: string;
  }[];
  stats: {
    mileage: number;
    drivingtime: number;
    datetime: string;
  }[];
}