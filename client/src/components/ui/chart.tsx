import React, { createContext, useContext, useMemo } from "react";
import * as ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
import {
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  Cell,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  Pie as RechartsPie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Area as RechartsArea,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
  Scatter as RechartsScatter,
  PieLabelRenderProps,
  Sector,
} from "recharts";

// Chart themes
export const THEMES = {
  blue: "#3b82f6",
  green: "#10b981",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#8b5cf6",
  pink: "#ec4899",
  gray: "#6b7280",
};

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = createContext<ChartContextProps | null>(null);

function useChart() {
  const context = useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a Chart provider");
  }

  return context;
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const styles = useMemo(() => {
    return Object.entries(config)
      .filter(([_, value]) => value.theme)
      .map(([key, value]) => {
        if (!value.theme) return "";

        return Object.entries(value.theme)
          .map(
            ([themeKey, themeValue]) =>
              `.${id} .${key}.theme-${themeKey} { fill: ${themeValue}; stroke: ${themeValue} }`,
          )
          .join("\n");
      })
      .join("\n");
  }, [id, config]);

  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      const style = document.createElement("style");
      style.setAttribute("data-chart-style", id);
      style.innerHTML = styles;
      ref.current.appendChild(style);

      return () => {
        style.remove();
      };
    }
  }, [id, styles]);

  return <div ref={ref} style={{ display: "none" }} />;
};

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: Record<string, string | number>[],
) {
  return payload.map((data: Record<string, any>) => {
    const key = data?.dataKey;
    return {
      key,
      ...config[key],
    };
  });
}

type BaseChartProps = {
  config?: ChartConfig;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "pie";
  index?: string;
  categories?: string[];
  colors?: string[];
  showXAxis?: boolean;
  showYAxis?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGridLines?: boolean;
  showXGridLines?: boolean;
  showYGridLines?: boolean;
  showXGrid?: boolean;
  showYGrid?: boolean;
  yAxisWidth?: number;
  xAxisHeight?: number;
  valueFormatter?: (value: number) => string;
  animationDuration?: number;
  showAnimation?: boolean;
  customTooltip?: React.ComponentType<any>;
  startEndOnly?: boolean;
  rotateTicks?: boolean;
  chartClassName?: string;
};

// LineChart component
export const LineChart = React.forwardRef<
  HTMLDivElement,
  BaseChartProps & {
    data: any[];
  }
