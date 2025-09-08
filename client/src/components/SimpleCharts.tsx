import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, BarChart } from "@/components/ui/charts-simplified";

// Chart component props
interface TrendData {
  date: string;
  count: number;
}

interface ConditionData {
  condition: string;
  count: number;
}

interface ResponseTrendsChartProps {
  data?: TrendData[];
  isLoading?: boolean;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
}

interface CommonConditionsChartProps {
  data?: ConditionData[];
  isLoading?: boolean;
  limit?: string;
  onLimitChange?: (limit: string) => void;
}

// Foot Care Assessment Trends Chart Component
export function ResponseTrendsChart({
  data,
  isLoading,
  timeRange,
  onTimeRangeChange,
}: ResponseTrendsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <span className="mr-2">🦶</span>
            Patient Assessment Trends
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select defaultValue="7" value={timeRange} onValueChange={onTimeRangeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="14">Last 14 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <span className="mr-2">🦶</span>
          Patient Assessment Trends
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Select defaultValue="7" value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="h-[350px]">
        <LineChart
          data={data || []}
          index="date"
          categories={["count"]}
          height={300}
          showLegend={false}
          valueFormatter={(value) => `${value} assessments`}
        />
      </CardContent>
    </Card>
  );
}

// Most Common Foot Conditions Chart Component
export function CommonConditionsChart({
  data,
  isLoading,
  limit,
  onLimitChange,
}: CommonConditionsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <span className="mr-2">🩹</span>
            Most Common Foot Conditions
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select defaultValue="5" value={limit} onValueChange={onLimitChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Number of Conditions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="15">Top 15</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = data?.map(item => ({
    name: item.condition,
    count: item.count
  })) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <span className="mr-2">🩹</span>
          Most Common Foot Conditions
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Select defaultValue="5" value={limit} onValueChange={onLimitChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Number of Conditions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="15">Top 15</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="h-[350px]">
        <BarChart
          data={chartData}
          index="name"
          categories={["count"]}
          height={300}
          valueFormatter={(value) => `${value} patients`}
        />
      </CardContent>
    </Card>
  );
}