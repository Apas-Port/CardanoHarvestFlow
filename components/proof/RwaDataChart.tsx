import React from "react";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { useTranslation } from '@/i18n/client';

export interface RWAStat {
  mileage: number,
  drivingtime: number,
  datetime: string,
}

ChartJS.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
);

const RwaDataChart: React.FC<{ dailyStats: RWAStat[] }> = ({
  dailyStats,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useTranslation('en');

  const data: ChartData<"bar" | "line"> = convertData(dailyStats);
  const options: ChartOptions<"bar" | "line"> = {
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      "y-hours": {
        type: "linear",
        position: "right",
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return value + " h";
          },
        },
      },
      "y-mileage": {
        type: "linear",
        position: "left",
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return value + " km";
          },
        },
      },
      x: {
        ticks: {
          maxRotation: 90,
          minRotation: 90,
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
    },
  };

  return (
    <div className="w-full h-full">
      <Chart type="bar" data={data} options={options} />
    </div>
  );
};

const convertData = (
  dataset: RWAStat[],
): ChartData<"bar" | "line"> => {
  // Get all dates from the dataset
  const dates = dataset
    .map((item) => new Date(item.datetime).getTime())
    .slice(-14);

  // Create a set of all dates in the range
  const startDate = new Date(Math.min(...dates));
  const endDate = new Date(Math.max(...dates));
  const allDates: string[] = [];

  for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
    allDates.push(d.toISOString().split("T")[0]);
  }

  // Map the dataset by date
  const dataMap = new Map(dataset.map((item) => [item.datetime, item]));

  // Create the output data structure
  const labels = allDates.map((date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  );

  const mileageData = allDates.map(
    (date) => dataMap.get(date)?.mileage || 0,
  );
  const drivingtimeData = allDates.map(
    (date) => {
      const item = dataMap.get(date);
      return item ? item.drivingtime / 3600 : 0;
    },
  );

  return {
    labels,
    datasets: [
      {
        type: "line" as const,
        label: "MILEAGES",
        data: mileageData,
        borderColor: "rgba(230, 185, 95, 1)",
        backgroundColor: "rgba(230, 185, 95, 1)",
        borderWidth: 3,
        fill: false,
        yAxisID: "y-mileage",
        pointRadius: 0,
        pointHitRadius: 10,
      },
      {
        type: "bar" as const,
        label: "HOURS",
        data: drivingtimeData,
        backgroundColor: "rgba(53, 90, 180, 1)",
        yAxisID: "y-hours",
      },
    ],
  };
};

export default RwaDataChart;