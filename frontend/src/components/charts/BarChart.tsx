import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

export interface BarChartDataItem {
  [key: string]: unknown;
}

export interface BarChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    fill: string;
    name?: string;
  }>;
  label?: string;
}

interface BarChartProps {
  data: Record<string, unknown>[]
  xAxisKey: string
  bars: {
    key: string
    name: string
    color: string
    tooltip?: (value: number) => string
  }[]
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  showTooltip?: boolean
  className?: string
  barGap?: number
  barSize?: number
  xAxisProps?: {
    angle?: number
    textAnchor?: "start" | "middle" | "end"
    dominantBaseline?: "auto" | "middle" | "hanging"
    fontSize?: number
    interval?: number
    dy?: number
    dx?: number
  }
}

// CustomTooltip component defined outside of the main component
const CustomTooltip = ({ active, payload, label }: BarChartTooltipProps) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-popover p-3 border rounded-lg shadow-lg">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry, index) => {
        const tooltipText = `${entry.name}: ${entry.value}`;

        return (
          <div 
            key={`tooltip-${index}`}
            className="flex items-center gap-2 text-sm"
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.fill }}
            />
            <span>{tooltipText}</span>
          </div>
        );
      })}
    </div>
  );
};

export function BarChart({ 
  data, 
  xAxisKey, 
  bars, 
  height = 300,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  className = "",
  barGap = 4,
  barSize = 32
}: BarChartProps) {
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; fill: string }>; label?: string }) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    return (
      <div className="bg-popover p-3 border rounded-lg shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: { dataKey: string; value: number; fill: string }, index: number) => {
          const bar = bars.find(b => b.key === entry.dataKey);
          const tooltipText = bar?.tooltip 
            ? bar.tooltip(entry.value)
            : `${bar?.name}: ${entry.value}`;

          return (
            <div 
              key={`tooltip-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.fill }}
              />
              <span>{tooltipText}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barGap={barGap}
          barSize={barSize}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="stroke-muted" 
              vertical={false}
            />
          )}
          <XAxis 
            dataKey={xAxisKey} 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ strokeWidth: 0 }}
          />
          <YAxis 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ strokeWidth: 0 }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          {showTooltip && (
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
            />
          )}
          {showLegend && (
            <Legend 
              wrapperStyle={{ 
                paddingTop: 20,
                fontSize: 12
              }}
            />
          )}
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              fill={bar.color}
              name={bar.name}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}