import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Line, Bar } from "recharts";
import { LineChart, BarChart } from "@/components/ui/charts-simplified";
import { useTheme } from "./ThemeProvider";

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

export function ResponseTrendsChart({
  data = [],
  isLoading = false,
  timeRange = "7",
  onTimeRangeChange,
}: ResponseTrendsChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Format date labels
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Response Trends</CardTitle>
        <Select
          value={timeRange}
          onValueChange={onTimeRangeChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="Select a range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="365">All time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <div className="h-[300px] w-full">
            <LineChart
              data={data}
              index="date"
              categories={["count"]}
              yAxisWidth={30}
              showLegend={false}
              showAnimation
              showXGrid={false}
              showYGrid
              colors={["hsl(var(--chart-1))"]}
              valueFormatter={(value) => `${value}`}
              customTooltip={({ payload }) => {
                if (!payload?.length) return null;
                const data = payload[0].payload as TrendData;
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Date
                        </span>
                        <span className="font-bold text-foreground">
                          {formatDate(data.date)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Assessments
                        </span>
                        <span className="font-bold text-foreground">
                          {data.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            >
              <Line
                dataKey="count"
                strokeWidth={2}
                dot={{
                  strokeWidth: 2,
                  r: 4,
                  stroke: isDark ? "hsl(var(--chart-1))" : "hsl(var(--chart-1))",
                  fill: isDark ? "hsl(var(--background))" : "hsl(var(--background))",
                }}
                activeDot={{
                  r: 6,
                  stroke: isDark ? "hsl(var(--chart-1))" : "hsl(var(--chart-1))",
                  fill: isDark ? "hsl(var(--background))" : "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CommonConditionsChart({
  data = [],
  isLoading = false,
  limit = "5",
  onLimitChange,
}: CommonConditionsChartProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Common Reported Conditions</CardTitle>
        <Select
          value={limit}
          onValueChange={onLimitChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[100px] h-8 text-sm">
            <SelectValue placeholder="Select a limit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Top 5</SelectItem>
            <SelectItem value="10">Top 10</SelectItem>
            <SelectItem value="15">Top 15</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <div className="h-[300px] w-full">
            <BarChart
              data={data}
              index="condition"
              categories={["count"]}
              colors={["hsl(var(--chart-1))"]}
              yAxisWidth={30}
              showLegend={false}
              showAnimation
              showXGrid={false}
              showYGrid
              valueFormatter={(value) => `${value}`}
            >
              <Bar dataKey="count" />
            </BarChart>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
