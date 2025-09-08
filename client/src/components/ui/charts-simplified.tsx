import React from 'react';
import { BarChart as RechartsBarChart, LineChart as RechartsLineChart, PieChart as RechartsPieChart } from 'recharts';
import { Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface ChartProps {
  data: any[];
  className?: string;
  index?: string;
  categories?: string[];
  height?: number | string;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  valueFormatter?: (value: number) => string;
}

const COLORS = [
  'hsl(215, 90%, 50%)', // Blue
  'hsl(142, 70%, 45%)', // Green
  'hsl(345, 85%, 55%)', // Red
  'hsl(45, 95%, 55%)',  // Yellow
  'hsl(280, 75%, 55%)', // Purple
  'hsl(190, 90%, 45%)', // Cyan
  'hsl(30, 90%, 55%)',  // Orange
  'hsl(160, 70%, 45%)', // Teal
];

export const LineChart: React.FC<ChartProps> = ({
  data,
  className,
  index = 'name',
  categories = [],
  height = 300,
  showXAxis = true,
  showYAxis = true,
  showLegend = false,
  showTooltip = true,
  showGrid = true,
  valueFormatter = (value) => `${value}`
}) => {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.15} />}
          {showXAxis && <XAxis dataKey={index} />}
          {showYAxis && <YAxis />}
          {showTooltip && <Tooltip formatter={valueFormatter} />}
          {showLegend && <Legend />}
          
          {categories.map((category, i) => (
            <Line 
              key={category}
              type="monotone" 
              dataKey={category} 
              stroke={COLORS[i % COLORS.length]} 
              activeDot={{ r: 6 }} 
              strokeWidth={2}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const BarChart: React.FC<ChartProps> = ({
  data,
  className,
  index = 'name',
  categories = [],
  height = 300,
  showXAxis = true,
  showYAxis = true,
  showLegend = false,
  showTooltip = true,
  showGrid = true,
  valueFormatter = (value) => `${value}`
}) => {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.15} />}
          {showXAxis && <XAxis dataKey={index} />}
          {showYAxis && <YAxis />}
          {showTooltip && <Tooltip formatter={valueFormatter} />}
          {showLegend && <Legend />}
          
          {categories.map((category, i) => (
            <Bar 
              key={category}
              dataKey={category} 
              fill={COLORS[i % COLORS.length]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface PieChartProps extends Omit<ChartProps, 'index' | 'categories'> {
  nameKey?: string;
  valueKey?: string;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  className,
  nameKey = 'name',
  valueKey = 'value',
  height = 300,
  showLegend = true,
  showTooltip = true,
  valueFormatter = (value) => `${value}`
}) => {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          {showTooltip && <Tooltip formatter={valueFormatter} />}
          {showLegend && <Legend />}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey={valueKey}
            nameKey={nameKey}
            label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};