>(
  (
    {
      config,
      data = [],
      index,
      categories,
      colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
      showXAxis = true,
      showYAxis = true,
      showLegend = true,
      showTooltip = true,
      showGridLines = false,
      showXGrid = false,
      showYGrid = true,
      yAxisWidth = 40,
      xAxisHeight = 40,
      valueFormatter,
      animationDuration = 900,
      showAnimation = false,
      customTooltip,
      startEndOnly = false,
      rotateTicks = false,
      chartClassName,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const id = React.useId();

    const configuration = useMemo(() => {
      return (
        config ??
        Object.fromEntries(
          (categories ?? []).map((category, index) => [
            category,
            { color: colors?.[index % colors.length] },
          ]),
        )
      );
    }, [categories, colors, config]);

    const xAxisKey = index ?? "";

    const CustomizedTooltip = ({
      active,
      payload,
      label,
    }: TooltipProps<any, any>) => {
      if (customTooltip && active && payload?.length) {
        const Component = customTooltip;
        return <Component active={active} payload={payload} label={label} />;
      }

      if (active && payload?.length) {
        return (
          <div className="rounded-lg border bg-background p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  {index}
                </span>
                <span className="font-bold text-foreground">{label}</span>
              </div>
              {payload.map(
                (
                  {
                    color,
                    dataKey,
                    name,
                    value,
                  }: {
                    color: string;
                    dataKey: string;
                    name: string;
                    value: number;
                  },
                  i: number,
                ) => {
                  return (
                    <div className="flex flex-col" key={`item-${i}`}>
                      <span className="flex items-center gap-1 text-[0.70rem] uppercase text-muted-foreground">
                        <div
                          className="size-2 rounded-full"
                          style={{ background: color }}
                        />
                        {configuration[dataKey]?.label ?? name ?? dataKey}
                      </span>
                      <span className="font-bold text-foreground">
                        {valueFormatter?.(value) ?? value}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        );
      }

      return null;
    };

    const ticks = startEndOnly
      ? [0, data.length - 1]
      : undefined;

    return (
      <div ref={ref} className={cn("", className)} {...props}>
        <ChartContext.Provider value={{ config: configuration }}>
          <ChartStyle id={id} config={configuration} />
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart
              data={data}
              className={cn(id, chartClassName)}
              margin={{
                top: 5,
                right: 5,
                left: 5,
                bottom: 5,
              }}
            >
              {showXGrid && (
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              )}
              {showYGrid && (
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
              )}
              {showGridLines && <CartesianGrid strokeDasharray="3 3" />}
              {showXAxis && (
                <XAxis
                  dataKey={xAxisKey}
                  axisLine={false}
                  tickLine={false}
                  hide={!showXAxis}
                  ticks={ticks}
                  tick={{
                    transform: `translate(0, ${rotateTicks ? 15 : 0})`,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                  angle={rotateTicks ? -45 : 0}
                  textAnchor={rotateTicks ? "end" : "middle"}
                  height={xAxisHeight}
                />
              )}
              {showYAxis && (
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  hide={!showYAxis}
                  width={yAxisWidth}
                  fontSize={12}
                  fontWeight={500}
                  tickFormatter={valueFormatter}
                />
              )}
              {showTooltip && (
                <Tooltip
                  content={<CustomizedTooltip />}
                  cursor={{ stroke: "var(--border)" }}
                  wrapperStyle={{ outline: "none" }}
                />
              )}
              {showLegend && (
                <Legend
                  verticalAlign="top"
                  height={36}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const items = getPayloadConfigFromPayload(
                        configuration,
                        payload as Record<string, string | number>[],
                      );

                      return (
                        <div className="flex items-center justify-end gap-4">
                          {items.map((item: any, index: number) => {
                            return (
                              <div
                                key={`item-${index}`}
                                className="flex items-center gap-1"
                              >
                                <div
                                  className="size-2 rounded-full"
                                  style={{
                                    background:
                                      item.color ?? colors?.[index % colors.length],
                                  }}
                                />
                                <span className="text-xs font-medium">
                                  {item.label ?? item.key}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return null;
                  }}
                />
              )}
              {children}
            </RechartsLineChart>
          </ResponsiveContainer>
        </ChartContext.Provider>
      </div>
    );
  },
);

LineChart.displayName = "LineChart";

// Bar Chart Component
export const BarChart = React.forwardRef<
  HTMLDivElement,
  BaseChartProps & {
    data: any[];
  }
>(
  (
    {
      config,
      data = [],
      index,
      categories,
      colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
      showXAxis = true,
      showYAxis = true,
      showLegend = true,
      showTooltip = true,
      showGridLines = false,
      showXGrid = false,
      showYGrid = true,
      yAxisWidth = 40,
      xAxisHeight = 40,
      valueFormatter,
      animationDuration = 900,
      showAnimation = false,
      customTooltip,
      startEndOnly = false,
      rotateTicks = false,
      chartClassName,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const id = React.useId();

    const configuration = useMemo(() => {
      return (
        config ??
        Object.fromEntries(
          (categories ?? []).map((category, index) => [
            category,
            { color: colors?.[index % colors.length] },
          ]),
        )
      );
    }, [categories, colors, config]);

    const xAxisKey = index ?? "";

    const CustomizedTooltip = ({
      active,
      payload,
      label,
    }: TooltipProps<any, any>) => {
      if (customTooltip && active && payload?.length) {
        const Component = customTooltip;
        return <Component active={active} payload={payload} label={label} />;
      }

      if (active && payload?.length) {
        return (
          <div className="rounded-lg border bg-background p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  {index}
                </span>
                <span className="font-bold text-foreground">{label}</span>
              </div>
              {payload.map(
                (
                  {
                    color,
                    dataKey,
                    name,
                    value,
                  }: {
                    color: string;
                    dataKey: string;
                    name: string;
                    value: number;
                  },
                  i: number,
                ) => {
                  return (
                    <div className="flex flex-col" key={`item-${i}`}>
                      <span className="flex items-center gap-1 text-[0.70rem] uppercase text-muted-foreground">
                        <div
                          className="size-2 rounded-full"
                          style={{ background: color }}
                        />
                        {configuration[dataKey]?.label ?? name ?? dataKey}
                      </span>
                      <span className="font-bold text-foreground">
                        {valueFormatter?.(value) ?? value}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        );
      }

      return null;
    };

    const ticks = startEndOnly
      ? [0, data.length - 1]
      : undefined;

    return (
      <div ref={ref} className={cn("", className)} {...props}>
        <ChartContext.Provider value={{ config: configuration }}>
          <ChartStyle id={id} config={configuration} />
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={data}
              className={cn(id, chartClassName)}
              margin={{
                top: 5,
                right: 5,
                left: 5,
                bottom: 5,
              }}
            >
              {showXGrid && (
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              )}
              {showYGrid && (
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
              )}
              {showGridLines && <CartesianGrid strokeDasharray="3 3" />}
              {showXAxis && (
                <XAxis
                  dataKey={xAxisKey}
                  axisLine={false}
                  tickLine={false}
                  hide={!showXAxis}
                  ticks={ticks}
                  tick={{
                    transform: `translate(0, ${rotateTicks ? 15 : 0})`,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                  angle={rotateTicks ? -45 : 0}
                  textAnchor={rotateTicks ? "end" : "middle"}
                  height={xAxisHeight}
                />
              )}
              {showYAxis && (
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  hide={!showYAxis}
                  width={yAxisWidth}
                  fontSize={12}
                  fontWeight={500}
                  tickFormatter={valueFormatter}
                />
              )}
              {showTooltip && (
                <Tooltip
                  content={<CustomizedTooltip />}
                  cursor={{ fill: "var(--muted)" }}
                  wrapperStyle={{ outline: "none" }}
                />
              )}
              {showLegend && (
                <Legend
                  verticalAlign="top"
                  height={36}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const items = getPayloadConfigFromPayload(
                        configuration,
                        payload as Record<string, string | number>[],
                      );

                      return (
                        <div className="flex items-center justify-end gap-4">
                          {items.map((item: any, index: number) => {
                            return (
                              <div
                                key={`item-${index}`}
                                className="flex items-center gap-1"
                              >
                                <div
                                  className="size-2 rounded-full"
                                  style={{
                                    background:
                                      item.color ?? colors?.[index % colors.length],
                                  }}
                                />
                                <span className="text-xs font-medium">
                                  {item.label ?? item.key}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return null;
                  }}
                />
              )}
              {children}
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartContext.Provider>
      </div>
    );
  },
);

BarChart.displayName = "BarChart";

// PieChart Component
export const PieChart = React.forwardRef<
  HTMLDivElement,
  BaseChartProps & {
    data: any[];
  }
>(
  (
    {
      config,
      data = [],
      index,
      categories,
      colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
      showLegend = true,
      showTooltip = true,
      valueFormatter,
      animationDuration = 900,
      showAnimation = false,
      customTooltip,
      chartClassName,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const id = React.useId();

    const configuration = useMemo(() => {
      return (
        config ??
        Object.fromEntries(
          (data ?? []).map((item, index) => [
            item.name,
            { color: colors?.[index % colors.length] },
          ]),
        )
      );
    }, [data, colors, config]);

    const valueKey = categories?.[0] ?? "value";

    const [activeIndex, setActiveIndex] = React.useState(-1);

    const renderActiveShape = (props: any) => {
      const {
        cx,
        cy,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
        fill,
        payload,
        percent,
        value,
      } = props;
    
      return (
        <g>
          <text
            x={cx}
            y={cy - 10}
            dy={8}
            textAnchor="middle"
            fill="var(--foreground)"
            className="text-xs font-medium"
          >
            {payload.name}
          </text>
          <text
            x={cx}
            y={cy + 10}
            dy={8}
            textAnchor="middle"
            fill="var(--foreground)"
            className="text-xs font-medium"
          >
            {valueFormatter?.(value) ?? value} ({(percent * 100).toFixed(0)}%)
          </text>
          <Sector
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={startAngle}
            endAngle={endAngle}
            fill={fill}
          />
          <Sector
            cx={cx}
            cy={cy}
            startAngle={startAngle}
            endAngle={endAngle}
            innerRadius={outerRadius + 6}
            outerRadius={outerRadius + 10}
            fill={fill}
          />
        </g>
      );
    };

    const CustomizedTooltip = ({
      active,
      payload,
    }: TooltipProps<any, any>) => {
      if (customTooltip && active && payload?.length) {
        const Component = customTooltip;
        return <Component active={active} payload={payload} />;
      }

      if (active && payload?.length) {
        return (
          <div className="rounded-lg border bg-background p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  Name
                </span>
                <span className="font-bold text-foreground">
                  {payload[0].name}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  Value
                </span>
                <span className="font-bold text-foreground">
                  {valueFormatter?.(payload[0].value) ?? payload[0].value}
                </span>
              </div>
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <div ref={ref} className={cn("", className)} {...props}>
        <ChartContext.Provider value={{ config: configuration }}>
          <ChartStyle id={id} config={configuration} />
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart
              className={cn(id, chartClassName)}
              margin={{
                top: 5,
                right: 5,
                left: 5,
                bottom: 5,
              }}
            >
              {showTooltip && (
                <Tooltip
                  content={<CustomizedTooltip />}
                  wrapperStyle={{ outline: "none" }}
                />
              )}
              {showLegend && (
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      return (
                        <div className="flex items-center justify-center flex-wrap gap-4">
                          {payload.map((entry: any, index: number) => {
                            return (
                              <div
                                key={`item-${index}`}
                                className="flex items-center gap-1"
                              >
                                <div
                                  className="size-2 rounded-full"
                                  style={{
                                    background: entry.color,
                                  }}
                                />
                                <span className="text-xs font-medium">
                                  {entry.value}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return null;
                  }}
                />
              )}
              <RechartsPie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
                data={data}
                nameKey={index ?? "name"}
                dataKey={valueKey}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                animationDuration={showAnimation ? animationDuration : 0}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[index % colors.length]} 
                  />
                ))}
              </RechartsPie>
              {children}
            </RechartsPieChart>
          </ResponsiveContainer>
        </ChartContext.Provider>
      </div>
    );
  },
);

PieChart.displayName = "PieChart";

// Custom components for use with charts
export const Bar = RechartsBar;
export const Line = RechartsLine;