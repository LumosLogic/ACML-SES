import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: number | string
  rate?: number
  rateLabel?: string
  icon: LucideIcon
  iconColor?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
  trend?: "up" | "down" | "neutral"
  loading?: boolean
}

export function StatCard({
  title,
  value,
  rate,
  rateLabel,
  icon: Icon,
  iconColor = "text-slate-500",
  badgeVariant = "secondary",
  loading = false,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-20 rounded bg-[var(--muted)] animate-pulse" />
            <div className="h-4 w-16 rounded bg-[var(--muted)] animate-pulse" />
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold tracking-tight">{value}</div>
            {rate !== undefined && (
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant={badgeVariant} className="text-xs">
                  {rate.toFixed(1)}%
                </Badge>
                {rateLabel && (
                  <span className="text-xs text-[var(--muted-foreground)]">{rateLabel}</span>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
