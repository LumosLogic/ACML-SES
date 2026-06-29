"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { MetricsTimeseries } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface ChartDataPoint {
  date: string
  Sent: number
  Delivered: number
  Opened: number
  Clicked: number
  Bounced: number
}

function buildChartData(timeseries: MetricsTimeseries): ChartDataPoint[] {
  // Collect all unique timestamps
  const allTimestamps = new Set<string>()
  const metrics = timeseries.metrics

  ;(["send", "delivery", "open", "click", "bounce"] as const).forEach((key) => {
    metrics[key]?.timestamps?.forEach((ts) => allTimestamps.add(ts))
  })

  const sorted = Array.from(allTimestamps).sort()

  return sorted.map((ts) => {
    const label = new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })

    const getValue = (key: "send" | "delivery" | "open" | "click" | "bounce") => {
      const idx = metrics[key]?.timestamps?.indexOf(ts) ?? -1
      return idx >= 0 ? (metrics[key]?.values?.[idx] ?? 0) : 0
    }

    return {
      date: label,
      Sent: getValue("send"),
      Delivered: getValue("delivery"),
      Opened: getValue("open"),
      Clicked: getValue("click"),
      Bounced: getValue("bounce"),
    }
  })
}

interface MetricsChartProps {
  timeseries: MetricsTimeseries | null
  loading?: boolean
}

const COLORS = {
  Sent: "#6366f1",
  Delivered: "#10b981",
  Opened: "#f59e0b",
  Clicked: "#3b82f6",
  Bounced: "#ef4444",
}

export function MetricsChart({ timeseries, loading }: MetricsChartProps) {
  const data = timeseries ? buildChartData(timeseries) : []

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Email Activity Over Time</CardTitle>
        <CardDescription>
          Send, delivery, open, click, and bounce trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-72 w-full rounded-lg bg-[var(--muted)] animate-pulse" />
        ) : data.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-[var(--muted-foreground)] text-sm">
            No timeseries data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--card-foreground)",
                }}
                itemStyle={{ color: "var(--card-foreground)" }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
              />
              {(Object.keys(COLORS) as (keyof typeof COLORS)[]).map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[key]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: COLORS[key] }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
